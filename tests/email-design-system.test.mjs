/*
 * Drylake email design system (lib/email/layout.ts) and every application-sent email built on
 * it: client invitation, invoice (issued / reminder / overdue, with and without GST) and the
 * enquiry notification. Runs under `npm test` (node:test), no new dependencies.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { renderInvitationEmail } from "../lib/email/client-invitation-email.ts";
import { renderEnquiryEmail } from "../lib/email/contact-enquiry-email.ts";
import { renderInvoiceEmail } from "../lib/email/invoice-email.ts";
import { EMAIL_COLORS, EMAIL_LOGO_PATH, EMAIL_LOGO_SIZE, fallbackLink, textFooter } from "../lib/email/layout.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(ROOT, file), "utf8");
const APP = "https://drylake.com.au";
const TICKET_URL = `https://clerk.drylake.com.au/v1/tickets/accept?ticket=${"x".repeat(600)}`;

const invoiceInput = (overrides = {}) => ({
  kind: "ISSUED", invoiceNumber: "DL-0042", organizationName: "Acme Care", contactName: "Sam",
  projectName: "Website", currency: "AUD", subtotalCents: 100000, taxCents: 10000, totalCents: 110000,
  dueDate: "2026-10-20", overdue: false, portalUrl: `${APP}/client/billing/11111111-2222-4333-8444-555555555555`,
  ...overrides,
});

const enquiry = (overrides = {}) => ({
  name: "Lee <script>", email: "lee@example.com", company: "Lee & Co", projectType: "Client portal",
  helpType: "Build", message: "Line one\nLine <two> & three", receivedAt: "9 Oct 2026, 4:00 pm", portal: null,
  ...overrides,
});

const EMAILS = {
  invitation: renderInvitationEmail({ organizationName: "Acme Care", recipientFirstName: "Sam", acceptUrl: TICKET_URL, assetOrigin: APP, expiresInDays: 14 }),
  invoiceIssued: renderInvoiceEmail(invoiceInput()),
  invoiceNoGst: renderInvoiceEmail(invoiceInput({ taxCents: 0, totalCents: 100000 })),
  invoiceReminder: renderInvoiceEmail(invoiceInput({ kind: "REMINDER" })),
  invoiceOverdue: renderInvoiceEmail(invoiceInput({ kind: "REMINDER", overdue: true })),
  enquiryWebsite: renderEnquiryEmail(enquiry(), APP),
  enquiryClient: renderEnquiryEmail(enquiry({ portal: { accountEmail: "a@b.co", workspaceName: "Acme", workspaceState: "active" } }), APP),
};

const visibleText = (html) =>
  html.replace(/<head>[\s\S]*?<\/head>/, "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ");

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("one design system for every application-sent email", () => {
  it("every renderer builds on renderEmailLayout; no file hand-rolls its own HTML shell or escaping", () => {
    const files = readdirSync(join(ROOT, "lib/email")).filter((f) => f.endsWith(".ts") && f !== "layout.ts");
    for (const file of files) {
      const source = read(`lib/email/${file}`);
      assert.ok(!/<!doctype html/i.test(source), `${file} renders its own document`);
      assert.ok(!/replaceAll\("&", "&amp;"\)|replace\(\/&\/g/.test(source), `${file} has its own escapeHtml`);
    }
    for (const file of ["client-invitation-email.ts", "invoice-email.ts", "contact-enquiry-email.ts", "consultation-emails.ts"]) {
      assert.match(read(`lib/email/${file}`), /renderEmailLayout\(/, file);
    }
  });

  for (const [name, email] of Object.entries(EMAILS)) {
    it(`${name}: shared header logo, standard footer, light scheme, plain-text part, no em dash`, () => {
      assert.ok(email.html.includes(`${APP}${EMAIL_LOGO_PATH}`), "logo");
      assert.ok(email.html.includes(`width="${EMAIL_LOGO_SIZE.width}" height="${EMAIL_LOGO_SIZE.height}" alt="Drylake"`));
      for (const item of ["Drylake Pty Ltd", "Perth, Western Australia", "hello@drylake.com.au", "0433 448 000", "drylake.com.au"]) {
        assert.ok(email.html.includes(item), `html footer missing ${item}`);
        assert.ok(email.text.includes(item) || name.startsWith("enquiry"), `text footer missing ${item}`);
      }
      assert.match(email.html, /<meta name="color-scheme" content="light">/);
      assert.ok(!/technologies/i.test(email.html), "no 'Technologies' label");
      assert.ok(email.text.length > 50, "plain-text alternative");
      assert.ok(!`${email.subject}${email.html}${email.text}`.includes("—"), "em dash");
    });

    it(`${name}: no URL longer than 60 characters is printed as visible text`, () => {
      const urls = visibleText(email.html).match(/https?:\/\/\S+/g) ?? [];
      for (const url of urls) assert.ok(url.length <= 60, url.slice(0, 80));
    });

    it(`${name}: mobile-safe (600px max, responsive padding, no fixed width wider than the screen)`, () => {
      assert.match(email.html, /max-width:600px/);
      assert.match(email.html, /@media only screen and \(max-width: 620px\)/);
      const widths = [...email.html.matchAll(/(?<![-\w])width[:=]"?(\d+)/g)].map((m) => Number(m[1]));
      for (const width of widths) assert.ok(width <= 600, `fixed width ${width}`);
    });
  }

  it("escapes every interpolated value (enquiry message, names)", () => {
    const { html } = EMAILS.enquiryWebsite;
    assert.ok(html.includes("Lee &lt;script&gt;"));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("Line &lt;two&gt; &amp; three"));
    assert.ok(html.includes("Help wanted"));
    assert.equal(EMAILS.enquiryClient.subject, "Client message: Lee <script> (Lee & Co)");
    assert.equal(EMAILS.enquiryWebsite.subject, "New website enquiry: Lee <script> (Lee & Co)");
  });

  it("the fallback hyperlink hides the URL behind short link text", () => {
    const html = fallbackLink({ href: TICKET_URL, linkText: "Open your invitation in your browser" });
    assert.ok(html.startsWith('<p style="') && html.includes("Button not working? <a href="));
    assert.ok(!visibleText(html).includes("ticket="));
  });

  it("the invoice footer carries the legal name and the ABN a tax invoice needs, once each", () => {
    for (const body of [EMAILS.invoiceIssued.html, EMAILS.invoiceIssued.text]) {
      assert.ok(body.includes("Drylake Pty Ltd"));
      assert.ok(body.includes("ABN 70 702 662 557"));
      assert.equal(body.match(/ABN 70 702 662 557/g).length, 1);
    }
    assert.ok(!EMAILS.invitation.html.includes("ABN"), "ABN only where it is legally relevant");
    assert.match(EMAILS.invitation.html, /class="dl-btn-wrap"/);
    assert.match(EMAILS.invitation.html, /\.dl-btn-wrap \{ width: 100% !important; \}/);
    assert.ok(EMAILS.invoiceOverdue.html.includes("· overdue"));
    assert.deepEqual(textFooter(), ["Drylake Pty Ltd, Perth, Western Australia", "hello@drylake.com.au | 0433 448 000 | drylake.com.au"]);
  });
});

describe("design tokens meet WCAG AA", () => {
  const { card, panel, page, ink, body, muted, link, signal } = EMAIL_COLORS;
  for (const [label, fg, bg] of [
    ["ink on card", ink, card], ["body on card", body, card], ["muted on card", muted, card],
    ["link on card", link, card], ["muted on panel", muted, panel], ["muted on page (footer)", muted, page],
    ["button text (ink) on signal", ink, signal],
  ]) {
    it(`${label} >= 4.5:1`, () => assert.ok(contrast(fg, bg) >= 4.5, `${contrast(fg, bg).toFixed(2)}`));
  }

  it("white text on signal would fail, which is why the button uses ink", () => {
    assert.ok(contrast("#ffffff", signal) < 4.5);
  });
});

describe("email logo asset", () => {
  it("is the dark-wordmark lockup flattened onto opaque white, at 2x+ the display size", async () => {
    const file = join(ROOT, "public", EMAIL_LOGO_PATH);
    const meta = await sharp(file).metadata();
    assert.equal(meta.format, "png");
    assert.ok(meta.width >= EMAIL_LOGO_SIZE.width * 2 && meta.height >= EMAIL_LOGO_SIZE.height * 2 * 0.95);
    assert.ok(Math.abs(meta.width / meta.height - EMAIL_LOGO_SIZE.width / EMAIL_LOGO_SIZE.height) < 0.15, "aspect ratio");
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += info.channels) assert.equal(data[i], 255, "fully opaque");
    // Corner pixel is white: a dark-mode client sees a white chip, not charcoal on charcoal.
    assert.deepEqual([...data.subarray(0, 3)], [255, 255, 255]);
  });

  it("the website logo files are untouched by this change", () => {
    assert.match(read("scripts/build-email-logo.mjs"), /SOURCE = "public\/brand\/drylake-lockup-light-bg\.png"/);
    assert.match(read("scripts/build-email-logo.mjs"), /OUTPUT = "public\/brand\/drylake-email-logo-light\.png"/);
  });
});
