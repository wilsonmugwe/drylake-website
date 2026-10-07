/*
 * PR "Drylake Public Website Visual Redesign" (2026-10-07): navigation semantics, the
 * scroll/sign-out root-cause fixes, and the rule that the redesign changed presentation,
 * not the approved homepage copy. Runs under `npm test` (node:test), no new dependencies.
 *
 * Viewport positions (does /contact open at the top?) cannot be proven by a unit test; the
 * PR records the browser checks. These tests pin the decisions and wiring that make them true.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CLIENT_LOGIN,
  PRIMARY_CTA,
  PRIMARY_NAV,
  SIGN_OUT_REDIRECT_URL,
  isPlainLeftClick,
  parseHref,
  resolveNavClick,
} from "../lib/navigation/site-nav.ts";
import { faqs } from "../lib/faqs.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/* Section components the homepage actually renders, in import order. */
const HOME_SECTIONS = [...read("app/page.tsx").matchAll(/from "@\/components\/sections\/(\w+)"/g)].map((m) => m[1]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(relative(ROOT, full).replaceAll("\\", "/"));
  }
  return out;
}

describe("navigation decisions (resolveNavClick)", () => {
  it("a different page is a normal navigation", () => {
    assert.deepEqual(resolveNavClick({ href: "/contact", currentPath: "/", currentHash: "" }), { kind: "navigate" });
    assert.deepEqual(resolveNavClick({ href: "/", currentPath: "/sign-in", currentHash: "" }), { kind: "navigate" });
    assert.deepEqual(resolveNavClick({ href: "/#about", currentPath: "/services", currentHash: "" }), { kind: "navigate" });
  });

  it("Bug 2: About clicked again with #about already in the URL still scrolls, without a duplicate history entry", () => {
    assert.deepEqual(resolveNavClick({ href: "/#about", currentPath: "/", currentHash: "about" }), {
      kind: "scroll-section",
      id: "about",
      pushUrl: null,
    });
  });

  it("a section link from another section pushes one history entry and scrolls", () => {
    assert.deepEqual(resolveNavClick({ href: "/#about", currentPath: "/", currentHash: "approach" }), {
      kind: "scroll-section",
      id: "about",
      pushUrl: "/#about",
    });
  });

  it("brand / Back to Drylake on the homepage: top, and a stale hash is removed", () => {
    assert.deepEqual(resolveNavClick({ href: "/", currentPath: "/", currentHash: "about" }), { kind: "scroll-top", replaceUrl: "/" });
    assert.deepEqual(resolveNavClick({ href: "/", currentPath: "/", currentHash: "" }), { kind: "scroll-top", replaceUrl: null });
  });

  it("Start a conversation while already on /contact goes to the top", () => {
    assert.deepEqual(resolveNavClick({ href: "/contact", currentPath: "/contact", currentHash: "" }), { kind: "scroll-top", replaceUrl: null });
  });

  it("parses hrefs and leaves modified clicks to the browser", () => {
    assert.deepEqual(parseHref("/#approach"), { path: "/", hash: "approach" });
    assert.deepEqual(parseHref("#faq"), { path: "/", hash: "faq" });
    assert.deepEqual(parseHref("/contact"), { path: "/contact", hash: "" });

    const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
    assert.equal(isPlainLeftClick(base), true);
    assert.equal(isPlainLeftClick({ ...base, metaKey: true }), false);
    assert.equal(isPlainLeftClick({ ...base, ctrlKey: true }), false);
    assert.equal(isPlainLeftClick({ ...base, button: 1 }), false);
  });
});

