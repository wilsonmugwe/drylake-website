/*
 * Consultation email redesign (charcoal header, appointment card, real-destination buttons).
 * Every kind x method is held to the same rules as tests/email-design-system.test.mjs (logo,
 * footer, light scheme, plain text, no printed URL, mobile-safe, no em dash), plus the rules of
 * the brief: the facts are all there, a button exists only for a real destination, the two-hour
 * policy is stated, customers never see the booking id. Runs under `npm test`.
 */
import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { CHANGE_POLICY, CONSULTATION_SUBJECTS, CUSTOMER_KINDS, renderConsultationEmail } from "../lib/email/consultation-emails.ts";
import { EMAIL_COLORS, EMAIL_LOGO_DARK_PATH, EMAIL_LOGO_PATH, EMAIL_LOGO_SIZE } from "../lib/email/layout.ts";
import { perthToInstant } from "../lib/consultations/rules.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP = "https://drylake.com.au";
const BOOKING_ID = "4f7a5c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
const TEAMS = `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${"Z".repeat(120)}%40thread.v2/0?context=%7b%22Tid%22%3a%22x%22%7d`;
const MANAGE = `${APP}/consultation/manage#t=${"m".repeat(43)}`;
const ADMIN = `${APP}/admin/consultations/${BOOKING_ID}`;

const base = {
  reference: "DL-7KQ2MX",
  customerName: "Sam Example",
  customerEmail: "sam@example.com",
  customerPhone: "0400 000 000",
  businessName: "Example Cleaning",
  projectDescription: "Bookings <b>lost</b> in email",
  start: perthToInstant(2026, 10, 19, 9, 30),
  previousStart: perthToInstant(2026, 10, 20, 11, 0),
  representativeName: "Wilson",
  assetOrigin: APP,
};

const KINDS = Object.keys(CONSULTATION_SUBJECTS);
const isCustomer = (kind) => CUSTOMER_KINDS.includes(kind);
const active = (kind) => !kind.includes("CANCELLED") && kind !== "FOUNDER_CALENDAR_FAILED";

/* What the outbox would pass for this kind: links only where the sender has them. */
function render(kind, method, overrides = {}) {
  return renderConsultationEmail({
    ...base,
    kind,
    method,
    actor: "ADMIN",
    cancellationReason: "Founder unwell",
    joinUrl: method === "TEAMS" && active(kind) ? TEAMS : null,
    calendarConnected: true,
    manageUrl: isCustomer(kind) && active(kind) ? MANAGE : null,
    adminUrl: isCustomer(kind) ? null : ADMIN,
    ...overrides,
  });
}

const visibleText = (html) =>
  html.replace(/<head>[\s\S]*?<\/head>/, "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ");
