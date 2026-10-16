/*
 * Workstream 2 security audit (docs/security/2026-10-16-security-audit.md): regression tests for
 * the code-level fixes made alongside the audit.
 *
 *  - provider error text is redacted before it is logged or stored (PII in logs)
 *  - the contact route has an in-app rate limit like the consultation routes
 *  - every API route is classified by how it authenticates (a new unclassified route fails)
 *  - Dependabot covers npm and GitHub Actions weekly; SECURITY.md points at security.txt
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { redactSensitive } from "../lib/security/redact.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(relative(ROOT, full).replaceAll("\\", "/"));
  }
  return out;
}

describe("redactSensitive (provider error text in logs and stored errors)", () => {
  it("removes email addresses", () => {
    const out = redactSensitive("Invalid `to` field: jane.doe+x@example.com.au is not allowed");
    assert.ok(!out.includes("jane.doe"), out);
    assert.ok(out.includes("[email]"), out);
  });

  it("removes phone-like numbers but keeps short codes and status numbers", () => {
    const out = redactSensitive("status 422 for +61 433 448 000 and 0433448000");
    assert.ok(!/433/.test(out), out);
    assert.ok(out.includes("422"), out);
  });

  it("removes bearer tokens and long token-like strings", () => {
    const out = redactSensitive("Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789 failed");
    assert.ok(!out.includes("abcdefghijklmnopqrstuvwxyz"), out);
  });

  it("truncates and collapses line breaks so a message cannot forge log lines", () => {
    const out = redactSensitive(`a\nb\r\n${"x ".repeat(400)}`);
    assert.ok(!/[\r\n]/.test(out));
    assert.ok(out.length <= 301, String(out.length));
  });

  it("keeps ordinary diagnostic text readable", () => {
    assert.equal(redactSensitive("Resend rate limit exceeded"), "Resend rate limit exceeded");
  });

  it("is safe on non-string input", () => {
    assert.equal(redactSensitive(undefined), "unknown error");
    assert.equal(redactSensitive(null), "unknown error");
  });

  it("is applied wherever a provider error message is logged or persisted", () => {
    for (const file of ["lib/consultations/dispatch.ts", "lib/consultations/calendar-sync.ts"]) {
      const source = stripComments(read(file));
      assert.match(source, /redactSensitive\(/, `${file} must redact provider error text`);
    }
    assert.match(stripComments(read("app/api/contact/route.ts")), /redactSensitive\(/);
  });
});

describe("contact route rate limit", () => {
  const source = stripComments(read("app/api/contact/route.ts"));

  it("uses the shared limiter and answers 429", () => {
    assert.match(source, /createRateLimiter\(/);
    assert.match(source, /limiter\.take\(/);
    assert.match(source, /429/);
  });

  it("limits after cheap validation and before Turnstile or any outbound call", () => {
    const take = source.indexOf("limiter.take(");
    assert.ok(take > source.indexOf("validateEnquiry("), "limit runs after field validation");
    assert.ok(take < source.indexOf("verifyTurnstile("), "limit runs before Turnstile");
    assert.ok(take < source.indexOf("deliverContactEnquiry("), "limit runs before email delivery");
  });
});

/*
 * How each route proves who is calling. Adding a route under app/api without classifying it
 * here fails the build, so no handler can ship with an unreviewed (absent) gate.
 */
const ROUTE_CLASSES = {
  "app/api/admin": "platform admin (authorizeAdminApi / isPlatformAdmin before input and service role)",
  "app/api/client/documents/[documentId]/download/route.ts": "Clerk session + client workspace + RLS read",
  "app/api/client/invitations/complete/route.ts": "Clerk session + verified-email invitation",
  "app/api/stripe/checkout/route.ts": "Clerk session + active organisation",
  "app/api/stripe/webhook/route.ts": "Stripe signature",
  "app/api/clerk/webhook/route.ts": "Svix signature",
  "app/api/cron/consultation-notifications/route.ts": "CRON_SECRET bearer, constant time",
  "app/api/contact/route.ts": "public: Turnstile + rate limit + validation",
  "app/api/feedback/route.ts": "public: single-use 256-bit token (hashed) + rate limit + validation",
  "app/api/feedback/unsubscribe/route.ts": "public: unsubscribe token (hashed) + rate limit, POST only",
  "app/api/collaboration/route.ts": "public: Turnstile (own action) + rate limit + validation",
  "app/api/consultations/route.ts": "public: Turnstile + rate limit + validation",
  "app/api/consultations/availability/route.ts": "public read: rate limit, no personal data",
  "app/api/consultations/manage/route.ts": "public: HMAC management token + rate limit",
  "app/api/health/route.ts": "public: no secrets, no variable names",
  "app/api/markdown/route.ts": "public: allowlisted public paths only",
};

describe("every API route is classified by how it authenticates", () => {
  const routes = walk(join(ROOT, "app/api"), (f) => f.endsWith("route.ts"));

  for (const route of routes) {
    it(route, () => {
      const known = Object.keys(ROUTE_CLASSES).some((key) => route === key || route.startsWith(`${key}/`));
      assert.ok(known, `${route} is not classified in tests/security-audit-2026-10-16.test.mjs`);
    });
  }

  it("the classification has no stale entries", () => {
    for (const key of Object.keys(ROUTE_CLASSES)) {
      assert.ok(routes.some((r) => r === key || r.startsWith(`${key}/`)), `stale classification: ${key}`);
    }
  });

  it("non-admin, non-public routes check a session or a signature before reading input", () => {
    const gated = {
      "app/api/client/documents/[documentId]/download/route.ts": "getClientWorkspace()",
      "app/api/client/invitations/complete/route.ts": "await auth()",
      "app/api/stripe/checkout/route.ts": "await auth()",
      "app/api/cron/consultation-notifications/route.ts": "authorised(request)",
    };
    for (const [file, gate] of Object.entries(gated)) {
      const source = stripComments(read(file));
      const gateAt = source.indexOf(gate);
      assert.ok(gateAt >= 0, `${file}: no ${gate}`);
      for (const later of ["request.json()", "request.formData()", "createAdminSupabaseClient()"]) {
        const at = source.indexOf(later);
        if (at >= 0) assert.ok(gateAt < at, `${file}: ${later} runs before ${gate}`);
      }
    }
  });
});

describe("repository security hygiene files", () => {
  it("dependabot covers npm and github-actions, both weekly", () => {
    const yml = read(".github/dependabot.yml");
    const blocks = yml.split(/\n\s*- package-ecosystem: /).slice(1);
    const byEcosystem = Object.fromEntries(blocks.map((b) => [b.split("\n")[0].trim(), b]));
    for (const ecosystem of ["npm", "github-actions"]) {
      assert.ok(byEcosystem[ecosystem], `${ecosystem} missing`);
      assert.match(byEcosystem[ecosystem], /interval:\s*weekly/, `${ecosystem} must be weekly`);
    }
  });

  it("SECURITY.md exists and points at the published security.txt and contact", () => {
    assert.ok(existsSync(join(ROOT, "SECURITY.md")), "SECURITY.md missing");
    const text = read("SECURITY.md");
    assert.match(text, /\.well-known\/security\.txt/);
    assert.match(text, /hello@drylake\.com\.au/);
    assert.ok(!text.includes("—"), "no em dashes");
  });

  it("the security docs exist", () => {
    for (const f of [
      "docs/security/2026-10-16-security-audit.md",
      "docs/security/incident-response.md",
      "docs/security/manual-verification-checklist.md",
    ]) {
      assert.ok(existsSync(join(ROOT, f)), `${f} missing`);
    }
  });
});