describe("navigation labels and destinations", () => {
  it("uses Wilson's option B wording, in order, on the existing destinations", () => {
    assert.deepEqual(
      PRIMARY_NAV.map((item) => [item.label, item.href]),
      [
        ["What We Do", "/#solutions"],
        ["Our Approach", "/#approach"],
        ["About", "/#about"],
        ["Contact", "/contact"],
      ]
    );
    assert.deepEqual([CLIENT_LOGIN.label, CLIENT_LOGIN.href], ["Client Login", "/portal"]);
    assert.deepEqual([PRIMARY_CTA.label, PRIMARY_CTA.href], ["Start a conversation", "/contact"]);
  });

  it("every homepage section target exists exactly once", () => {
    // The homepage's own section list (read from app/page.tsx, PR 2), not a hand-kept copy.
    const home = HOME_SECTIONS
      .map((name) => code(`components/sections/${name}.tsx`))
      .join("\n");

    for (const id of ["solutions", "approach", "faq"]) {
      assert.equal((home.match(new RegExp(`id="${id}"`, "g")) ?? []).length, 1, id);
    }
    // Experience polish: Founders is shared with /about, so its id is chosen per variant
    // ("about" on the homepage, "founders" on /about); the homepage renders the default variant.
    const founders = code("components/sections/Founders.tsx");
    assert.match(founders, /id=\{page \? "founders" : "about"\}/);
    assert.match(founders, /variant = "home"/);
    assert.match(read("app/page.tsx"), /<Founders \/>/);
  });

  it("the header: one brand control, all links through SiteLink, Start a conversation kept", () => {
    const navbar = code("components/layout/Navbar.tsx");
    const lockup = read("components/brand/BrandHomeLink.tsx");

    // No em dash in an accessible name (visitor-facing string rule).
    assert.match(lockup, /aria-label="Drylake home"/);
    assert.match(lockup, /href=\{HOME_PATH\}/);
    assert.match(navbar, /<BrandHomeLink \/>/);
    assert.match(navbar, /PRIMARY_NAV\.map/);
    assert.match(navbar, /<PrimaryCta href=\{PRIMARY_CTA\.href\}/);
    assert.ok(!/from "next\/link"/.test(navbar), "header links go through SiteLink");
  });

  it("the mobile menu is a real dialog with the full set of destinations", () => {
    const menu = code("components/layout/MobileMenu.tsx");

    assert.match(menu, /role="dialog"/);
    assert.match(menu, /aria-modal="true"/);
    assert.match(menu, /event\.key === "Escape"/);
    assert.match(menu, /event\.key !== "Tab"/);
    assert.match(menu, /root\.style\.overflow = "hidden"/);
    assert.match(menu, /root\.style\.overflow = previousOverflow/);
    assert.match(menu, /PRIMARY_NAV\.map/);
    assert.match(menu, /<ClientAccessLink\b/);
    assert.match(menu, /PRIMARY_CTA\.href/);
    assert.match(code("components/navigation/ClientAccessLink.tsx"), /CLIENT_LOGIN\.href/);
    assert.match(code("components/layout/Navbar.tsx"), /<ClientAccessLink\b/);
    // Menu destinations release the scroll lock before SiteLink scrolls (measured 59 px short otherwise).
    assert.match(menu, /onNavigate=\{handleNavigate\}/);
    assert.ok(!/onNavigate=\{onNavigate\}/.test(menu));
    assert.match(menu, /document\.documentElement\.style\.overflow = previousOverflowRef\.current;\s*onNavigate\(\);/);
  });
});

describe("scroll and sign-out root causes", () => {
  it("Bug 1/3/4: <html> opts into Next's smooth-scroll suspension during navigation", () => {
    assert.match(code("app/layout.tsx"), /<html lang="en-AU" data-scroll-behavior="smooth">/);
    assert.match(read("app/globals.css"), /html \{\s*scroll-behavior: smooth;/);
  });

  it("Bug 4: sign-out always lands on / (provider default and every explicit call)", () => {
    assert.equal(SIGN_OUT_REDIRECT_URL, "/");
    assert.match(code("components/auth/ClerkScope.tsx"), /<ClerkProvider afterSignOutUrl=\{SIGN_OUT_REDIRECT_URL\}>/);

    const calls = walk(join(ROOT, "components"))
      .concat(walk(join(ROOT, "app")))
      .flatMap((file) => [...code(file).matchAll(/signOut\(([^)]*)\)/g)].map((m) => [file, m[1]]));

    assert.ok(calls.length >= 3);
    for (const [file, args] of calls) {
      assert.match(args, /redirectUrl: SIGN_OUT_REDIRECT_URL/, file);
    }
  });

  it("Bug 3: every Back to Drylake / home link on the auth and system screens is a SiteLink", () => {
    for (const file of ["app/sign-in/[[...sign-in]]/page.tsx", "app/sign-up/[[...sign-up]]/page.tsx", "components/system/SystemScreen.tsx"]) {
      const source = code(file);
      assert.ok(!/<Link\s+href="\/"/.test(source), `${file} still uses <Link href="/">`);
      assert.match(source, /<SiteLink\s+href="\/"/, file);
    }
  });

  it("no timer-based scroll hacks in the navigation code", () => {
    for (const file of ["components/navigation/SiteLink.tsx", "components/layout/Navbar.tsx", "components/layout/MobileMenu.tsx", "lib/navigation/site-nav.ts"]) {
      assert.ok(!/setTimeout|setInterval/.test(code(file)), file);
    }
  });

  it("section targets clear the fixed header via CSS scroll-margin", () => {
    assert.match(read("app/public-site.css"), /main \[id\] \{\s*scroll-margin-top: calc\(var\(--nav-h\) \+ 8px\);/);
  });

  it("decorative motion stops under prefers-reduced-motion", () => {
    const css = read("app/public-site.css");
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of [".dl-signal", ".dl-draw-load", ".dl-workaround", ".mobile-menu"]) {
      assert.ok(block.includes(name), name);
    }
  });
});

