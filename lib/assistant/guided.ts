/*
 * Guided answer mode: NO AI. PURE (unit-tested, tests/assistant-guided.test.mjs).
 *
 * The visitor's question is matched against the approved knowledge pack by retrieval alone, and
 * the best chunk's text is returned VERBATIM, labelled as published information, with its source
 * link. There is no paraphrasing, no generation, and no network call: this module imports no
 * client and cannot reach one. That is what keeps /privacy section 5 ("the website does not send
 * your information to an AI service") true while the assistant is on.
 *
 * Confidence: an answer needs a score, enough of the question's weight matched (coverage) and at
 * least MIN_MATCHED distinct words. Anything below that is "not found" with the three ways to
 * reach a person, never a best guess. Thresholds are pinned by the 20 + 10 question set in the
 * tests; change them only with that set green.
 *
 * Two refusals run before retrieval, because retrieval alone would happily match their words:
 *   - text that tries to steer the assistant (ignore instructions, reveal the prompt, role-play);
 *   - demands for a specific price, rate, deadline or guarantee. A general "how much does a
 *     website cost?" is NOT refused: the published FAQ answers it (no price list, quoted after a
 *     conversation) and that is the honest answer.
 */
import type { AssistantFollowUp, AssistantReplyPayload } from "./constants.ts";
import type { KnowledgeChunk } from "./knowledge.ts";
import { scoreChunks } from "./retrieve.ts";
import { RESPONSE_TIME } from "../site.ts";

/* The privacy chunk describes the AI mode ("processed by an AI model hosted in Australia"), which
   is untrue in guided mode, so guided answers never draw on it. /privacy and the ai-privacy and
   sec-* FAQs cover the same ground truthfully. */
export const GUIDED_EXCLUDED_IDS: ReadonlySet<string> = new Set(["privacy:summary"]);

/* Never offered as a chip: it duplicates a FAQ, and its one-word title would retrieve that FAQ instead. */
export const NO_CHIP_IDS: ReadonlySet<string> = new Set(["collaborate:bronnie"]);

export const MIN_SCORE = 6;
export const MIN_COVERAGE = 0.5;
export const MIN_MATCHED = 2;
const MAX_FOLLOW_UPS = 2;
/* A related question must score at least this share of the best match to be offered. */
const FOLLOW_UP_FLOOR = 0.25;

const STEERING =
  /\b(?:ignore|disregard|forget|override|bypass)\b[^.?!]{0,40}\b(?:instructions?|rules?|prompts?|guidelines?|previous|above|prior)\b|\b(?:system|developer|hidden|initial)\s+(?:prompt|message|instructions?)\b|\b(?:reveal|show|print|repeat|leak)\b[^.?!]{0,30}\b(?:prompt|instructions?|rules?|secrets?|keys?)\b|\b(?:pretend|roleplay|role-play)\b|\bact as\b|\byou are now\b|\bjailbreak\b|\bdeveloper mode\b|\bDAN\b/i;

const SPECIFIC_DEMAND =
  /(?:\$|\ba\$|\baud\s?)\s?\d|\b\d[\d,.]*\s?(?:dollars?|bucks|aud|k)\b|\b(?:hourly|daily|day|weekly|monthly)\s+rate\b|\b(?:exact|fixed|final|firm|binding)\s+(?:price|quote|cost|fee|timeline|date)\b|\b(?:guarantee|promise|commit|assure)\b|\b(?:within|in|by)\s+(?:\d+|a|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:business\s+)?(?:hours?|days?|weeks?|months?)\b|\bhow many (?:days|weeks|months|hours)\b|\bdelivered by\b/i;

/*
 * Three extremely common questions have no distinctive vocabulary ("what do you do" is all stop
 * words; "contact" and "book" appear in many chunks), so lexical scoring cannot place them.
 * They are routed explicitly, ANCHORED to the whole question so "what do you do with my data" or
 * "delete my contact form details" can never be swallowed. The routed text is still the chunk,
 * verbatim.
 */
