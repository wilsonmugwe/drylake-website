/*
 * Browser-side calls to /api/assistant. Never throws: every failure becomes a message safe to
 * show. No transcript is stored anywhere in the browser beyond component state.
 */
import { ASSISTANT_PATH, type AssistantReplyPayload } from "./constants.ts";
import { CONTACT_EMAIL } from "../site.ts";

const TIMEOUT_MS = 25_000;
const FALLBACK = `The assistant is unavailable right now. Please use the contact form or email ${CONTACT_EMAIL}.`;

export type StartResult = { ok: true; sessionToken: string } | { ok: false; message: string; unavailable: boolean };
export type SendResult =
  | { ok: true; reply: AssistantReplyPayload; turnsLeft: number }
  | { ok: false; message: string; sessionEnded: boolean };

async function post(body: unknown): Promise<{ status: number; data: Record<string, unknown> } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ASSISTANT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return data && typeof data === "object" ? { status: response.status, data } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function startSession(turnstileToken: string): Promise<StartResult> {
  const res = await post({ action: "start", turnstileToken });
  if (res?.status === 200 && typeof res.data.sessionToken === "string") return { ok: true, sessionToken: res.data.sessionToken };
  if (res?.status === 403 || res?.status === 429) {
    return { ok: false, unavailable: false, message: typeof res.data.error === "string" ? res.data.error : "Please try the security check again." };
  }
  return { ok: false, unavailable: true, message: FALLBACK };
}

export async function sendMessage(
  sessionToken: string,
  text: string,
  history: ReadonlyArray<{ role: "visitor" | "assistant"; text: string }>
): Promise<SendResult> {
  const res = await post({ action: "message", sessionToken, text, history });
  const reply = res?.data.reply as AssistantReplyPayload | undefined;
  if (res?.status === 200 && reply && typeof reply.answer === "string") {
    return { ok: true, reply, turnsLeft: typeof res.data.turnsLeft === "number" ? res.data.turnsLeft : 0 };
  }
  if (res?.status === 503 && reply) return { ok: true, reply, turnsLeft: 0 };
  const message = typeof res?.data.error === "string" ? res.data.error : FALLBACK;
  return { ok: false, message, sessionEnded: res?.status === 401 || res?.status === 429 };
}
