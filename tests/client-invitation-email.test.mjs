/*
 * Branded client invitation email (lib/email/client-invitation-email.ts) and the Clerk webhook
 * that sends it (app/api/clerk/webhook/route.ts), plus the business phone constant it shares
 * with the site. Runs under `npm test` (node:test), no new dependencies.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  INVITATION_SUBJECT,
  WORKSPACE_HIGHLIGHTS,
  buildInvitationEmail,
  clerkFrontendApiHost,
  emailEventDecision,
  safeEmailEventShape,
  isOurInvitationEmail,
  isTrustedAcceptUrl,
  personalise,
  readClerkEmailEvent,
  renderInvitationEmail,
} from "../lib/email/client-invitation-email.ts";
import { CROSS_SITE_EXEMPT_PATHS, isCrossSiteMutation } from "../lib/security/same-origin.ts";
import { BUSINESS_PHONE } from "../lib/site.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(ROOT, file), "utf8");

const ACCEPT = "https://clerk.drylake.com.au/v1/tickets/accept?ticket=abc.def.ghi";
const APP = "https://drylake.com.au";
const PK = `pk_live_${Buffer.from("clerk.drylake.com.au$").toString("base64")}`;

function clerkEvent(overrides = {}, data = {}) {
  return readClerkEmailEvent({
    id: "ema_123",
    object: "email",
    slug: "organization_invitation",
    to_email_address: "Owner@Client.com.au",
    delivered_by_clerk: false,
    subject: "You have been invited",
    body: "<p>clerk original</p>",
    body_plain: "clerk original",
    data: { action_url: ACCEPT, org: { name: "Acme Plumbing" }, ...data },
    ...overrides,
  });
}

function build(event, contacts = []) {
  return buildInvitationEmail({
    event,
    contacts,
    appBaseUrl: APP,
    clerkHost: clerkFrontendApiHost(PK),
    defaultExpiryDays: 14,
    year: 2026,
  });
}

const rendered = renderInvitationEmail({
  organizationName: "Acme <Plumbing> & Co",
  recipientFirstName: "Sam",
  acceptUrl: ACCEPT,
  logoUrl: `${APP}/brand/drylake-lockup-dark-bg.png`,
  expiresInDays: 14,
  year: 2026,
});

describe("business phone number", () => {
  it("is the official line in every format", () => {
    assert.deepEqual({ ...BUSINESS_PHONE }, {
      display: "0433 448 000",
      international: "+61 433 448 000",
      href: "tel:+61433448000",
    });
  });

  it("every public contact surface reads the shared constant, not a literal", () => {
    for (const file of ["components/layout/Footer.tsx", "components/sections/ContactCTA.tsx", "app/contact/page.tsx"]) {
      const source = read(file);
      assert.match(source, /href=\{BUSINESS_PHONE\.href\}/, file);
      assert.match(source, /\{BUSINESS_PHONE\.display\}/, file);
      assert.ok(!/tel:\+61\d/.test(source), `${file} hard-codes a tel: link`);
    }
  });

  it("the founder mobile it replaced appears nowhere in shipped code", () => {
    for (const file of ["lib/faqs.ts", "lib/site.ts", "lib/discovery/entity.ts", "lib/discovery/llms.ts",
      "components/layout/Footer.tsx", "components/sections/ContactCTA.tsx", "app/contact/page.tsx"]) {
      assert.ok(!/420 ?565 ?457|420565457/.test(read(file)), file);
    }
  });
});

describe("invitation email content", () => {
  it("uses the approved subject, header, eyebrow, headline, button and footer", () => {
    assert.equal(rendered.subject, "Your Drylake client workspace is ready");
    for (const phrase of [
      "DRYLAKE TECHNOLOGIES",
      "YOU’RE INVITED",
      "Your workspace is ready.",
      "Your workspace brings everything together in one secure place",
      "Activate your workspace",
      "Need assistance?",
      "hello@drylake.com.au",
      "0433 448 000",
      "Drylake Pty Ltd",
      "Perth, Western Australia",
      "© 2026 Drylake Pty Ltd",
      ...WORKSPACE_HIGHLIGHTS,
    ]) {
      assert.ok(rendered.html.includes(phrase), `html missing ${phrase}`);
      assert.ok(rendered.text.includes(phrase), `text missing ${phrase}`);
    }
  });

  it("names the organisation and greets the recipient, escaped", () => {
    assert.ok(rendered.html.includes("client workspace for Acme &lt;Plumbing&gt; &amp; Co."));
    assert.ok(!rendered.html.includes("<Plumbing>"));
    assert.ok(rendered.html.includes("Hi Sam,"));
    assert.ok(rendered.text.includes("client workspace for Acme <Plumbing> & Co."));
  });

  it("falls back to neutral wording without a name or organisation", () => {
    const plain = renderInvitationEmail({ organizationName: null, recipientFirstName: null, acceptUrl: ACCEPT, logoUrl: "x", expiresInDays: 14, year: 2026 });
    assert.ok(plain.html.includes("Hello,"));
    assert.ok(plain.html.includes("access your dedicated Drylake client workspace."));
    assert.ok(!plain.html.includes(" for null"));
  });

  it("button and fallback link are the same Clerk accept URL; expiry is stated", () => {
    const hrefs = [...rendered.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith("https://"));
    assert.deepEqual(hrefs, [ACCEPT, ACCEPT]);
    assert.ok(rendered.html.includes(`>${ACCEPT}</a>`), "visible fallback link");
    assert.ok(rendered.html.includes("expires in 14 days"));
    assert.ok(rendered.html.includes(`href="${BUSINESS_PHONE.href}"`));
  });

  it("is email-client safe: tables, inline brand colours, PNG logo, dark scheme, no em dash", () => {
    assert.match(rendered.html, /<table role="presentation"/);
    assert.match(rendered.html, /bgcolor="#f26a2e"/);
    assert.match(rendered.html, /<meta name="color-scheme" content="dark">/);
    assert.match(rendered.html, /<img src="https:\/\/drylake\.com\.au\/brand\/drylake-lockup-dark-bg\.png" width="160" height="40" alt="Drylake"/);
    assert.match(rendered.html, /<!--\[if mso\]>/);
    assert.ok(!/class="[^"]*"[^>]*style=""/.test(rendered.html));
    assert.ok(!rendered.html.includes("—") && !rendered.text.includes("—"));
    // Button text is ink on signal orange (about 6.9:1), not white (about 3:1).
    assert.match(rendered.html, /color:#0b0b0a;text-decoration:none;border-radius:12px;">Activate your workspace/);
  });

  it("the logo it references is published by the site", () => {
    const png = readFileSync(join(ROOT, "public/brand/drylake-lockup-dark-bg.png"));
    assert.equal(png.readUInt32BE(0), 0x89504e47);
    assert.equal(png.readUInt32BE(16) / png.readUInt32BE(20), 4, "160x40 display keeps the 4:1 ratio");
  });
});

describe("accept link trust", () => {
  it("decodes the Clerk Frontend API host from the publishable key", () => {
    assert.equal(clerkFrontendApiHost(PK), "clerk.drylake.com.au");
    assert.equal(clerkFrontendApiHost(`pk_test_${Buffer.from("fun-cat-1.clerk.accounts.dev$").toString("base64")}`), "fun-cat-1.clerk.accounts.dev");
    assert.equal(clerkFrontendApiHost("sk_live_nope"), null);
    assert.equal(clerkFrontendApiHost(undefined), null);
  });

  it("accepts only https links on our domain or the Clerk host", () => {
    const allowed = { appHost: "drylake.com.au", clerkHost: "fun-cat-1.clerk.accounts.dev" };
    assert.ok(isTrustedAcceptUrl(ACCEPT, allowed));
    assert.ok(isTrustedAcceptUrl("https://accounts.drylake.com.au/sign-up?__clerk_ticket=x", allowed));
    assert.ok(isTrustedAcceptUrl("https://fun-cat-1.clerk.accounts.dev/v1/tickets/accept?ticket=x", allowed));
    for (const bad of [
      "http://clerk.drylake.com.au/v1/tickets/accept",
      "https://drylake.com.au.evil.example/accept",
      "https://evildrylake.com.au/accept",
      "https://user:pw@clerk.drylake.com.au/",
      "javascript:alert(1)",
      "not a url",
      42,
      null,
    ]) {
      assert.ok(!isTrustedAcceptUrl(bad, allowed), String(bad));
    }
  });
});

describe("webhook event handling", () => {
  it("only an undelivered organisation invitation is ours", () => {
    assert.ok(isOurInvitationEmail(clerkEvent()));
    assert.ok(!isOurInvitationEmail(clerkEvent({ delivered_by_clerk: true })), "Clerk already sent it");
    assert.ok(!isOurInvitationEmail(clerkEvent({ slug: "verification_code" })));
    assert.ok(!isOurInvitationEmail(clerkEvent({ slug: "organization_invitation_accepted" })));
    assert.ok(!isOurInvitationEmail(clerkEvent({ to_email_address: undefined })));
    assert.equal(readClerkEmailEvent({ slug: "x" }), null, "no id");
    assert.equal(clerkEvent().toEmailAddress, "owner@client.com.au");
  });

  it("builds the branded email from Clerk's link and organisation name", () => {
    const plan = build(clerkEvent(), [{ name: "Acme Plumbing", billing_contact_name: "Sam  Taylor" }]);
    assert.equal(plan.kind, "branded");
    assert.equal(plan.email.subject, INVITATION_SUBJECT);
    assert.ok(plan.email.html.includes("for Acme Plumbing."));
    assert.ok(plan.email.html.includes("Hi Sam,"));
    assert.ok(plan.email.html.includes("https://drylake.com.au/brand/drylake-lockup-dark-bg.png"));
  });

  it("uses Clerk's expiry when present, else the configured 14 days", () => {
    assert.ok(build(clerkEvent({}, { invitation: { expires_in_days: 7 } })).email.html.includes("expires in 7 days"));
    assert.ok(build(clerkEvent()).email.html.includes("expires in 14 days"));
  });

  it("personalises only from an unambiguous match", () => {
    assert.deepEqual(personalise("Acme", [{ name: "Other Co", billing_contact_name: "Lee" }]), { organizationName: "Acme", recipientFirstName: null });
    assert.deepEqual(personalise(null, [{ name: "A", billing_contact_name: "Lee" }, { name: "B", billing_contact_name: "Kim" }]), { organizationName: null, recipientFirstName: null });
    assert.deepEqual(personalise(null, [{ name: "Solo Pty Ltd", billing_contact_name: "Kim Ng" }]), { organizationName: "Solo Pty Ltd", recipientFirstName: "Kim" });
  });

  it("an untrusted or missing link falls back to Clerk's original message, never a foreign button", () => {
    const plan = build(clerkEvent({}, { action_url: "https://evil.example/steal" }));
    assert.equal(plan.kind, "clerk-original");
    assert.equal(plan.email.html, "<p>clerk original</p>");
    assert.equal(build(clerkEvent({ body: undefined }, { action_url: undefined })).kind, "undeliverable");
  });

  it("the route verifies the signature first, sends idempotently, and logs no personal data", () => {
    const route = read("app/api/clerk/webhook/route.ts");
    const code = route.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(code.indexOf("verifyWebhook(request)") < code.indexOf("readClerkEmailEvent("));
    assert.ok(!/request\.json\(\)/.test(code));
    assert.match(code, /idempotencyKey: `clerk-email\/\$\{email\.id\}`/);
    assert.match(code, /replyTo: CONTACT_EMAIL/);
    assert.match(code, /status:?\s*400|, 400\)/);
    for (const call of code.match(/console\.\w+\([\s\S]*?\);/g) ?? []) {
      assert.ok(!/toEmailAddress|acceptUrl|action_url|html|event\.data/.test(call), call);
    }
  });

  it("every skip has a named reason", () => {
    assert.deepEqual(emailEventDecision(clerkEvent()), { handle: true });
    assert.deepEqual(emailEventDecision(null), { handle: false, reason: "malformed_event" });
    assert.deepEqual(emailEventDecision(clerkEvent({ slug: "verification_code" })), { handle: false, reason: "other_template" });
    assert.deepEqual(emailEventDecision(clerkEvent({ delivered_by_clerk: true })), { handle: false, reason: "delivered_by_clerk" });
    assert.deepEqual(emailEventDecision(clerkEvent({ to_email_address: "" })), { handle: false, reason: "no_recipient" });
  });

  it("diagnostic shape carries names and flags only, never the address, link, ticket or body", () => {
    const raw = {
      id: "ema_1", slug: "organization_invitation", delivered_by_clerk: false,
      to_email_address: "owner@client.com.au", subject: "Secret subject", body: "<a href='https://clerk.drylake.com.au/v1/tickets/accept?ticket=SECRET'>x</a>",
      data: { action_url: "https://clerk.drylake.com.au/v1/tickets/accept?ticket=SECRET", org: { name: "Acme", image_url: "https://img" }, "bad key!": 1 },
    };
    const shape = safeEmailEventShape(raw);
    assert.deepEqual(shape, {
      slug: "organization_invitation",
      deliveredByClerk: "false",
      hasRecipient: true,
      hasBody: true,
      dataKeys: ["action_url", "org", "org.image_url", "org.name"],
    });
    assert.ok(!/SECRET|owner@|client\.com\.au|Acme|Secret subject|https?:/.test(JSON.stringify(shape)));
    assert.equal(safeEmailEventShape({ id: "x" }).deliveredByClerk, "absent");
    assert.equal(safeEmailEventShape({ id: "x", delivered_by_clerk: "false" }).deliveredByClerk, "type:string");
    assert.equal(safeEmailEventShape({ id: "x", slug: "<script>" }).slug, "unrecognised");
  });

  it("the route returns and logs the skip reason instead of a bare handled:false", () => {
    const code = read("app/api/clerk/webhook/route.ts");
    assert.ok(!/handled: false \}\)/.test(code), "every handled:false response names a reason");
    assert.match(code, /console\.info\("Clerk webhook skipped\.", \{[\s\S]*?reason,[\s\S]*?\.\.\.shape,/);
    assert.match(code, /request\.headers\.get\("svix-id"\)/);
  });

  it("the webhook is a signature-authenticated cross-site sender", () => {
    assert.ok(CROSS_SITE_EXEMPT_PATHS.has("/api/clerk/webhook"));
    assert.equal(isCrossSiteMutation({ method: "POST", pathname: "/api/clerk/webhook", requestOrigin: APP, origin: null, secFetchSite: "cross-site" }), false);
  });
});