const ROUTES: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /^(?:so |hi,? |hello,? )?(?:what (?:exactly |actually )?(?:does|do) (?:drylake|you|the company|your company|your business)(?: guys)?(?: actually| exactly)? (?:do|offer|provide|build|sell|specialise in|specialize in)|what services (?:does|do) (?:drylake|you|the company) (?:offer|provide)|what can (?:you|drylake) (?:do|build|offer)(?: for (?:me|us))?|what is drylake|who (?:are you|is drylake))[?.! ]*$/i,
    "faq:svc-what",
  ],
  [
    /^(?:how (?:do|can|could|would) (?:i|we) |can (?:i|we) |i (?:want|would like|need) to |where (?:do|can) (?:i|we) )?(?:book|booking|schedule|arrange|make an appointment|set up)\b[^?.!]{0,30}\b(?:consultation|consult|meeting|appointment|call|chat|time)[?.! a-z]*$/i,
    "consultation:rules",
  ],
  [
    /^(?:how|where|what(?:'s| is) the best way)?[^?.!]{0,25}\b(?:contact|reach|email|phone|call|get in touch with|speak to|talk to)\b[^?.!]{0,12}\b(?:you|drylake|us|the team|someone|a person)[?.! a-z]*$/i,
    "contact:routes",
  ],
  [/^(?:what(?:'s| is) )?(?:your|the drylake|drylake's)\s+(?:phone(?: number)?|email(?: address)?|number|contact details)[?.! ]*$/i, "contact:routes"],
];

export const NOT_FOUND_REPLY: AssistantReplyPayload = {
  answer: `I could not find that in Drylake’s published information, so I will not guess. You can book a free consultation, send an enquiry, or ask to speak to a representative. We reply within ${RESPONSE_TIME}.`,
  basis: "unknown",
  sources: [],
  intent: null,
  escalation: true,
};

export type GuidedOutcome = "answered" | "not-found" | "refused";

export type GuidedResult = { reply: AssistantReplyPayload; outcome: GuidedOutcome; chunkId: string | null };

/* The question that, when asked, retrieves this chunk. Titles that are already questions pass through. */
export function followUpQuestion(chunk: KnowledgeChunk): string {
  return chunk.kind === "service" ? `Tell me about ${chunk.title}` : chunk.title;
}

function sourceUrl(chunk: KnowledgeChunk): string | null {
  if (chunk.kind === "faq" && chunk.url) return `${chunk.url}#${chunk.id.slice("faq:".length)}`;
  return chunk.url;
}

export function answerGuided(question: string, chunks: readonly KnowledgeChunk[]): GuidedResult {
  if (STEERING.test(question) || SPECIFIC_DEMAND.test(question)) {
    return { reply: NOT_FOUND_REPLY, outcome: "refused", chunkId: null };
  }

  const ranked = scoreChunks(
    question,
    chunks.filter((chunk) => !GUIDED_EXCLUDED_IDS.has(chunk.id))
  );
  const routed = ROUTES.find(([pattern]) => pattern.test(question.trim()));
  const routedChunk = routed ? chunks.find((chunk) => chunk.id === routed[1]) : undefined;
  const best = routedChunk
    ? { chunk: routedChunk, score: Number.POSITIVE_INFINITY }
    : ranked[0] &&
        ranked[0].score >= MIN_SCORE &&
        ranked[0].coverage >= MIN_COVERAGE &&
        (ranked[0].matched >= MIN_MATCHED || ranked[0].titleMatched >= 1)
      ? ranked[0]
      : null;

  if (!best) return { reply: NOT_FOUND_REPLY, outcome: "not-found", chunkId: null };

  // Related questions: neighbours of the question, else of the answered chunk, so a routed answer
  // (which has no distinctive words) still gets chips. Never the answered chunk itself.
  const pool = chunks.filter((chunk) => !GUIDED_EXCLUDED_IDS.has(chunk.id) && chunk.id !== best.chunk.id && !NO_CHIP_IDS.has(chunk.id));
  const neighbours = (query: string) => {
    const scored = scoreChunks(query, pool);
    const top = scored[0]?.score ?? 0;
    return scored.filter((entry) => entry.score >= top * FOLLOW_UP_FLOOR);
  };
  const related = [question, best.chunk.title, best.chunk.text].reduce<ReturnType<typeof neighbours>>(
    (found, query) => (found.length > 0 || (routedChunk && query === question) ? found : neighbours(query)),
    []
  );
  const followUps: AssistantFollowUp[] = related
    .slice(0, MAX_FOLLOW_UPS)
    .map((entry) => ({ label: entry.chunk.title, question: followUpQuestion(entry.chunk) }));

  return {
    reply: {
      answer: best.chunk.text,
      basis: "published",
      sources: [{ id: best.chunk.id, title: best.chunk.title, url: sourceUrl(best.chunk) }],
      intent: null,
      followUps,
    },
    outcome: "answered",
    chunkId: best.chunk.id,
  };
}
