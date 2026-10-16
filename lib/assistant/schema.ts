/*
 * Server-side validation of model output. PURE (unit-tested).
 *
 * The model is treated as an untrusted component. Whatever it returns must pass every check here
 * or the caller substitutes a safe fallback; nothing the model says reaches a visitor unchecked.
 * Checks: shape and sizes, intent allowlist, source ids exist in the pack, "published" needs a
 * real source, no markup, no prices, no timelines or guarantees, no claim to be human, no
 * request for sensitive data, no prompt leak. Em dashes are normalised (portfolio rule).
 *
 * Output is plain text and the UI renders it as text nodes (never HTML), so escaping is
 * defence in depth, not the only barrier.
 */
import { BASES, INTENTS, MAX_ANSWER_CHARS, type AssistantBasis, type AssistantIntent } from "./constants.ts";
import { PROMPT_CANARY } from "./prompt.ts";
import { RESPONSE_TIME } from "../site.ts";

export type ValidReply = {
  answer: string;
  basis: AssistantBasis;
  sources: string[];
  intent: AssistantIntent | null;
};

export type ReplyCheck = { ok: true; value: ValidReply } | { ok: false; reason: string };

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MARKUP = /<\/?[a-z!][^>]*>|javascript:|data:text\/html|on[a-z]+\s*=\s*["']|&lt;\s*script/i;
const PRICE =
  /(?:\$|aud\s?|a\$)\s?\d|\b\d[\d,.]*\s?(?:dollars?|bucks|aud|k\b)|\b(?:per|a)\s+(?:hour|month|week|year|day)\b|\b(?:costs?|prices?|fees?|rates?|charges?)\s+(?:is|are|from|starts?|around|about|roughly|approximately|between)\b|\bstarting (?:at|from) \d/i;
const TIMELINE =
  /\b(?:within|in|takes?|take about|around|about|roughly|approximately|under|over)\s+(?:a |an |one |two |three |four |five |six |seven |eight |nine |ten |\d+(?:\s?(?:-|to)\s?\d+)?\s?)(?:business |working )?(?:hours?|days?|weeks?|months?|years?)\b|\b\d+\s?(?:-|to)\s?\d+\s?(?:business |working )?(?:days?|weeks?|months?)\b|\bguarantee[sd]?\b|\bby (?:monday|tuesday|wednesday|thursday|friday|next week|end of)\b|\b(?:will|can) be (?:ready|live|delivered|done|finished)\b/i;
const HUMAN_CLAIM =
  /\b(?:i am|i'm|i’m)\s+(?:a\s+)?(?:real\s+)?(?:human|person|team member|staff member|founder|employee|wilson|benedict|developer|engineer)\b|\bas a (?:human|person|founder)\b/i;
const SENSITIVE_ASK =
  /\b(?:send|share|provide|enter|give|tell|type|confirm|supply)\s+(?:me|us|it|your|the)?\s*(?:your\s+)?(?:password|passcode|pin|passport|driver'?s? licen[cs]e|tax file number|tfn|medicare|card number|credit card|bank (?:account|details)|date of birth|medical|health (?:details|information))\b/i;
const PERMITTED_PROMISE = new RegExp(`within ${RESPONSE_TIME.replace(/\s/g, "\\s")}`, "gi");

function clean(text: string): string {
  return text
    .replace(CONTROL, "")
    .replace(/—/g, ", ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function validateReply(raw: unknown, knownSourceIds: ReadonlySet<string>): ReplyCheck {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "not-object" };
  const r = raw as Record<string, unknown>;

  if (typeof r.answer !== "string") return { ok: false, reason: "answer-type" };
  const answer = clean(r.answer);
  if (answer.length < 2) return { ok: false, reason: "answer-empty" };
  if (answer.length > MAX_ANSWER_CHARS) return { ok: false, reason: "answer-long" };

  if (typeof r.basis !== "string" || !(BASES as readonly string[]).includes(r.basis)) {
    return { ok: false, reason: "basis" };
  }
  const basis = r.basis as AssistantBasis;

  const intent = r.intent ?? null;
  if (intent !== null && (typeof intent !== "string" || !(INTENTS as readonly string[]).includes(intent))) {
    return { ok: false, reason: "intent" };
  }

  const sourcesRaw = Array.isArray(r.sources) ? r.sources : null;
  if (!sourcesRaw || sourcesRaw.length > 6 || sourcesRaw.some((s) => typeof s !== "string")) {
    return { ok: false, reason: "sources-shape" };
  }
  const sources = [...new Set(sourcesRaw as string[])];
  if (sources.some((id) => !knownSourceIds.has(id))) return { ok: false, reason: "sources-unknown" };
  if (basis === "published" && sources.length === 0) return { ok: false, reason: "published-without-source" };

  const scanned = answer.replace(PERMITTED_PROMISE, "");
  if (MARKUP.test(answer) || /[<>]/.test(answer)) return { ok: false, reason: "markup" };
  if (answer.includes(PROMPT_CANARY) || /<knowledge>|visitor_message|system prompt:/i.test(answer)) {
    return { ok: false, reason: "prompt-leak" };
  }
  if (PRICE.test(scanned)) return { ok: false, reason: "price" };
  if (TIMELINE.test(scanned)) return { ok: false, reason: "timeline-or-guarantee" };
  if (HUMAN_CLAIM.test(answer)) return { ok: false, reason: "human-claim" };
  if (SENSITIVE_ASK.test(answer)) return { ok: false, reason: "sensitive-ask" };

  return {
    ok: true,
    value: { answer, basis, sources: basis === "published" ? sources : [], intent: intent as AssistantIntent | null },
  };
}
