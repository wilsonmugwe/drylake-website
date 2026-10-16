/*
 * POST /api/assistant, as a function with injected dependencies so every guard is unit-tested
 * without a network (tests/assistant-*.test.mjs). app/api/assistant/route.ts wires the real ones.
 *
 * Order matters and is cheapest-first: flag, size, JSON, action; then for "message": session,
 * per-IP limit, turn cap, daily cap, input rules, sensitive-data screen, circuit breaker, model,
 * output validation. A visitor's words are never logged and never stored.
 */
import { createRateLimiter } from "../security/rate-limit.ts";
import { readJsonBody } from "../security/read-json.ts";
import {
  DEFAULT_MAX_TURNS,
  MAX_INPUT_CHARS,
  MAX_OUTPUT_TOKENS,
  MAX_REQUEST_BYTES,
  SESSION_TTL_MS,
  type AssistantReplyPayload,
} from "./constants.ts";
import { SAFE_FALLBACK, SENSITIVE_REPLY, UNAVAILABLE_REPLY, checkVisitorText, looksSensitive, sanitiseHistory } from "./guards.ts";
import { answerGuided } from "./guided.ts";
import { getKnowledgePack } from "./knowledge.ts";
import { isAssistantEnabled, isGuided } from "./mode.ts";
import { REPLY_TOOL, SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import type { LlmGatewayProvider } from "./provider.ts";
import { retrieve } from "./retrieve.ts";
import { validateReply } from "./schema.ts";
import { createBreaker, createDailyCap, createSession, createTurnCounter, verifySession } from "./session.ts";

type Env = Record<string, string | undefined>;

export { isAssistantEnabled };

const intFrom = (value: string | undefined, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function createAssistantState(env: Env) {
  return {
    startLimiter: createRateLimiter(intFrom(env.ASSISTANT_START_LIMIT_10MIN, 6), 10 * 60_000),
    messageLimiter: createRateLimiter(intFrom(env.ASSISTANT_IP_LIMIT_10MIN, 30), 10 * 60_000),
    turns: createTurnCounter(intFrom(env.ASSISTANT_MAX_TURNS, DEFAULT_MAX_TURNS)),
    daily: createDailyCap(intFrom(env.ASSISTANT_DAILY_REQUEST_CAP, 500)),
    breaker: createBreaker(),
  };
}

export type AssistantState = ReturnType<typeof createAssistantState>;
export type HumanCheck = "ok" | "rejected" | "unavailable";

export type AssistantDeps = {
  env: Env;
  state: AssistantState;
  getProvider: () => Promise<LlmGatewayProvider>;
  verifyHuman: (token: string, ip: string | null) => Promise<HumanCheck>;
  ip: (request: Request) => string | null;
  now?: () => number;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const err = (message: string, status: number) => json({ error: message }, status);

function toPayload(reply: { answer: string; basis: AssistantReplyPayload["basis"]; sources: string[]; intent: AssistantReplyPayload["intent"] }): AssistantReplyPayload {
  const pack = getKnowledgePack();
  return {
    ...reply,
    sources: reply.sources.flatMap((id) => {
      const chunk = pack.chunks.find((c) => c.id === id);
      return chunk ? [{ id, title: chunk.title, url: chunk.url }] : [];
    }),
  };
}

export async function handleAssistant(request: Request, deps: AssistantDeps): Promise<Response> {
  const { env, state } = deps;
  const now = deps.now?.() ?? Date.now();

  if (!isAssistantEnabled(env)) return err("Not found.", 404);

  const secret = env.ASSISTANT_SESSION_SECRET ?? "";
  if (secret.length < 32) {
    console.error("Assistant: ASSISTANT_SESSION_SECRET is missing or shorter than 32 characters.");
    return json({ reply: UNAVAILABLE_REPLY, unavailable: true }, 503);
  }

  const read = await readJsonBody(request, MAX_REQUEST_BYTES);
  if (!read.ok) return err(read.message, read.status);
  if (!read.body || typeof read.body !== "object" || Array.isArray(read.body)) return err("Invalid request.", 400);

  const body = read.body as Record<string, unknown>;
  const ip = deps.ip(request) ?? "unknown";

  if (body.action === "start") {
    if (!state.startLimiter.take(ip)) return err("Too many attempts in a short time. Please wait a few minutes.", 429);
    const verdict = await deps.verifyHuman(typeof body.turnstileToken === "string" ? body.turnstileToken : "", ip === "unknown" ? null : ip);
    if (verdict === "unavailable") return json({ reply: UNAVAILABLE_REPLY, unavailable: true }, 503);
    if (verdict !== "ok") return err("Security verification failed. Please try the check again.", 403);

    const session = createSession(secret, SESSION_TTL_MS, now);
    return json({ sessionToken: session.token, expiresInSeconds: SESSION_TTL_MS / 1000, turnsLeft: state.turns.remaining(session.sid) });
  }

  if (body.action !== "message") return err("Invalid request.", 400);

  const session = verifySession(secret, body.sessionToken, now);
  if (!session.ok) return err("Your chat session has ended. Please start again.", 401);
  if (!state.messageLimiter.take(ip)) return err("Too many messages in a short time. Please wait a few minutes.", 429);

  const input = checkVisitorText(body.text);
  if (!input.ok) return err(input.message, 400);
  if (!state.turns.take(session.sid)) return err("This chat has reached its message limit. Please send us a message instead.", 429);
  if (!state.daily.take(now)) return json({ reply: UNAVAILABLE_REPLY, unavailable: true, turnsLeft: 0 });

  const turnsLeft = state.turns.remaining(session.sid);
  if (looksSensitive(input.text)) return json({ reply: SENSITIVE_REPLY, turnsLeft });

  const pack = getKnowledgePack();

  // Guided mode: no AI. Retrieval returns approved text verbatim; no provider is built and nothing
  // leaves the server. The visitor's words are matched in memory and never logged.
  if (isGuided(env)) {
    const guided = answerGuided(input.text, pack.chunks);
    console.info("assistant", JSON.stringify({ outcome: `guided-${guided.outcome}`, pack: pack.version, provider: "guided", turnsLeft }));
    return json({ reply: guided.reply, turnsLeft });
  }

  if (!state.breaker.allow(now)) return json({ reply: UNAVAILABLE_REPLY, unavailable: true, turnsLeft });

  const history = sanitiseHistory(body.history);
  const chunks = retrieve([input.text, history.at(-1)?.text ?? ""].join(" "), pack.chunks);

  const provider = await deps.getProvider();
  const result = await provider.generate({
    system: SYSTEM_PROMPT,
    user: buildUserMessage(input.text.slice(0, MAX_INPUT_CHARS), chunks, history),
    maxTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2,
    tool: REPLY_TOOL as never,
  });

  let outcome = "ok";
  let reply: AssistantReplyPayload;

  if (!result.ok) {
    state.breaker.failure(now);
    outcome = `provider-${result.kind}`;
    reply = UNAVAILABLE_REPLY;
  } else {
    state.breaker.success();
    const checked = validateReply(result.output, new Set(pack.chunks.map((c) => c.id)));
    outcome = checked.ok ? "ok" : `rejected-${checked.reason}`;
    reply = checked.ok ? toPayload(checked.value) : SAFE_FALLBACK;
  }

  // Counts and outcome only. Never the visitor's words, the answer, or an IP address.
  console.info("assistant", JSON.stringify({ outcome, pack: pack.version, provider: provider.name, turnsLeft }));

  return json({ reply, turnsLeft, unavailable: outcome.startsWith("provider-") || undefined });
}
