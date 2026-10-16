/*
 * Input guards and canned replies. PURE (unit-tested).
 *
 * Sensitive-data screen: if a visitor types something that looks like a card number, TFN,
 * password or ID number, the message is NOT sent to the model at all (it would leave Drylake's
 * control) and a fixed reply asks them not to share it. Heuristic, deliberately over-eager.
 */
import {
  MAX_HISTORY_CHARS,
  MAX_HISTORY_TURNS,
  MAX_INPUT_CHARS,
  type AssistantReplyPayload,
} from "./constants.ts";
import type { HistoryTurn } from "./prompt.ts";
import { BUSINESS_PHONE, CONTACT_EMAIL, RESPONSE_TIME } from "../site.ts";

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export type InputCheck = { ok: true; text: string } | { ok: false; message: string };

export function checkVisitorText(value: unknown): InputCheck {
  if (typeof value !== "string") return { ok: false, message: "Please type a message." };
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, message: "Please type a message." };
  if (text.length > MAX_INPUT_CHARS) {
    return { ok: false, message: `Please keep messages under ${MAX_INPUT_CHARS} characters.` };
  }
  if (CONTROL.test(text)) return { ok: false, message: "That message has characters we cannot read." };
  return { ok: true, text };
}

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function looksSensitive(text: string): boolean {
  const compact = text.replace(/[\s-]/g, "");
  const run = compact.match(/\d{13,19}/g)?.some(luhn);
  if (run) return true;
  if (/\b\d{3}[ -]?\d{3}[ -]?\d{3}\b/.test(text) && /\b(tfn|tax file|abn|medicare|licen[cs]e|passport)\b/i.test(text)) return true;
  if (/\b(?:my )?(?:password|passcode|pin)\s*(?:is|:)/i.test(text)) return true;
  if (/\b(?:medicare|passport|licen[cs]e)\s*(?:number|no\.?)?\s*(?:is|:)?\s*[a-z0-9]{6,}/i.test(text)) return true;
  return false;
}

export function sanitiseHistory(value: unknown): HistoryTurn[] {
  if (!Array.isArray(value)) return [];
  const out: HistoryTurn[] = [];
  for (const item of value.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const { role, text } = item as Record<string, unknown>;
    if ((role === "visitor" || role === "assistant") && typeof text === "string") {
      out.push({ role, text: text.replace(/\s+/g, " ").trim().slice(0, MAX_HISTORY_CHARS) });
    }
  }
  return out;
}

const reach = `You can book a free consultation, send us a message (we reply within ${RESPONSE_TIME}), email ${CONTACT_EMAIL} or call ${BUSINESS_PHONE.display}.`;

export const SENSITIVE_REPLY: AssistantReplyPayload = {
  answer: "Please do not share that kind of detail here. I have not sent it anywhere. Remove it and ask again, or message the team directly.",
  basis: "unknown",
  sources: [],
  intent: "open_enquiry",
};

/* Model output failed validation, or the model said nothing usable. */
export const SAFE_FALLBACK: AssistantReplyPayload = {
  answer: `I can't answer that reliably, so I won't guess. ${reach}`,
  basis: "unknown",
  sources: [],
  intent: "open_enquiry",
};

/* Provider down, circuit open, cap reached or feature mis-configured. */
export const UNAVAILABLE_REPLY: AssistantReplyPayload = {
  answer: `The assistant is unavailable right now. ${reach}`,
  basis: "unknown",
  sources: [],
  intent: "open_enquiry",
};
