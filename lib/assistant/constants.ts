/*
 * Shared, client-safe constants for the AI chat assistant (Workstream 5). Tiny on purpose: the
 * lazy panel and the server both import it. No em dashes in any visitor-facing string.
 */
import { RESPONSE_TIME } from "../site.ts";

export const MAX_INPUT_CHARS = 500;
export const MAX_HISTORY_TURNS = 6;
export const MAX_HISTORY_CHARS = 600;
export const MAX_ANSWER_CHARS = 900;
export const MAX_OUTPUT_TOKENS = 450;
export const DEFAULT_MAX_TURNS = 12;
export const SESSION_TTL_MS = 30 * 60_000;
export const MAX_REQUEST_BYTES = 8_000;

export const INTENTS = ["open_booking", "open_enquiry", "request_human"] as const;
export type AssistantIntent = (typeof INTENTS)[number];

export const BASES = ["published", "general", "unknown"] as const;
export type AssistantBasis = (typeof BASES)[number];

export const BASIS_LABEL: Record<AssistantBasis, string> = {
  published: "From Drylake’s published information",
  general: "General explanation",
  unknown: "Not covered by our published information",
};

export const DISCLOSURE = "I’m Drylake’s AI assistant, not a person.";

export const PRIVACY_NOTE =
  "Please do not share health, financial or government ID details, or passwords. Chats are not saved by Drylake.";

export const ESCALATION_NOTE = `This sends a message to the Drylake team. It is not a live chat. We reply within ${RESPONSE_TIME}.`;

export const ASSISTANT_PATH = "/api/assistant";

export type AssistantReplyPayload = {
  answer: string;
  basis: AssistantBasis;
  sources: ReadonlyArray<{ id: string; title: string; url: string | null }>;
  intent: AssistantIntent | null;
};