const hrefs = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("consultation emails: design system rules, every kind and method", () => {
  for (const kind of KINDS) {
    for (const method of ["TEAMS", "PHONE"]) {
      const name = `${kind} ${method}`;
      const email = render(kind, method);

      it(`${name}: charcoal header with the dark logo, footer, light scheme, plain text, no em dash`, () => {
        assert.ok(email.html.includes(`${APP}${EMAIL_LOGO_DARK_PATH}`), "dark logo");
        assert.ok(!email.html.includes(`${APP}${EMAIL_LOGO_PATH}`), "not the light logo");
        assert.ok(email.html.includes(`width="${EMAIL_LOGO_SIZE.width}" height="${EMAIL_LOGO_SIZE.height}" alt="Drylake"`));
        assert.ok(email.html.includes(`bgcolor="${EMAIL_COLORS.charcoal}"`), "charcoal band (bgcolor for Outlook)");
        for (const item of ["Drylake Pty Ltd", "Perth, Western Australia", "hello@drylake.com.au", "0433 448 000"]) {
          assert.ok(email.html.includes(item), `html footer ${item}`);
          assert.ok(email.text.includes(item), `text footer ${item}`);
        }
        assert.match(email.html, /<meta name="color-scheme" content="light">/);
        assert.match(email.html, /<html lang="en-AU"/);
        assert.ok(!`${email.subject}${email.html}${email.text}`.includes("—"), "em dash");
        assert.ok(!/\n{3,}/.test(email.text), "no runs of blank lines in the text part");
      });

      it(`${name}: every fact of the appointment, in HTML and text`, () => {
        for (const part of [email.html, email.text]) {
          for (const fact of ["Monday 19 October 2026", "9:30 am to 10:00 am", "Perth time (AWST)", "30 minutes", "DL-7KQ2MX", "Wilson"]) {
            assert.ok(part.includes(fact), `${fact} missing`);
          }
          assert.ok(part.includes(method === "TEAMS" ? "Microsoft Teams video call" : "Phone call"), "method");
        }
      });

      it(`${name}: no URL printed as visible HTML text; mobile-safe widths`, () => {
        const urls = visibleText(email.html).match(/https?:\/\/\S+/g) ?? [];
        for (const url of urls) assert.ok(url.length <= 60, url.slice(0, 80));
        assert.match(email.html, /max-width:600px/);
        assert.match(email.html, /\.dl-row-cell \{ display: block !important;/);
        const widths = [...email.html.matchAll(/(?<![-\w])width[:=]"?(\d+)/g)].map((m) => Number(m[1]));
        for (const width of widths) assert.ok(width <= 600, `fixed width ${width}`);
      });

      it(`${name}: every link goes somewhere real (no placeholder buttons)`, () => {
        const allowed = [TEAMS, MANAGE, ADMIN, `${APP}/consultation`, `${APP}`, "https://drylake.com.au", "mailto:hello@drylake.com.au", "tel:+61433448000"];
        for (const href of hrefs(email.html)) {
          assert.ok(href && href !== "#" && !/^javascript:/i.test(href), `placeholder href ${href}`);
          assert.ok(allowed.some((a) => href === a || href === `${a}/`), `unexpected link ${href.slice(0, 80)}`);
        }
      });

      it(`${name}: customers never see the booking id or the admin; founders do not get a manage link`, () => {
        if (isCustomer(kind)) {
          assert.ok(!email.html.includes(BOOKING_ID) && !email.text.includes(BOOKING_ID), "booking id leaked");
          assert.doesNotMatch(email.html, /Open in Drylake admin/);
        } else {
          assert.doesNotMatch(email.html, /Manage Booking/);
          assert.match(email.html, /Open in Drylake admin/);
        }
        assert.ok(!email.html.includes("<b>lost</b>"), "customer text escaped");
      });
    }
  }
});

describe("consultation emails: buttons only for real destinations", () => {
  it("Teams button only with a join URL; never on phone, cancelled or failed bookings", () => {
    assert.match(render("CUSTOMER_CONFIRMATION", "TEAMS").html, /Join Microsoft Teams Meeting/);
    assert.match(render("CUSTOMER_REMINDER", "TEAMS").html, /Join Microsoft Teams Meeting/);
    assert.match(render("FOUNDER_NEW_BOOKING", "TEAMS").html, /Join Microsoft Teams Meeting/);
    for (const kind of KINDS) {
      assert.doesNotMatch(render(kind, "PHONE").html, /Join Microsoft Teams Meeting/, kind);
      assert.doesNotMatch(render(kind, "TEAMS", { joinUrl: null }).html, /Join Microsoft Teams Meeting/, kind);
    }
    for (const kind of ["CUSTOMER_CANCELLED", "FOUNDER_CANCELLED", "FOUNDER_CALENDAR_FAILED"]) {
      assert.doesNotMatch(render(kind, "TEAMS", { joinUrl: TEAMS }).html, /Join Microsoft Teams Meeting/, kind);
    }
  });

  it("Teams without a link says it will follow and never claims it was sent", () => {
    const email = render("CUSTOMER_CONFIRMATION", "TEAMS", { joinUrl: null });
    assert.match(email.text, /will follow in a calendar invitation/);
    assert.doesNotMatch(email.text, /teams\.microsoft\.com/);
  });

  it("Manage Booking only with a manage URL; secondary to the Teams button when both exist", () => {
    for (const kind of ["CUSTOMER_CONFIRMATION", "CUSTOMER_REMINDER", "CUSTOMER_RESCHEDULED"]) {
      assert.doesNotMatch(render(kind, "PHONE", { manageUrl: null }).html, /Manage Booking/, kind);
    }
    const teams = render("CUSTOMER_CONFIRMATION", "TEAMS").html;
    const join = teams.indexOf("Join Microsoft Teams Meeting");
    const manage = teams.indexOf("Manage Booking");
    assert.ok(join > 0 && manage > join, "Join first, then Manage");
    const manageCell = teams.slice(teams.lastIndexOf("<td", manage), manage);
    assert.ok(manageCell.includes(`bgcolor="${EMAIL_COLORS.charcoal}"`), "Manage is the secondary (charcoal) button");
    const phone = render("CUSTOMER_CONFIRMATION", "PHONE").html;
    const phoneManage = phone.indexOf("Manage Booking");
    assert.ok(phone.slice(phone.lastIndexOf("<td", phoneManage), phoneManage).includes(`bgcolor="${EMAIL_COLORS.signal}"`), "alone, Manage is primary");
  });

  it("a cancellation offers a new booking on the real booking page, and no manage link", () => {
    const email = render("CUSTOMER_CANCELLED", "TEAMS");
    assert.match(email.html, /Book a New Consultation/);
    assert.ok(hrefs(email.html).includes(`${APP}/consultation`));
    assert.match(email.text, /Book a new consultation: https:\/\/drylake\.com\.au\/consultation/);
    assert.doesNotMatch(email.html, /Manage Booking/);
    assert.match(email.html, /no longer applies/);
    assert.match(email.html, /text-decoration:line-through/);
  });
});

describe("consultation emails: policy and wording", () => {
  it("states the two-hour rule wherever a manage link is offered", () => {
    assert.match(CHANGE_POLICY, /until 2 hours before your consultation starts/);
    for (const kind of ["CUSTOMER_CONFIRMATION", "CUSTOMER_REMINDER", "CUSTOMER_RESCHEDULED"]) {
      const email = render(kind, "TEAMS");
      assert.ok(email.html.includes("2 hours before"), kind);
      assert.ok(email.text.includes(CHANGE_POLICY), kind);
    }
  });

  it("without a working manage link the policy says how to reach Drylake instead", () => {
    const email = render("CUSTOMER_CONFIRMATION", "PHONE", { manageUrl: null });
    assert.doesNotMatch(email.text, /reschedule or cancel online/);
    assert.match(email.text, /reply to this email or call 0433 448 000/);
  });

  it("phone emails never mention Teams", () => {
    for (const kind of CUSTOMER_KINDS) assert.doesNotMatch(render(kind, "PHONE").html, /Teams/, kind);
  });

  it("the plain text keeps the HTML's order: appointment, joining, actions, policy", () => {
    const { text } = render("CUSTOMER_CONFIRMATION", "TEAMS");
    const order = ["YOUR APPOINTMENT", "HOW TO JOIN", "Manage your booking:", "WHAT TO EXPECT", "RESCHEDULING AND CANCELLING"].map((s) => text.indexOf(s));
    for (const [i, at] of order.entries()) assert.ok(at >= 0, `section ${i} missing`);
    assert.deepEqual([...order].sort((a, b) => a - b), order);
  });
});

describe("consultation email colours and logo", () => {
  const { charcoal, onDark, ink, signal, card, link, muted, panel } = EMAIL_COLORS;
  for (const [label, fg, bg] of [
    ["off-white on charcoal (secondary button, header)", onDark, charcoal],
    ["ink on signal (primary button)", ink, signal],
    ["orange-ink card title on white", link, card],
    ["muted on panel (notice)", muted, panel],
  ]) {
    it(`${label} >= 4.5:1`, () => assert.ok(contrast(fg, bg) >= 4.5, contrast(fg, bg).toFixed(2)));
  }

  it("the dark logo is the official dark-background lockup on opaque charcoal, same size as the light one", async () => {
    const file = join(ROOT, "public", EMAIL_LOGO_DARK_PATH);
    const light = await sharp(join(ROOT, "public", EMAIL_LOGO_PATH)).metadata();
    const meta = await sharp(file).metadata();
    assert.equal(meta.format, "png");
    assert.deepEqual([meta.width, meta.height], [light.width, light.height]);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += info.channels) assert.equal(data[i], 255, "fully opaque");
    const hex = `#${[...data.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    assert.equal(hex, charcoal, "corner pixel is the header charcoal, so the band and the logo meet seamlessly");
  });
});
