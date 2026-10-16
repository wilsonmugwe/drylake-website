/*
 * The approved knowledge pack: the ONLY facts the assistant may state as "Drylake's published
 * information". Assembled deterministically from the same modules the public pages read, so the
 * pack cannot drift from the site (FAQ, services, consultation rules, brand story). PURE except
 * for the content hash (node:crypto), so it is server-side only by use.
 *
 * Versioning: `version` is a hash of every chunk. It changes only when published content changes,
 * and is logged with each answer so a reply can be traced to the pack that produced it.
 * Refresh process: docs/operations/chat-assistant.md (the pack rebuilds on every deploy).
 *
 * Content rules inherited from the sources: no prices, no fixed timelines, no client names or
 * results. The model is additionally forbidden from inventing any (see prompt.ts), and answers
 * are checked for them (see schema.ts).
 */
import { createHash } from "node:crypto";

import { QUOTE_FIRST, CONSULTATION_PROMISES } from "../consultations/copy.ts";
import {
  CONSULTATION_MINUTES,
  CUSTOMER_CHANGE_CUTOFF_MINUTES,
  HORIZON_DAYS,
  MIN_NOTICE_MINUTES,
} from "../consultations/rules.ts";
import { SERVICES } from "../discovery/services.ts";
import { FAQ_ITEMS } from "../faqs.ts";
import { BRAND_STORY_PARAGRAPHS, BRAND_STORY_STEPS, TAGLINE } from "../brand-story.ts";
import { BUSINESS_PHONE, CONTACT_EMAIL, RESPONSE_TIME } from "../site.ts";

export type KnowledgeChunk = {
  id: string;
  kind: "faq" | "service" | "consultation" | "brand" | "privacy" | "contact";
  title: string;
  text: string;
  /* Public page the visitor can open for the full answer. */
  url: string | null;
};

export type KnowledgePack = { version: string; chunks: readonly KnowledgeChunk[] };

const hours = (minutes: number) => minutes / 60;

/* Hand-kept summary of /privacy. The privacy page is the authority; keep this short and literal. */
const PRIVACY_SUMMARY =
  "Drylake explains how it handles personal information on its Privacy Policy page. Information is sent over encrypted connections, access is limited by role, and personal information is deleted on request unless the law requires a record to be kept. This chat assistant is an AI: messages you type are processed by an AI model hosted in Australia to write a reply, and Drylake does not save chat transcripts. Messages sent through the enquiry form are emailed to the Drylake team. Please do not share health, financial or government ID details, or passwords, in the chat.";

function buildChunks(): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  for (const item of FAQ_ITEMS) {
    chunks.push({
      id: `faq:${item.id}`,
      kind: "faq",
      title: item.question,
      text: item.answer,
      url: "/faq",
    });
  }

  for (const service of SERVICES) {
    chunks.push({
      id: `service:${service.slug}`,
      kind: "service",
      title: service.name,
      text: `${service.intro} What we build: ${service.builds.join("; ")}.`,
      url: service.path,
    });
  }

  chunks.push({
    id: "consultation:rules",
    kind: "consultation",
    title: "Free consultation: how booking works",
    text: [
      `A free ${CONSULTATION_MINUTES}-minute consultation with a Drylake founder, by Microsoft Teams or phone.`,
      "Available Monday, Tuesday and Friday, 9:00 am to 5:00 pm Perth time.",
      `Bookable from ${hours(MIN_NOTICE_MINUTES)} hours ahead up to ${HORIZON_DAYS} days ahead.`,
      `Change or cancel online until ${hours(CUSTOMER_CHANGE_CUTOFF_MINUTES)} hours before the start.`,
      ...CONSULTATION_PROMISES,
      QUOTE_FIRST,
    ].join(" "),
    url: "/consultation",
  });

  chunks.push({
    id: "brand:story",
    kind: "brand",
    title: "Why Drylake is called Drylake",
    text: `${BRAND_STORY_PARAGRAPHS.join(" ")} ${BRAND_STORY_STEPS.map((s) => `${s.title}: ${s.text}`).join(" ")} ${TAGLINE}`,
    url: "/about",
  });

  chunks.push({
    id: "privacy:summary",
    kind: "privacy",
    title: "Privacy and the AI assistant",
    text: PRIVACY_SUMMARY,
    url: "/privacy",
  });

  chunks.push({
    id: "contact:routes",
    kind: "contact",
    title: "How to reach Drylake",
    text: `Send a message through the contact form or email ${CONTACT_EMAIL}; Drylake replies within ${RESPONSE_TIME}. Phone: ${BUSINESS_PHONE.display}. Or book a free consultation.`,
    url: "/contact",
  });

  return chunks;
}

let cached: KnowledgePack | null = null;

export function getKnowledgePack(): KnowledgePack {
  if (cached) return cached;

  const chunks = buildChunks();
  const version = createHash("sha256").update(JSON.stringify(chunks)).digest("hex").slice(0, 12);
  cached = { version, chunks };
  return cached;
}
