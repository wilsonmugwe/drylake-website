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
import { scoreChunks, type ScoreOptions } from "./retrieve.ts";
import { RESPONSE_TIME } from "../site.ts";

/* The privacy chunk describes the AI mode ("processed by an AI model hosted in Australia"), which
   is untrue in guided mode, so guided answers never draw on it. /privacy and the ai-privacy and
   sec-* FAQs cover the same ground truthfully. */
export const GUIDED_EXCLUDED_IDS: ReadonlySet<string> = new Set(["privacy:summary"]);

/* Never offered as a chip: it duplicates a FAQ, and its one-word title would retrieve that FAQ instead. */
export const NO_CHIP_IDS: ReadonlySet<string> = new Set(["collaborate:bronnie"]);

/*
 * Precision tuning (a confident wrong verbatim answer is worse than not-found).
 *
 * 1. Words that appear all over this site's copy identify nothing, so they never score:
 *    "do you offer hosting" must not match a chunk because it says "offer" somewhere.
 * 2. Synonym CONCEPTS: a visitor's word and the pack's word often differ (hosting vs "after the
 *    website launches"). A concept token is added to the query when one of its words is typed, and
 *    to the TITLE (never the body) of the chunks that own that topic. Body text cannot match a
 *    concept, so "hosting" cannot pull in an AI-privacy answer that merely mentions hosting.
 * 3. Margin: if the runner-up scores nearly as high, the match is ambiguous. We then offer both
 *    as chips and assert neither.
 */
export const GUIDED_STOPWORDS: ReadonlySet<string> = new Set(["drylake", "service", "offer", "provide", "business", "company", "team"]);

const CONCEPTS: ReadonlyArray<{ name: string; words: readonly string[]; chunks: readonly string[] }> = [
  { name: "c-aftercare", words: ["hosting", "host", "hosted", "maintenance", "maintain", "support", "update", "launch", "live", "after", "handover"], chunks: ["faq:web-after"] },
  { name: "c-manage-booking", words: ["cancel", "reschedule", "rebook"], chunks: ["consultation:rules"] },
  { name: "c-google", words: ["google", "search", "seo", "ranking", "rank", "visible", "visibility"], chunks: ["faq:web-google"] },
  { name: "c-improve", words: ["improve", "fix", "repair", "upgrade", "revamp", "refresh", "redesign", "rebuild"], chunks: ["faq:web-redesign", "faq:sw-improve"] },
  { name: "c-mobile", words: ["phone", "mobile", "tablet", "responsive", "iphone", "android"], chunks: ["faq:web-mobile"] },
  { name: "c-security", words: ["safe", "secure", "security", "protect", "private", "confidential"], chunks: ["faq:sec-protect"] },
  { name: "c-where", words: ["outside", "interstate", "overseas", "regional", "remote", "nationwide", "travel"], chunks: ["faq:wk-who"] },
  { name: "c-pricing", words: ["cost", "price", "pricing", "quote", "quoted", "charge", "fee", "budget"], chunks: ["faq:web-cost", "faq:sw-cost", "faq:price-quote"] },
  { name: "c-booking", words: ["booking", "book", "appointment", "meeting", "schedule"], chunks: ["consultation:rules", "faq:price-consultation"] },
  { name: "c-portal", words: ["portal", "dashboard"], chunks: ["faq:sw-portals"] },
  { name: "c-connect", words: ["integrate", "integration", "connect", "sync"], chunks: ["faq:sw-connect", "service:systems-integration"] },
];

const SCORE_OPTIONS: ScoreOptions = {
  extraStopwords: GUIDED_STOPWORDS,
  queryConcepts: (tokens) => CONCEPTS.filter((c) => c.words.some((w) => tokens.includes(w))).map((c) => c.name),
  titleConcepts: (chunk) => CONCEPTS.filter((c) => c.chunks.includes(chunk.id)).map((c) => c.name),
};

/* Runner-up within this share of the best score: ambiguous. */
export const AMBIGUITY_RATIO = 0.8;

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
  [/^(?:tell me about|what about|what is|do you (?:do|build|make))\s+(?:drylake'?s?\s+)?(?:websites?|web (?:development|design))(?: services?)?[?.! ]*$/i, "service:web-development"],
  [/^(?:tell me about|what about|what is|do you (?:do|build|make))\s+(?:drylake'?s?\s+)?(?:custom )?software(?: development| and apps| services?)?[?.! ]*$/i, "service:custom-software-development"],
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

export type GuidedOutcome = "answered" | "not-found" | "refused" | "ambiguous";

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
    chunks.filter((chunk) => !GUIDED_EXCLUDED_IDS.has(chunk.id)),
    SCORE_OPTIONS
  );
  // A chip click sends the chip's exact question: answer that chunk, so a chip never lands elsewhere.
  const normalised = question.trim().toLowerCase();
  const chipChunk = chunks.find((chunk) => !GUIDED_EXCLUDED_IDS.has(chunk.id) && !NO_CHIP_IDS.has(chunk.id) && followUpQuestion(chunk).toLowerCase() === normalised);
  const routed = ROUTES.find(([pattern]) => pattern.test(question.trim()));
  const routedChunk = chipChunk ?? (routed ? chunks.find((chunk) => chunk.id === routed[1]) : undefined);
  const best = routedChunk
    ? { chunk: routedChunk, score: Number.POSITIVE_INFINITY }
    : ranked[0] &&
        ranked[0].score >= MIN_SCORE &&
        ranked[0].coverage >= MIN_COVERAGE &&
        (ranked[0].matched >= MIN_MATCHED || ranked[0].titleMatched >= 1)
      ? ranked[0]
      : null;

  if (!best) return { reply: NOT_FOUND_REPLY, outcome: "not-found", chunkId: null };

  if (!routedChunk) {
    // A chunk that duplicates the leader (NO_CHIP_IDS) is not a competing answer.
    const runnerUp = ranked.find((entry) => entry.chunk.id !== best.chunk.id && !NO_CHIP_IDS.has(entry.chunk.id) && !NO_CHIP_IDS.has(best.chunk.id));
    if (runnerUp && runnerUp.score >= best.score * AMBIGUITY_RATIO && runnerUp.titleMatched >= (best as { titleMatched: number }).titleMatched) {
      return {
        reply: {
          answer: "I found more than one possible match in Drylake’s published information, so I will not pick one for you. Choose a question below, or reach a person.",
          basis: "unknown",
          sources: [],
          intent: null,
          followUps: [best.chunk, runnerUp.chunk].map((chunk) => ({ label: chunk.title, question: followUpQuestion(chunk) })),
          escalation: true,
          ambiguous: true,
        },
        outcome: "ambiguous",
        chunkId: null,
      };
    }
  }

  // Related questions: neighbours of the question, else of the answered chunk, so a routed answer
  // (which has no distinctive words) still gets chips. Never the answered chunk itself.
  const pool = chunks.filter((chunk) => !GUIDED_EXCLUDED_IDS.has(chunk.id) && chunk.id !== best.chunk.id && !NO_CHIP_IDS.has(chunk.id));
  const neighbours = (query: string) => {
    const scored = scoreChunks(query, pool, SCORE_OPTIONS);
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
