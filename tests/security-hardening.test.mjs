/*
 * PR 2 security hardening regression tests (docs/security/README.md).
 *
 * Pure modules are tested directly; route wiring and confinement rules are checked
 * statically, the same way tests/tenant-isolation.test.mjs sweeps admin routes, because the
 * routes import Next and Clerk and cannot run under the plain node test runner.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import Stripe from "stripe";

import { safeReturnPath } from "../lib/auth/request-kind.ts";
import { MAX_REQUEST_BYTES, validateEnquiry } from "../lib/contact/validate-enquiry.ts";
import { verifyStripeWebhook, WEBHOOK_TOLERANCE_SECONDS } from "../lib/invoices/webhook-verification.ts";
import { CSP_DIRECTIVES } from "../lib/security/csp.ts";
import { isCrossSiteMutation } from "../lib/security/same-origin.ts";
import { hasExpectedSignature } from "../lib/validation/file-signature.ts";

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

const SITE = "https://drylake.com.au";
const req = (over) => ({
  method: "POST",
  pathname: "/api/admin/clients",
  requestOrigin: SITE,
  origin: SITE,
  secFetchSite: "same-origin",
  ...over,
});

describe("cross-site mutation refusal (CSRF defence in depth)", () => {
  it("allows our own pages to post", () => {
    assert.equal(isCrossSiteMutation(req()), false);
  });

  it("refuses a foreign Origin", () => {
    assert.equal(isCrossSiteMutation(req({ origin: "https://evil.example", secFetchSite: null })), true);
  });

  it("refuses a sibling subdomain (same-site is not same-origin)", () => {
    assert.equal(
      isCrossSiteMutation(req({ origin: "https://x.drylake.com.au", secFetchSite: "same-site" })),
      true
    );
  });

  it("refuses cross-site Fetch Metadata even without Origin", () => {
    assert.equal(isCrossSiteMutation(req({ origin: null, secFetchSite: "cross-site" })), true);
  });

  it("refuses the opaque null origin", () => {
    assert.equal(isCrossSiteMutation(req({ origin: "null", secFetchSite: null })), true);
  });

  it("does not touch safe methods, non-API paths or the Stripe webhook", () => {
    assert.equal(isCrossSiteMutation(req({ method: "GET", origin: "https://evil.example" })), false);
    assert.equal(isCrossSiteMutation(req({ pathname: "/sign-in", origin: "https://evil.example" })), false);
    assert.equal(
      isCrossSiteMutation(req({ pathname: "/api/stripe/webhook", origin: null, secFetchSite: "cross-site" })),
      false
    );
  });

  it("lets non-browser callers through to the handler's own auth (no cookies, not CSRF)", () => {
    assert.equal(isCrossSiteMutation(req({ origin: null, secFetchSite: null })), false);
  });

  it("is wired into the proxy before any route runs", () => {
    const proxy = read("proxy.ts");
    assert.match(proxy, /isCrossSiteMutation\(/);
    assert.match(proxy, /status: 403/);
    assert.ok(proxy.indexOf("isCrossSiteMutation(") < proxy.indexOf("isPrivatePage(request)"));
  });
});

describe("Content-Security-Policy additions", () => {
  it("adds the directives that cannot break Clerk, Stripe or Turnstile", () => {
    assert.deepEqual(CSP_DIRECTIVES["object-src"], ["none"]);
    assert.deepEqual(CSP_DIRECTIVES["base-uri"], ["self"]);
    assert.deepEqual(CSP_DIRECTIVES["frame-ancestors"], ["none"]);
    assert.ok(CSP_DIRECTIVES["frame-src"].includes("https://challenges.cloudflare.com"));
    assert.ok(CSP_DIRECTIVES["script-src"].includes("https://challenges.cloudflare.com"));
  });

  it("the proxy passes them to Clerk's policy builder", () => {
    assert.match(read("proxy.ts"), /directives: CSP_DIRECTIVES/);
  });

  it("the static headers keep HSTS, nosniff, frame denial and the referrer policy", () => {
    const config = read("next.config.ts");
    for (const header of [
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      assert.match(config, new RegExp(header));
    }
  });
});

describe("return paths after sign-in stay on this site", () => {
  it("keeps relative paths", () => {
    assert.equal(safeReturnPath("/client/billing/abc?x=1"), "/client/billing/abc?x=1");
  });

  it("refuses absolute, protocol-relative and backslash forms", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "evil", "", null, 42]) {
      assert.equal(safeReturnPath(value, "/portal"), "/portal", String(value));
    }
  });

  it("refuses control characters and whitespace that browsers strip into //host", () => {
    for (const value of ["/\t/evil.example", "/\n/evil.example", "/ /evil.example", "/\u0000x"]) {
      assert.equal(safeReturnPath(value, "/portal"), "/portal", JSON.stringify(value));
    }
  });

  it("signInUrl uses the same rule", () => {
    assert.match(read("lib/auth/guards.ts"), /safeReturnPath\(returnTo, "\/portal"\)/);
  });
});

describe("contact enquiry validation", () => {
  const good = {
    name: "Jane Citizen",
    email: "Jane@Example.com",
    company: "Acme Pty Ltd",
    projectType: "Automation",
    helpType: "Build a new system",
    message: "Line one\nLine two",
    turnstileToken: "token",
  };

  it("accepts a normal enquiry, multi-line message included", () => {
    const result = validateEnquiry(good);
    assert.equal(result.ok, true);
    assert.equal(result.fields.email, "jane@example.com");
    assert.equal(result.fields.message, "Line one\nLine two");
  });

  it("reads the kind of help from helpType, and from the legacy budget key sent by stale tabs", () => {
    assert.equal(validateEnquiry(good).fields.helpType, "Build a new system");

    const { helpType, ...legacy } = good;
    assert.equal(validateEnquiry({ ...legacy, budget: helpType }).fields.helpType, "Build a new system");
    assert.equal("budget" in validateEnquiry({ ...legacy, budget: helpType }).fields, false);
    assert.equal(validateEnquiry({ ...legacy, budget: "x".repeat(101) }).ok, false);
    assert.equal(validateEnquiry({ ...legacy, budget: "A\nBcc: x@evil.example" }).ok, false);
  });

  it("refuses line breaks in fields that reach the email Subject (header injection)", () => {
    for (const field of ["name", "company", "projectType", "helpType"]) {
      for (const lineBreak of ["\r\nBcc: x@evil.example", "\nX", "\u2028X"]) {
        const result = validateEnquiry({ ...good, [field]: `Jane${lineBreak}` });
        assert.equal(result.ok, false, `${field} ${JSON.stringify(lineBreak)}`);
      }
    }
  });

  it("refuses control characters, oversize fields, bad email and non-objects", () => {
    assert.equal(validateEnquiry({ ...good, message: "a\u0007b" }).ok, false);
    assert.equal(validateEnquiry({ ...good, message: "x".repeat(5001) }).ok, false);
    assert.equal(validateEnquiry({ ...good, email: "not-an-email" }).ok, false);
    assert.equal(validateEnquiry({ ...good, name: "" }).ok, false);
    assert.equal(validateEnquiry([good]).ok, false);
    assert.equal(validateEnquiry(null).ok, false);
  });

  it("the route enforces the byte limit on the body it actually read", () => {
    const route = read("app/api/contact/route.ts");
    assert.match(route, /await request\.text\(\)/);
    assert.match(route, /byteLength > MAX_REQUEST_BYTES/);
    assert.match(route, /validateEnquiry\(body\)/);
    assert.equal(MAX_REQUEST_BYTES, 10_000);
  });

  it("every enquiry value in the email HTML is escaped", async () => {
    // Behavioural, not a source match: escaping now lives in the shared email layout.
    const { renderEnquiryEmail } = await import("../lib/email/contact-enquiry-email.ts");
    const evil = '<img src=x onerror="alert(1)">';
    const { html } = renderEnquiryEmail(
      { name: evil, email: `${evil}@x.io`, company: evil, projectType: evil, helpType: evil, message: evil, receivedAt: evil,
        portal: { accountEmail: evil, workspaceName: evil, workspaceState: evil } },
      "https://drylake.com.au"
    );
    assert.equal(html.includes("<img src=x"), false);
    assert.equal(html.includes('onerror="'), false);
    assert.ok(html.split("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;").length >= 9, "all nine values escaped");
    assert.match(read("lib/email/contact-enquiry.ts"), /renderEnquiryEmail\(enquiry, appBaseUrl\(process\.env\)\)/);
  });
});

describe("uploaded document contents must match the declared type", () => {
  const bytes = (...values) => new Uint8Array(values);

  it("accepts real PDF, PNG and DOCX headers", () => {
    assert.ok(hasExpectedSignature("pdf", bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31)));
    assert.ok(hasExpectedSignature("png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)));
    assert.ok(hasExpectedSignature("docx", bytes(0x50, 0x4b, 0x03, 0x04, 0x14)));
  });

  it("refuses HTML renamed to .pdf, short files and unknown types", () => {
    assert.equal(hasExpectedSignature("pdf", new TextEncoder().encode("<html><script>")), false);
    assert.equal(hasExpectedSignature("png", bytes(0x89, 0x50)), false);
    assert.equal(hasExpectedSignature("exe", bytes(0x4d, 0x5a)), false);
  });

  it("the upload route checks the bytes before storing", () => {
    const route = read("app/api/admin/projects/[projectId]/documents/route.ts");
    assert.ok(route.indexOf("hasExpectedSignature(") > 0);
    assert.ok(route.indexOf("hasExpectedSignature(") < route.indexOf(".upload("));
  });
});

describe("Stripe webhook authentication", () => {
  const SECRET = "whsec_unit_test_not_real";
  const payload = JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test", object: "checkout.session" } },
  });
  const header = (body = payload, timestamp = Math.floor(Date.now() / 1000), secret = SECRET) =>
    Stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });

  it("accepts a correctly signed event", () => {
    const result = verifyStripeWebhook(payload, header(), SECRET);
    assert.equal(result.ok, true);
    assert.equal(result.event.id, "evt_test");
  });

  it("missing secret is a 500 (configuration), missing signature a 400", () => {
    assert.deepEqual(verifyStripeWebhook(payload, header(), undefined), {
      ok: false,
      status: 500,
      error: "Webhook is not configured",
    });
    assert.equal(verifyStripeWebhook(payload, null, SECRET).status, 400);
  });

  it("refuses a wrong secret, a tampered body and garbage", () => {
    assert.equal(verifyStripeWebhook(payload, header(payload, undefined, "whsec_other"), SECRET).status, 400);
    assert.equal(verifyStripeWebhook(payload.replace("evt_test", "evt_evil"), header(), SECRET).status, 400);
    assert.equal(verifyStripeWebhook(payload, "t=1,v1=deadbeef", SECRET).status, 400);
  });

  it("refuses a replay of a captured delivery outside the tolerance window", () => {
    const old = Math.floor(Date.now() / 1000) - WEBHOOK_TOLERANCE_SECONDS - 60;
    assert.equal(verifyStripeWebhook(payload, header(payload, old), SECRET).status, 400);
  });

  it("the route verifies the raw body before anything else", () => {
    const route = stripComments(read("app/api/stripe/webhook/route.ts"));
    assert.ok(!/request\.json\(\)/.test(route));
    assert.ok(route.indexOf("verifyStripeWebhook(") < route.indexOf("handleEvent(event)"));
    assert.ok(!/console\.\w+\([^)]*\bbody\b/.test(route), "never log the raw body");
  });

  it("only the webhook marks an invoice PAID", () => {
    const writers = walk(join(ROOT, "app"), (f) => f.endsWith(".ts") || f.endsWith(".tsx")).filter((file) =>
      /status:\s*"PAID"/.test(stripComments(read(file)))
    );
    assert.deepEqual(writers, ["app/api/stripe/webhook/route.ts"]);
  });
});

describe("admin API routes authorize before touching input or the service role", () => {
  const routes = walk(join(ROOT, "app/api/admin"), (f) => f.endsWith("route.ts"));

  for (const route of routes) {
    it(route, () => {
      const source = stripComments(read(route));
      const gate = Math.min(
        ...["authorizeAdminApi(", "isPlatformAdmin()"].map((t) => source.indexOf(t)).filter((i) => i >= 0)
      );
      assert.ok(Number.isFinite(gate), "no admin gate");
      for (const later of ["createAdminSupabaseClient()", "request.formData()", "request.json()"]) {
        const at = source.indexOf(later);
        if (at >= 0) assert.ok(gate < at, `${later} runs before the admin check`);
      }
    });
  }
});

describe("service-role and secret confinement", () => {
  const sources = walk(ROOT, (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts")).filter(
    (f) => !f.startsWith("tests/") && !f.startsWith("scripts/")
  );

  /* lib/reviews/public.ts is the one reviewed exception outside routes and admin pages: it serves the
   public "What people say" section and selects ONLY the display columns of rows that are consented,
   approved and not removed (it returns [] on any failure). It is server-only and tested in
   tests/review-requests.test.mjs. */
  const ALLOWED_SERVICE_ROLE = /^(app\/api\/|app\/admin\/|lib\/auth\/client-context\.ts$|lib\/auth\/platform-admin\.ts$|lib\/supabase\/admin\.ts$|lib\/reviews\/public\.ts$)/;

  it("the service-role client is created only in server routes, admin pages and the two auth helpers", () => {
    const users = sources.filter((f) => /createAdminSupabaseClient\(/.test(read(f)));
    const outside = users.filter((f) => !ALLOWED_SERVICE_ROLE.test(f));
    assert.deepEqual(outside, []);
  });

  it("lib/supabase/admin.ts, lib/stripe.ts and the email senders are server-only", () => {
    for (const file of ["lib/supabase/admin.ts", "lib/stripe.ts", "lib/email/resend.ts", "lib/email/contact-enquiry.ts"]) {
      assert.match(read(file), /^import "server-only";/m, file);
    }
  });

  it("no client component imports a server secret holder", () => {
    const clientFiles = sources.filter((f) => /^\s*["']use client["'];?/m.test(read(f)));
    assert.ok(clientFiles.length > 0);
    for (const file of clientFiles) {
      const source = read(file);
      assert.ok(
        !/lib\/supabase\/admin|lib\/stripe["']|lib\/email\/|process\.env\.(?!NEXT_PUBLIC_)[A-Z_]+/.test(source),
        `${file} reaches a server-only secret`
      );
    }
  });

  it("no secret is given a browser-visible NEXT_PUBLIC_ name", () => {
    const names = new Set();
    for (const file of sources) {
      for (const match of read(file).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) names.add(match[0]);
    }
    const leaking = [...names].filter((name) => /SECRET|SERVICE_ROLE|PRIVATE|WEBHOOK|API_KEY/.test(name));
    assert.deepEqual(leaking, []);
  });

  it("raw HTML is injected in exactly one place, and it escapes '<'", () => {
    const users = sources.filter((f) => /dangerouslySetInnerHTML/.test(read(f)));
    assert.deepEqual(users, ["components/seo/JsonLd.tsx"]);
    assert.match(read("lib/discovery/structured-data.ts"), /\.replace\(\/<\/g, "\\\\u003c"\)/);
  });
});