describe("the redesign kept the approved homepage copy", () => {
  // PR 2: What We Do moved from Solutions (still used by /solutions) to WhatWeDo on the homepage.
  const files = HOME_SECTIONS;
  const text = files
    .map((name) => read(`components/sections/${name}.tsx`))
    .join("\n")
    .replace(/&apos;/g, "'")
    .replace(/\{" "\}/g, " ")
    .replace(/\s+/g, " ");

  const APPROVED = [
    // Hero
    "Perth / Western Australia", "Software Engineering", "Your business", "shouldn't run", "on workarounds.",
    // Experience polish language pass (brief section 7): outcomes in an owner's words.
    "Drylake builds practical software and automation for Australian businesses that have outgrown spreadsheets, email and double handling.",
    "Quotes, customers, jobs, invoices: held together by copy, paste and email.", "Until they are one system.",
    "Start a conversation", "How we work", "Australian company", "Founder-led", "Perth, WA",
    // Problems
    "01 / The Problem", "Growth makes the", "cracks visible.",
    "The business grows. Manual steps multiply. Systems that once worked well enough start getting in the way.",
    "The spreadsheet has become the system.", "Important processes depend on files that are becoming difficult to manage, share or scale.",
    "We're entering the same information more than once.", "Your team is copying information between systems instead of doing useful work.",
    "Our systems don't talk to each other.", "Information is spread across platforms, creating gaps, delays and manual work.",
    "Too much depends on manual follow-up.", "Routine work still relies on emails, reminders and somebody remembering what happens next.",
    "You don't need to know the technical solution.", "Tell us what is slowing the business down. We'll work backwards from the problem.",
    // What We Do
    "02 / What We Do", "Less workaround.", "More workflow.",
    "We build software, automate the repetitive work and join up the systems you already use, so your team spends less time on admin.",
    "Software that fits the business.", "Fewer manual steps.", "Make the systems talk.", "AI where it earns its place.",
    "Internal platforms / Client & staff portals / Job and workflow systems / Web & mobile applications",
    "Approvals / Reminders & follow-ups / Notifications / Keeping records in sync",
    "Document processing / Sorting & routing enquiries / Drafting & summaries / Decision support",
    // Integrations
    "Work With What You Have", "Don't replace", "what already works.",
    "We can connect, extend and build around the systems your business already depends on.",
    "Microsoft 365", "Xero", "MYOB", "Payments", "CRM", "APIs",
    "Integrations depend on the capabilities and access provided by each platform.",
    // Founders
    "03 / Founder-Led", "Small team.", "Direct access.",
    "Work directly with the people responsible for understanding the problem and delivering the solution.",
    "Benedict Wambugu", "Wilson Mugwe", "Master of Project Management",
    "Bachelor of Computer Science, majoring in Software Engineering",
    // "What founder-led means" + its statement now close the founders block on /about (variant="page").
    // Approach + production
    "04 / How We Work", "Understand first.", "Build second.",
    "No technical specification required. We start with the business problem and work forward from there.",
    "We learn how the business works today, where time is being lost and what actually needs to improve.",
    "Production Matters", "The boring part", "is the hard part.",
    "We engineer the less visible parts that make software dependable when the business starts relying on it.",
    "Authentication", "Permissions", "Data validation", "Integrations", "Monitoring", "Backups & recovery",
    "What your team sees",
    // FAQ + close
    // The FAQ moved into the closing conversation (brief section 9): same five answers.
    "Before you ask",
    // PR 2: the closing headline is now Ben's "Have a problem worth fixing?" (brief, 7 Oct 2026);
    // "Tell us what's slowing you down." was retired with it.
    "Have a problem", "worth fixing?",
    "No technical brief required. Tell us what's manual, disconnected or taking too much time.",
    "TALK TO A PERSON, NOT A SALES QUEUE", "+61 420 565 457", "hello@drylake.com.au",
  ];

  it("every approved string is still on the homepage", () => {
    const missing = APPROVED.filter((phrase) => !text.includes(phrase));
    assert.deepEqual(missing, []);
  });

  it("the FAQ still renders the shared FAQ data (same as the FAQPage schema)", () => {
    assert.match(read("components/sections/FAQ.tsx"), /faqs\.map\(/);
    assert.equal(faqs.length, 5);
  });

  it("each Approach stage text is still rendered once", () => {
    assert.equal((code("components/sections/Approach.tsx").match(/\{stage\.text\}/g) ?? []).length, 1);
  });
});
