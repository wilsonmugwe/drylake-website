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
  });
}

const rendered = renderInvitationEmail({
  organizationName: "Acme <Plumbing> & Co",
  recipientFirstName: "Sam",
  acceptUrl: ACCEPT,
  assetOrigin: APP,
  expiresInDays: 14,
});
const visibleText = (html) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ");

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
  it("uses the approved subject, eyebrow, headline, button, fallback and footer", () => {
    assert.equal(rendered.subject, "Your Drylake client workspace is ready");
    for (const phrase of [
      "You’re invited",
      "Your workspace is ready.",
      "Your workspace brings everything together in one secure place",
      "Activate your workspace",
      "Need assistance?",
      "hello@drylake.com.au",
      "0433 448 000",
      "drylake.com.au",
      "Drylake Pty Ltd",
      "Perth, Western Australia",
      ...WORKSPACE_HIGHLIGHTS,
    ]) {
      assert.ok(rendered.html.includes(phrase), `html missing ${phrase}`);
      assert.ok(rendered.text.includes(phrase), `text missing ${phrase}`);
    }
    assert.ok(rendered.html.includes("Button not working? <a "));
    assert.ok(rendered.html.includes(">Open your invitation in your browser</a>."));
  });

  it("has no 'DRYLAKE TECHNOLOGIES' label anywhere", () => {
    assert.ok(!/technologies/i.test(rendered.html));
    assert.ok(!/technologies/i.test(rendered.text));
  });

  it("names the organisation and greets the recipient, escaped", () => {
    assert.ok(rendered.html.includes("client workspace for Acme &lt;Plumbing&gt; &amp; Co."));
    assert.ok(!rendered.html.includes("<Plumbing>"));
    assert.ok(rendered.html.includes("Hi Sam,"));
    assert.ok(rendered.text.includes("client workspace for Acme <Plumbing> & Co."));
  });

  it("falls back to neutral wording without a name or organisation", () => {
    const plain = renderInvitationEmail({ organizationName: null, recipientFirstName: null, acceptUrl: ACCEPT, assetOrigin: APP, expiresInDays: 14 });
    assert.ok(plain.html.includes("Hello,"));
    assert.ok(plain.html.includes("access your dedicated Drylake client workspace."));
    assert.ok(!plain.html.includes(" for null"));
  });

  it("button and fallback hyperlink carry the Clerk accept URL; the URL is never printed in HTML", () => {
    const hrefs = [...rendered.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs.filter((h) => h.includes("/tickets/")), [ACCEPT, ACCEPT], "button + fallback link");
    assert.ok(!visibleText(rendered.html).includes("ticket="), "no ticket in visible text");
    assert.ok(!visibleText(rendered.html).includes("clerk.drylake.com.au"), "no Clerk host in visible text");
    // Plain text has no hyperlinks, so the URL is the only way to carry the link there.
    assert.ok(rendered.text.split("\n").includes(ACCEPT));
    assert.ok(rendered.html.includes("expires in 14 days"));
    assert.ok(rendered.html.includes(`href="${BUSINESS_PHONE.href}"`));
  });

  it("is email-client safe: tables, inline brand colours, opaque dark-wordmark logo, light scheme, no em dash", () => {
    assert.match(rendered.html, /<table role="presentation"/);
    assert.match(rendered.html, /bgcolor="#f26a2e"/);
    assert.match(rendered.html, /<meta name="color-scheme" content="light">/);
    assert.match(rendered.html, /<img src="https:\/\/drylake\.com\.au\/brand\/drylake-email-logo-light\.png" width="140" height="36" alt="Drylake"/);
    assert.ok(!rendered.html.includes("lockup-dark-bg"), "never the light-wordmark artwork");
    assert.match(rendered.html, /<!--\[if mso\]>/);
    assert.ok(!rendered.html.includes("—") && !rendered.text.includes("—"));
    // Button text is ink on signal orange (about 6.9:1), not white (about 3:1).
    assert.match(rendered.html, /color:#0b0b0a;text-decoration:none;border-radius:10px;">Activate your workspace/);
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
    assert.ok(plan.email.html.includes("https://drylake.com.au/brand/drylake-email-logo-light.png"));
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
    assert.match(code, /log\("Clerk webhook skipped\.", \{[\s\S]*?reason,[\s\S]*?\.\.\.shape,/);
    assert.match(code, /request\.headers\.get\("svix-id"\)/);
    assert.match(code, /reason === "delivered_by_clerk" \? console\.warn : console\.info/);
    for (const call of code.match(/\blog\([\s\S]*?\);/g) ?? []) {
      assert.ok(!/toEmailAddress|acceptUrl|action_url|html|event\.data/.test(call), call);
    }
  });
});

/*
 * Regression: production delivery 01M4FSJHWRY8X57PKDK4XJC3WF, 9 Oct 2026 15:38:21 AWST, returned
 * {"received":true,"handled":false}. Verified in the Clerk Dashboard (production instance):
 *   - the event was the organisation invitation for test org ABCDE (org created 15:38:20, invite
 *     pending, 14-day expiry, no inviter: our admin flow);
 *   - Clerk's template slug is `organization_invitation` (Dashboard path .../email/organization_invitation/edit);
 *   - the subject template is "Invitation to join {{org.name}}", so the org name is at data.org.name;
 *   - "Delivered by Clerk" was ON for Organization invitation and OFF for the application-level
 *     "Invitation" template (slug `invitation`): the toggle was switched on the wrong template.
 * The payload body itself sits in Svix's cross-origin log panel and could not be opened, so the
 * fixture below is the documented EmailJSON shape with those verified values, redacted.
 */
describe("regression: 9 Oct 2026 production skip", () => {
  const production = (deliveredByClerk) => ({
    object: "email",
    id: "ema_REDACTED",
    slug: "organization_invitation",
    from_email_name: "invitations",
    to_email_address: "redacted@gmail.com",
    email_address_id: null,
    user_id: null,
    subject: "Invitation to join ABCDE",
    body: "<html>REDACTED Clerk body</html>",
    body_plain: "REDACTED",
    status: "queued",
    delivered_by_clerk: deliveredByClerk,
    data: {
      action_url: "https://clerk.drylake.com.au/v1/tickets/accept?ticket=REDACTED",
      app: { name: "Drylake Technologies", domain_name: "drylake.com.au" },
      org: { name: "ABCDE" },
      invitation: { expires_in_days: 14 },
    },
  });

  it("with Delivered by Clerk ON (the production state) it is skipped as delivered_by_clerk, never sent twice", () => {
    const event = readClerkEmailEvent(production(true));
    assert.deepEqual(emailEventDecision(event), { handle: false, reason: "delivered_by_clerk" });
    assert.equal(safeEmailEventShape(production(true)).deliveredByClerk, "true");
  });

  it("with Delivered by Clerk OFF (the intended state) it is handled and branded for the right org", () => {
    const event = readClerkEmailEvent(production(false));
    assert.deepEqual(emailEventDecision(event), { handle: true });
    const plan = build(event);
    assert.equal(plan.kind, "branded");
    assert.ok(plan.email.html.includes("client workspace for ABCDE."));
    assert.ok(plan.email.html.includes('href="https://clerk.drylake.com.au/v1/tickets/accept?ticket=REDACTED"'));
    assert.ok(plan.email.html.includes("expires in 14 days"));
  });

  it("the application-level `invitation` template is never mistaken for a client invitation", () => {
    const appInvite = readClerkEmailEvent({ ...production(false), slug: "invitation" });
    assert.deepEqual(emailEventDecision(appInvite), { handle: false, reason: "other_template" });
  });

  it("the webhook is a signature-authenticated cross-site sender", () => {
    assert.ok(CROSS_SITE_EXEMPT_PATHS.has("/api/clerk/webhook"));
    assert.equal(isCrossSiteMutation({ method: "POST", pathname: "/api/clerk/webhook", requestOrigin: APP, origin: null, secFetchSite: "cross-site" }), false);
  });
});
