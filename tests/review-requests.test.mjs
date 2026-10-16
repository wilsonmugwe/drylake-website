/*
 * Genuine review requests (/admin/reviews, /feedback, /api/feedback) and the public testimonial
 * component.
 *
 * Pure logic (tokens, validation, eligibility, what the public site may show, the email) runs the
 * real modules. Route, page and migration behaviour is pinned at source level, as the other route
 * tests in this repo do it. The invariants that must survive concurrency (a token spends exactly
 * once, one request per recipient per engagement) are tested against a real Postgres by
 * tests/db/run-review-db-tests.sh. Browser behaviour is in tests/e2e/reviews.spec.ts.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { actorTag, consentLabel, publicStateLabel, ratingLabel, snippet } from "../lib/reviews/admin-view.ts";
import { DISPLAY_CHOICE_VALUES, REVIEW_LIMITS, SUBMIT_MESSAGES } from "../lib/reviews/catalog.ts";
import { buildCandidates, findCandidate, normaliseEmail } from "../lib/reviews/eligibility.ts";
import { byline, reviewPlatformUrl, visibleTestimonials } from "../lib/reviews/testimonials.ts";
import {
  REVIEW_TOKEN_TTL_DAYS,
  feedbackUrl,
  hashToken,
  isTokenShape,
  issueToken,
  tokenExpiry,
  unsubscribeApiUrl,
  unsubscribePageUrl,
} from "../lib/reviews/tokens.ts";
import { validateAction, validateFeedbackInput, validateSendRequest, validateUnsubscribeToken } from "../lib/reviews/validate.ts";
import { REVIEW_EMAIL_SUBJECT, firstName, renderReviewRequestEmail } from "../lib/email/review-request-email.ts";
import { feedbackFromAddress } from "../lib/email/review-request-sender.ts";
import { PRIVATE_PREFIXES, PUBLIC_PAGES } from "../lib/discovery/entity.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const code = (rel) => stripComments(read(rel));
const EM_DASH = "—";

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

describe("tokens", () => {
  it("issues a 43 character base64url token and stores only its sha256", () => {
    const { token, hash } = issueToken();
    assert.equal(token.length, 43);
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(hash, createHash("sha256").update(token).digest("hex"));
    assert.equal(hashToken(token), hash);
    assert.notEqual(hash, token);
  });

  it("never repeats", () => {
    assert.equal(new Set(Array.from({ length: 200 }, () => issueToken().token)).size, 200);
  });

  it("shape check rejects junk without a lookup", () => {
    assert.ok(isTokenShape(issueToken().token));
    for (const bad of ["", "short", "a".repeat(42), "a".repeat(44), `${"a".repeat(42)}!`, null, undefined, 5, {}]) {
      assert.equal(isTokenShape(bad), false, String(bad));
    }
  });

  it("expires after the stated number of days", () => {
    const now = new Date("2026-10-16T00:00:00Z");
    assert.equal(REVIEW_TOKEN_TTL_DAYS, 30);
    assert.equal(tokenExpiry(now).toISOString(), "2026-11-15T00:00:00.000Z");
  });

  it("puts the feedback and unsubscribe tokens in the URL fragment, never the query or path", () => {
    const token = issueToken().token;
    assert.equal(feedbackUrl("https://drylake.com.au", token), `https://drylake.com.au/feedback#t=${token}`);
    assert.equal(unsubscribePageUrl("https://drylake.com.au", token), `https://drylake.com.au/feedback/unsubscribe#t=${token}`);
    // The List-Unsubscribe one-click endpoint is a POST target and carries the token in its query.
    assert.equal(unsubscribeApiUrl("https://drylake.com.au", token), `https://drylake.com.au/api/feedback/unsubscribe?t=${token}`);
  });
});

describe("validateFeedbackInput", () => {
  const token = issueToken().token;

  it("accepts a lookup for a well-formed token and 404s a malformed one", () => {
    assert.deepEqual(validateFeedbackInput({ action: "lookup", token }), { ok: true, action: "lookup", token });
    const bad = validateFeedbackInput({ action: "lookup", token: "nope" });
    assert.equal(bad.ok, false);
    assert.equal(bad.status, 404);
  });

  it("rating is optional but must be a whole number from 1 to 5", () => {
    assert.ok(validateFeedbackInput({ action: "submit", token, comments: "Fine." }).ok);
    for (const rating of [1, 5]) assert.ok(validateFeedbackInput({ action: "submit", token, rating }).ok, String(rating));
    for (const rating of [0, 6, 2.5, "3", -1, NaN]) {
      assert.equal(validateFeedbackInput({ action: "submit", token, rating, comments: "x" }).ok, false, String(rating));
    }
  });

  it("needs a rating or a comment", () => {
    assert.equal(validateFeedbackInput({ action: "submit", token }).ok, false);
    assert.equal(validateFeedbackInput({ action: "submit", token, comments: "   " }).ok, false);
  });

  it("negative feedback is accepted exactly like positive feedback", () => {
    const result = validateFeedbackInput({ action: "submit", token, rating: 1, comments: "Slow, and the invoice was wrong." });
    assert.ok(result.ok);
    assert.equal(result.submission.rating, 1);
  });

  it("publication consent is its own explicit boolean: only literal true counts", () => {
    for (const publishConsent of [undefined, false, "true", "on", 1, null]) {
      const result = validateFeedbackInput({ action: "submit", token, comments: "Good.", publishConsent, displayChoice: "anonymous" });
      assert.ok(result.ok, String(publishConsent));
      assert.equal(result.submission.publishConsent, false, String(publishConsent));
      assert.equal(result.submission.displayChoice, null, "no display choice is kept without consent");
    }
    const yes = validateFeedbackInput({ action: "submit", token, comments: "Good.", publishConsent: true, displayChoice: "anonymous" });
    assert.ok(yes.ok);
    assert.equal(yes.submission.publishConsent, true);
  });

  it("consent needs comments and a valid way to be credited", () => {
    assert.equal(validateFeedbackInput({ action: "submit", token, rating: 5, publishConsent: true, displayChoice: "anonymous" }).ok, false);
    assert.equal(validateFeedbackInput({ action: "submit", token, comments: "Good.", publishConsent: true }).ok, false);
    assert.equal(validateFeedbackInput({ action: "submit", token, comments: "Good.", publishConsent: true, displayChoice: "everyone" }).ok, false);
    for (const choice of DISPLAY_CHOICE_VALUES) {
      assert.ok(validateFeedbackInput({ action: "submit", token, comments: "Good.", publishConsent: true, displayChoice: choice }).ok, choice);
    }
  });

  it("limits comment length and refuses control characters", () => {
    assert.equal(validateFeedbackInput({ action: "submit", token, comments: "x".repeat(REVIEW_LIMITS.comments + 1) }).ok, false);
    assert.ok(validateFeedbackInput({ action: "submit", token, comments: "x".repeat(REVIEW_LIMITS.comments) }).ok);
    assert.equal(validateFeedbackInput({ action: "submit", token, comments: "a\u0000b" }).ok, false);
    assert.ok(validateFeedbackInput({ action: "submit", token, comments: "two\nlines" }).ok);
  });

  it("rejects non-objects and unknown actions", () => {
    for (const body of [null, "x", 5, [], undefined]) assert.equal(validateFeedbackInput(body).ok, false);
    assert.equal(validateFeedbackInput({ action: "delete", token }).ok, false);
  });

  it("every database outcome has a visitor message and a sensible status", () => {
    for (const outcome of ["submitted", "already_submitted", "expired", "withdrawn", "invalid", "empty", "consent_needs_comments", "invalid_input"]) {
      assert.ok(SUBMIT_MESSAGES[outcome], outcome);
    }
    assert.equal(SUBMIT_MESSAGES.already_submitted.status, 409);
    assert.equal(SUBMIT_MESSAGES.expired.status, 410);
  });
});

describe("admin input", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("a send needs the engagement and an explicit confirm:true", () => {
    assert.deepEqual(validateSendRequest({ kind: "project", engagementId: id, confirm: true }), { ok: true, kind: "project", engagementId: id });
    for (const confirm of [undefined, false, "true", 1]) {
      assert.equal(validateSendRequest({ kind: "project", engagementId: id, confirm }).ok, false, String(confirm));
    }
    assert.equal(validateSendRequest({ kind: "invoice", engagementId: id, confirm: true }).ok, false);
    assert.equal(validateSendRequest({ kind: "project", engagementId: "nope", confirm: true }).ok, false);
  });

  it("actions are an allow-list", () => {
    assert.equal(validateAction({ action: "approve" }, ["approve", "remove"]), "approve");
    assert.equal(validateAction({ action: "drop" }, ["approve", "remove"]), null);
    assert.equal(validateAction(null, ["approve"]), null);
  });

  it("an unsubscribe token must be well formed", () => {
    assert.equal(validateUnsubscribeToken("nope"), null);
    const token = issueToken().token;
    assert.equal(validateUnsubscribeToken(token), token);
  });
});

describe("who is eligible for a request", () => {
  const orgs = [
    { id: "o1", name: "Example Pty Ltd", status: "ACTIVE", billing_contact_name: "Quinn Tester", billing_email: "Quinn@Example.com" },
    { id: "o2", name: "Old Co", status: "ARCHIVED", billing_contact_name: "Old", billing_email: "old@example.com" },
    { id: "o3", name: "No Email Co", status: "ACTIVE", billing_contact_name: "Nobody", billing_email: "not-an-email" },
    { id: "o4", name: "Bare Co", status: "ACTIVE", billing_contact_name: null, billing_email: "hello@bare.example" },
  ];
  const projects = [
    { id: "p1", name: "Website rebuild", status: "COMPLETED", organization_id: "o1" },
    { id: "p2", name: "Still going", status: "ACTIVE", organization_id: "o1" },
    { id: "p3", name: "Archived client", status: "COMPLETED", organization_id: "o2" },
    { id: "p4", name: "Bad email", status: "COMPLETED", organization_id: "o3" },
    { id: "p5", name: "Cancelled", status: "CANCELLED", organization_id: "o1" },
    { id: "p6", name: "Unknown org", status: "COMPLETED", organization_id: "missing" },
    { id: "p7", name: "Bare project", status: "COMPLETED", organization_id: "o4" },
  ];
  const consultations = [
    { id: "c1", reference: "DL-AAAA11", status: "COMPLETED", customer_name: "Rae Booker", customer_email: "rae@example.com", business_name: "Rae Cleaning" },
    { id: "c2", reference: "DL-BBBB22", status: "CANCELLED", customer_name: "Cam", customer_email: "cam@example.com", business_name: null },
    { id: "c3", reference: "DL-CCCC33", status: "CONFIRMED", customer_name: "Sam", customer_email: "sam@example.com", business_name: null },
  ];
  const base = { projects, organizations: orgs, consultations, requests: [], suppressed: new Set() };

  it("includes only completed engagements with a valid recipient and a live organisation", () => {
    const keys = buildCandidates(base).map((c) => `${c.kind}:${c.engagementId}`).sort();
    assert.deepEqual(keys, ["consultation:c1", "project:p1", "project:p7"]);
  });

  it("a project asks the billing contact; a consultation asks the person who booked", () => {
    const [project] = buildCandidates(base).filter((c) => c.engagementId === "p1");
    assert.equal(project.recipientName, "Quinn Tester");
    assert.equal(project.recipientEmail, "quinn@example.com");
    assert.equal(project.organisationName, "Example Pty Ltd");
    assert.equal(project.engagementLabel, "Website rebuild");
    const [consultation] = buildCandidates(base).filter((c) => c.engagementId === "c1");
    assert.equal(consultation.recipientName, "Rae Booker");
    assert.equal(consultation.organisationName, "Rae Cleaning");
    assert.equal(consultation.organizationId, null);
  });

  it("falls back to the organisation name when there is no billing contact name", () => {
    assert.equal(buildCandidates(base).find((c) => c.engagementId === "p7").recipientName, "Bare Co");
  });

  it("marks an engagement already asked, whatever the address casing", () => {
    const requests = [{ engagement_kind: "project", engagement_id: "p1", recipient_email: "QUINN@example.com" }];
    const candidates = buildCandidates({ ...base, requests });
    assert.equal(candidates.find((c) => c.engagementId === "p1").blocked, "already_requested");
    assert.equal(candidates.find((c) => c.engagementId === "c1").blocked, null);
  });

  it("marks an opted-out address as suppressed, and suppression wins", () => {
    const requests = [{ engagement_kind: "project", engagement_id: "p1", recipient_email: "quinn@example.com" }];
    const candidates = buildCandidates({ ...base, requests, suppressed: new Set(["quinn@example.com"]) });
    assert.equal(candidates.find((c) => c.engagementId === "p1").blocked, "suppressed");
  });

  it("re-derives one candidate by kind and id, and refuses anything the browser invented", () => {
    const candidates = buildCandidates(base);
    assert.ok(findCandidate(candidates, "project", "p1"));
    assert.equal(findCandidate(candidates, "project", "p2"), null);
    assert.equal(findCandidate(candidates, "consultation", "p1"), null);
  });

  it("normalises and validates addresses", () => {
    assert.equal(normaliseEmail(" A@B.CO "), "a@b.co");
    for (const bad of ["", "x", "a@b", "a b@c.de", "a@b.c\nbcc:x@y.z", null, undefined]) assert.equal(normaliseEmail(bad), null, String(bad));
  });

  it("documents the rule where it lives", () => {
    const source = read("lib/reviews/eligibility.ts");
    assert.match(source, /THE RULE/);
    assert.match(source, /COMPLETED project/);
    assert.match(source, /COMPLETED consultation/);
    assert.match(read("docs/operations/review-requests.md"), /eligib/i);
  });
});

describe("what the public site may show", () => {
  const row = (overrides = {}) => ({
    comments: "They were quick and clear.",
    publish_consent: true,
    approved: true,
    removed_at: null,
    display_name: "Quinn",
    display_organisation: "Example Pty Ltd",
    approved_at: "2026-10-10T00:00:00Z",
    ...overrides,
  });

  it("shows nothing when there is nothing", () => {
    assert.deepEqual(visibleTestimonials([]), []);
  });

  it("shows only feedback that is consented AND approved AND not removed AND has text", () => {
    const rows = [
      row({ comments: "shown" }),
      row({ comments: "no consent", publish_consent: false }),
      row({ comments: "not approved", approved: false }),
      row({ comments: "removed", removed_at: "2026-10-11T00:00:00Z" }),
      row({ comments: null }),
      row({ comments: "   " }),
    ];
    assert.deepEqual(visibleTestimonials(rows).map((t) => t.quote), ["shown"]);
  });

  it("is newest approval first and capped", () => {
    const rows = Array.from({ length: 9 }, (_, i) => row({ comments: `q${i}`, approved_at: `2026-10-0${i + 1}T00:00:00Z` }));
    const shown = visibleTestimonials(rows, 3).map((t) => t.quote);
    assert.deepEqual(shown, ["q8", "q7", "q6"]);
  });

  it("credits exactly what the customer chose, with a neutral fallback", () => {
    assert.equal(byline({ display_name: "Quinn Tester", display_organisation: "Example Pty Ltd" }), "Quinn Tester, Example Pty Ltd");
    assert.equal(byline({ display_name: null, display_organisation: "Example Pty Ltd" }), "Example Pty Ltd");
    assert.equal(byline({ display_name: null, display_organisation: null }), "A Drylake client");
  });

  it("the public type carries no rating, so no stars or averages can be built from it", () => {
    const [shown] = visibleTestimonials([row()]);
    assert.deepEqual(Object.keys(shown).sort(), ["byline", "quote"]);
    assert.ok(!/rating|star|average|aggregate/i.test(read("lib/reviews/testimonials.ts").replace(/\/\*[\s\S]*?\*\//g, "")));
  });

  it("the external platform link needs a valid https URL and is otherwise absent", () => {
    assert.equal(reviewPlatformUrl(undefined), null);
    assert.equal(reviewPlatformUrl(""), null);
    for (const bad of ["http://g.page/r/abc", "javascript:alert(1)", "https://user:pw@g.page/r/abc", "not a url", "https://localhost"]) {
      assert.equal(reviewPlatformUrl(bad), null, bad);
    }
    assert.deepEqual(reviewPlatformUrl("https://www.google.com/maps/place/x/review"), { href: "https://www.google.com/maps/place/x/review", host: "google.com" });
  });
});

describe("the public quotes component", () => {
  const component = code("components/reviews/ApprovedQuotes.tsx");
  const publicData = code("lib/reviews/public.ts");

  it("renders nothing at all when there are none: no heading, stars or placeholder", () => {
    assert.match(component, /if \(quotes\.length === 0\) return null;/);
    const beforeGuard = component.slice(0, component.indexOf("return null;"));
    assert.ok(!/<h2|<section|<ul/.test(beforeGuard));
  });

  it("never draws stars, ratings or an aggregate and emits no structured data", () => {
    assert.ok(!/star|rating|aggregate|average|\bscore\b/i.test(component));
    assert.ok(!/JsonLd|application\/ld\+json|@type|schema\.org/.test(component));
    assert.ok(!/"use client"/.test(read("components/reviews/ApprovedQuotes.tsx")));
  });

  it("the data function returns an empty list on any failure and selects display fields only", () => {
    assert.match(publicData, /catch \{\s*return \[\];\s*\}/);
    assert.match(publicData, /if \(!result \|\| result\.error\) return \[\];/);
    const select = publicData.match(/\.select\("([^"]+)"\)/)?.[1] ?? "";
    assert.ok(!/email|rating|request_id|approved_by|removed_by/.test(select), select);
    for (const filter of [/\.eq\("approved", true\)/, /\.eq\("publish_consent", true\)/, /\.is\("removed_at", null\)/, /\.not\("comments", "is", null\)/]) {
      assert.match(publicData, filter);
    }
  });

  it("the external platform link appears only with real quotes and only when configured", () => {
    assert.match(component, /reviewPlatformUrl\(process\.env\.REVIEW_PLATFORM_URL\)/);
    assert.match(component, /\{platform \? \(/);
  });

  it("is mounted on /services, which refreshes hourly and on approval", () => {
    const services = code("app/services/page.tsx");
    assert.match(services, /<ApprovedQuotes \/>/);
    assert.match(services, /export const revalidate = 3600/);
    assert.match(code("app/api/admin/reviews/feedback/[feedbackId]/route.ts"), /revalidatePath\("\/services"\)/);
  });

  it("no source anywhere emits Review or AggregateRating structured data", () => {
    const files = [...walk(join(ROOT, "app"), (f) => /\.(ts|tsx)$/.test(f)), ...walk(join(ROOT, "lib"), (f) => /\.(ts|tsx)$/.test(f)), ...walk(join(ROOT, "components"), (f) => /\.(ts|tsx)$/.test(f))];
    for (const file of files) {
      const source = stripComments(readFileSync(file, "utf8"));
      assert.ok(!/aggregateRating|AggregateRating|"@type":\s*"Review"|ratingValue|reviewRating/.test(source), relative(ROOT, file));
    }
  });
});

describe("the review request email", () => {
  const token = issueToken().token;
  const unsub = issueToken().token;
  const input = {
    recipientName: "Quinn <b>Tester</b>",
    engagementLabel: "Website rebuild",
    feedbackUrl: feedbackUrl("https://drylake.com.au", token),
    unsubscribeUrl: unsubscribePageUrl("https://drylake.com.au", unsub),
    platform: null,
  };
  const email = renderReviewRequestEmail(input, "https://drylake.com.au");
  const withPlatform = renderReviewRequestEmail({ ...input, platform: { href: "https://www.google.com/maps/place/x/review", host: "google.com" } }, "https://drylake.com.au");
  const INCENTIVE = /discount|gift|voucher|\bfree\b|\bwin\b|prize|reward|incentive|raffle|draw\b|coupon|credit|\$\s?\d|\d+\s?% off|in return|in exchange|entered into|bonus|thank you gift/i;
  const POSITIVE_ONLY = /5[- ]?star|five[- ]?star|positive|glowing|great review|good review|highly rate|rate us|leave us a (great|positive|5)|recommend us|tell (your )?friends|if you (were )?(happy|satisfied|pleased)|love (it|us)/i;

  it("is neutral: honest feedback, good or bad, one clear action", () => {
    assert.equal(email.subject, REVIEW_EMAIL_SUBJECT);
    assert.equal(email.subject, "How did we do?");
    assert.match(email.text, /honest feedback/);
    assert.match(email.text, /good or bad/);
    assert.match(email.text, new RegExp(`feedback#t=${token}`));
  });

  it("offers nothing in return and does not steer toward praise", () => {
    for (const body of [email.subject, email.text, email.html, withPlatform.text, withPlatform.html]) {
      assert.ok(!INCENTIVE.test(body), body.match(INCENTIVE)?.[0]);
      assert.ok(!POSITIVE_ONLY.test(body), body.match(POSITIVE_ONLY)?.[0]);
    }
  });

  it("identifies the sender and carries a working unsubscribe link (Spam Act 2003)", () => {
    for (const body of [email.text, email.html]) {
      assert.match(body, /DRYLAKE PTY LTD/);
      assert.match(body, /ABN 70 702 662 557/);
      assert.match(body, new RegExp(`feedback/unsubscribe#t=${unsub}`));
      assert.match(body, /Unsubscribe/i);
    }
    assert.match(email.text, /hello@drylake\.com\.au/);
  });

  it("offers the external platform as a choice with no obligation, only when configured", () => {
    assert.match(withPlatform.text, /If you would rather leave a public review/);
    assert.match(withPlatform.text, /no obligation either way/i);
    assert.match(withPlatform.html, /google\.com/);
    assert.ok(!/public review/.test(email.text));
    assert.ok(!/public review/.test(email.html));
  });

  it("escapes the recipient's name and uses their first name", () => {
    assert.ok(!email.html.includes("<b>Tester</b>"));
    assert.equal(firstName("  Quinn Tester "), "Quinn");
    assert.equal(firstName(""), "there");
  });

  it("uses no em dash", () => {
    for (const part of [email.subject, email.html, email.text]) assert.ok(!part.includes(EM_DASH));
  });

  it("is sent with List-Unsubscribe headers and replies to the monitored inbox", () => {
    const source = code("lib/email/review-request.ts");
    assert.match(source, /"List-Unsubscribe": /);
    assert.match(source, /"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"/);
    assert.match(source, /replyTo: CONTACT_EMAIL/);
    assert.match(source, /redactSensitive\(error\.message\)/);
  });

  it("sender: Drylake Feedback on the verified address, override wins, fails loudly with none", () => {
    assert.equal(feedbackFromAddress({ EMAIL_FROM: "Drylake Billing <billing@mail.drylake.com.au>" }), "Drylake Feedback <billing@mail.drylake.com.au>");
    assert.equal(feedbackFromAddress({ FEEDBACK_EMAIL_FROM: "Drylake <feedback@drylake.com.au>", EMAIL_FROM: "a@b.au" }), "Drylake <feedback@drylake.com.au>");
    assert.throws(() => feedbackFromAddress({}), /Missing EMAIL_FROM/);
  });
});

describe("POST /api/feedback", () => {
  const route = code("app/api/feedback/route.ts");
  const at = (needle) => {
    const index = route.indexOf(needle);
    assert.ok(index >= 0, `${needle} missing`);
    return index;
  };

  it("checks size and type, then the input, then the rate limit, before touching the database", () => {
    assert.ok(at("readJsonBody(") < at("validateFeedbackInput("));
    assert.ok(at("validateFeedbackInput(") < at("limiter.take("));
    assert.ok(at("limiter.take(") < at("createAdminSupabaseClient()"));
    assert.match(route, /429/);
  });

  it("only ever sends the HASH of a token to the database", () => {
    assert.match(route, /p_token_hash: hashToken\(input\.token\)/);
    assert.match(route, /p_token_hash: hashToken\(submission\.token\)/);
    assert.ok(!/p_token_hash: (input|submission)\.token\b/.test(route));
  });

  it("spends the token in the database, not in the handler (single use)", () => {
    assert.match(route, /rpc\("review_submit_feedback"/);
    assert.ok(!/\.from\("review_requests"\)\.update/.test(route));
  });

  it("never takes the credited name or organisation from the browser", () => {
    assert.ok(!/display_name|display_organisation|p_display_name|p_display_organisation/.test(route));
    assert.match(route, /p_display_choice: submission\.displayChoice/);
  });

  it("logs error classes only, never the token or what the visitor wrote", () => {
    const logs = route.match(/console\.(error|warn|log)\([^;]*\);/gs) ?? [];
    assert.ok(logs.length >= 2);
    for (const log of logs) assert.ok(!/token|submission|comments|input\./.test(log), log);
  });

  it("answers no-store JSON and the single-use outcomes with their own statuses", () => {
    assert.match(route, /"Cache-Control": "no-store"/);
    assert.match(route, /SUBMIT_MESSAGES\[outcome\]/);
  });
});

describe("POST /api/feedback/unsubscribe", () => {
  const route = code("app/api/feedback/unsubscribe/route.ts");

  it("is POST only, so a scanner that fetches the link cannot unsubscribe anyone", () => {
    assert.match(route, /export async function POST/);
    assert.ok(!/export async function (GET|PUT|PATCH|DELETE)/.test(route));
  });

  it("accepts the token from the one-click query or the page's body, and checks its shape first", () => {
    assert.match(route, /searchParams\.get\("t"\)/);
    assert.match(route, /body\?\.token/);
    assert.ok(route.indexOf("validateUnsubscribeToken(") < route.indexOf("createAdminSupabaseClient()"));
  });

  it("is rate limited, hashes the token and never says whether an address is on the list", () => {
    assert.match(route, /limiter\.take\(/);
    assert.match(route, /p_unsubscribe_token_hash: hashToken\(token\)/);
    assert.match(route, /We could not find this unsubscribe link\./);
  });
});

describe("admin routes", () => {
  const gated = [
    "app/api/admin/reviews/requests/route.ts",
    "app/api/admin/reviews/requests/[requestId]/route.ts",
    "app/api/admin/reviews/feedback/[feedbackId]/route.ts",
  ];

  for (const file of gated) {
    it(`${file} authorises before reading input or creating the service-role client`, () => {
      const source = code(file);
      const gate = source.indexOf("authorizeAdminApi(");
      assert.ok(gate >= 0);
      assert.ok(gate < source.indexOf("readJsonBody("));
      assert.ok(gate < source.indexOf("createAdminSupabaseClient()"));
    });
  }

  it("a send requires confirm:true and re-derives eligibility on the server", () => {
    assert.match(code("app/api/admin/reviews/requests/route.ts"), /validateSendRequest\(/);
    const service = code("lib/reviews/service.ts");
    assert.match(service, /findCandidate\(candidates, params\.kind, params\.engagementId\)/);
    assert.ok(service.indexOf("candidate.blocked") < service.indexOf('rpc("review_create_request"'));
  });

  it("the duplicate guard and the suppression list are enforced by the database function", () => {
    const sql = read("supabase/migrations/20261016140000_review_requests.sql");
    assert.match(sql, /create unique index if not exists review_requests_engagement_recipient_uq/);
    assert.match(sql, /on conflict \(engagement_kind, engagement_id, \(lower\(recipient_email\)\)\) do nothing/);
    assert.match(sql, /review_suppressions s where s\.email_lower = v_email/);
  });

  it("every action writes the audit log with ids and state, never names, emails or comments", () => {
    const service = code("lib/reviews/service.ts");
    for (const action of ["review_request.sent", "review_request.failed", "review_request.retried", "review_request.withdrawn"]) {
      assert.ok(service.includes(`"${action}"`), action);
    }
    assert.match(service, /review_feedback\.\$\{/);
    const blocks = [...service.matchAll(/metadata: \{([^}]*)\}/g)].map((m) => m[1]);
    assert.ok(blocks.length >= 4);
    for (const block of blocks) assert.ok(!/email|name|comments|rating|token/i.test(block), block);
  });

  it("sent_at and sent_by record when and by whom", () => {
    const service = code("lib/reviews/service.ts");
    assert.match(service, /sent_at: new Date\(\)\.toISOString\(\)/);
    assert.match(service, /p_sent_by: params\.actorClerkUserId/);
  });

  it("a send that stopped between saving and emailing can be retried, so the duplicate guard never locks an engagement out", () => {
    const service = code("lib/reviews/service.ts");
    assert.match(service, /STUCK_QUEUE_MS = 5 \* 60_000/);
    assert.match(service, /row\.status === "queued" && Date\.now\(\) - new Date\(row\.created_at\)\.getTime\(\) > STUCK_QUEUE_MS/);
    assert.match(code("app/admin/reviews/[requestId]/page.tsx"), /stuckQueued/);
  });

  it("approval needs consent, text and no removal, in code and in the database", () => {
    const service = code("lib/reviews/service.ts");
    assert.match(service, /if \(!row\.publish_consent\) return "no_consent";/);
    assert.match(service, /if \(!row\.comments \|\| row\.removed_at\) return "nothing_to_publish";/);
    assert.match(read("supabase/migrations/20261016140000_review_requests.sql"), /review_feedback_approved_only_if_consented/);
  });

  it("negative feedback is never filtered from the admin view", () => {
    const list = code("app/admin/reviews/page.tsx");
    assert.ok(!/\.gte\("rating"|\.gt\("rating"|rating >=|rating >|\.eq\("approved"|\.eq\("publish_consent"/.test(list));
    assert.match(list, /Every submission is listed, whatever it says\./);
    assert.match(list, /External review platforms stay authoritative/);
  });

  it("both admin pages call requirePlatformAdmin before creating the service-role client", () => {
    for (const file of ["app/admin/reviews/page.tsx", "app/admin/reviews/[requestId]/page.tsx"]) {
      const source = code(file);
      assert.ok(source.indexOf("requirePlatformAdmin(") >= 0 && source.indexOf("requirePlatformAdmin(") < source.indexOf("createAdminSupabaseClient()"), file);
      assert.match(source, /export const dynamic = "force-dynamic"/);
    }
  });

  it("is in the admin navigation", () => {
    assert.match(read("components/admin/admin-nav.ts"), /href: "\/admin\/reviews"/);
  });

  it("the view helpers describe state honestly", () => {
    assert.equal(publicStateLabel({ rating: 5, comments: "x", publish_consent: false, approved: false, removed_at: null }), "Not for publication");
    assert.equal(publicStateLabel({ rating: 5, comments: "x", publish_consent: true, approved: false, removed_at: null }), "Awaiting your approval");
    assert.equal(publicStateLabel({ rating: 5, comments: "x", publish_consent: true, approved: true, removed_at: null }), "Shown on the public site");
    assert.equal(publicStateLabel({ rating: 5, comments: null, publish_consent: true, approved: false, removed_at: "2026-10-10" }), "Content removed");
    assert.equal(consentLabel({ publish_consent: false }), "Private (no publication consent)");
    assert.equal(ratingLabel(null), "No rating");
    assert.equal(ratingLabel(2), "2 out of 5");
    assert.ok(snippet("a ".repeat(200), 20).length <= 20);
    assert.match(actorTag("user_2abcdef123456"), /^admin \.\.\.123456$/);
  });
});

describe("the feedback pages", () => {
  it("are private: noindex meta, in PRIVATE_PREFIXES, never in the sitemap", () => {
    for (const file of ["app/feedback/page.tsx", "app/feedback/unsubscribe/page.tsx"]) {
      assert.match(code(file), /robots: \{ index: false, follow: false \}/, file);
    }
    assert.ok(PRIVATE_PREFIXES.includes("/feedback"));
    assert.ok(!PUBLIC_PAGES.some((p) => p.path.startsWith("/feedback")));
  });

  it("the form reads the token from the fragment and removes it from the address bar", () => {
    const form = code("components/reviews/FeedbackForm.tsx");
    assert.match(form, /window\.location\.hash/);
    assert.match(form, /history\.replaceState\(null, "", window\.location\.pathname\)/);
    assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(form));
    assert.ok(!/location\.search/.test(form));
  });

  it("publication consent is a separate, unticked, optional control with plain wording", () => {
    const form = code("components/reviews/FeedbackForm.tsx");
    assert.match(form, /useState\(false\)/);
    assert.match(form, /name="publish"/);
    assert.match(form, /This is separate from sending feedback, it is optional, and Drylake reviews it first\./);
    assert.match(form, /\{publish \? \(/);
  });

  it("nothing nudges toward a high rating or a positive comment", () => {
    const text = JSON.stringify([code("components/reviews/FeedbackForm.tsx"), code("app/feedback/page.tsx")]);
    assert.ok(!/positive|great review|5[- ]?star|five[- ]?star|rate us highly|we hope you/i.test(text));
    assert.match(text, /whether it is good or bad/);
    assert.match(text, /including the critical parts/);
  });

  it("unsubscribe posts from the page, so fetching the page alone changes nothing server-side", () => {
    const client = code("components/reviews/UnsubscribeClient.tsx");
    assert.match(client, /method: "POST"/);
    assert.match(client, /\/api\/feedback\/unsubscribe/);
  });

  it("no em dash in any visitor-facing string", () => {
    for (const file of [
      "components/reviews/FeedbackForm.tsx",
      "components/reviews/UnsubscribeClient.tsx",
      "components/reviews/ApprovedQuotes.tsx",
      "app/feedback/page.tsx",
      "app/feedback/unsubscribe/page.tsx",
      "lib/reviews/catalog.ts",
      "lib/email/review-request-email.ts",
    ]) {
      assert.ok(!read(file).includes(EM_DASH), file);
    }
  });
});

describe("migration", () => {
  const sql = read("supabase/migrations/20261016140000_review_requests.sql");

  it("is service-role only: RLS on, no policies, browser roles revoked, functions locked down", () => {
    for (const table of ["review_requests", "review_feedback", "review_suppressions"]) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(sql, new RegExp(`revoke all on public\\.${table} from %I`));
    }
    assert.ok(!/create policy/i.test(sql));
    assert.match(sql, /revoke all on function %s from public/);
    assert.match(sql, /grant execute on function %s to service_role/);
    assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 4);
  });

  it("stores only token hashes and cannot delete a request or suppression", () => {
    assert.match(sql, /token_hash text not null unique check \(token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
    assert.ok(!/\btoken text\b/.test(sql));
    assert.match(sql, /grant select, insert, update on public\.review_requests to service_role/);
    assert.match(sql, /grant select, insert on public\.review_suppressions to service_role/);
    assert.ok(!/grant[^;]*delete/i.test(sql));
  });

  it("the single-use lock is the row lock inside the submit function", () => {
    assert.match(sql, /where q\.token_hash = p_token_hash for update/);
    assert.match(sql, /update public\.review_requests set status = 'submitted', submitted_at = now\(\) where id = r\.id/);
  });

  it("is registered for the new env vars as optional", async () => {
    const { ENV_REGISTRY } = await import("../scripts/env-registry.mjs");
    for (const name of ["FEEDBACK_EMAIL_FROM", "REVIEW_PLATFORM_URL"]) {
      const entry = ENV_REGISTRY.find((e) => e.name === name);
      assert.ok(entry, name);
      assert.equal(entry.required, false);
      assert.equal(entry.exposure, "server");
    }
    assert.ok(existsSync(join(ROOT, "docs/operations/review-requests.md")));
    assert.ok(!sql.includes(EM_DASH));
  });
});
