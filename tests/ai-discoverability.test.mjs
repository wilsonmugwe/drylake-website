/*
 * PR "AI Discoverability, Agent Readiness & Code Quality" (2026-10-08).
 * Guards: heading words reach text extractors with their spaces, page-scoped JSON-LD ids share
 * one base, Offer references resolve on every page, llms.txt lists every public page with a
 * date, and the enquiry conversion event carries no personal information and fires only on a
 * confirmed delivery. Runs under `npm test` (node:test), no new dependencies.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PUBLIC_PAGES, SERVICES, SITE_URL, absoluteUrl } from "../lib/discovery/entity.ts";
import { lastUpdated, llmsText } from "../lib/discovery/llms.ts";
import { faqNode, nodeId, organizationNode, serviceNode, webPageNode } from "../lib/discovery/structured-data.ts";
import {
  ENQUIRY_EVENT,
  enquiryEventProperties,
  trackEnquirySubmitted,
} from "../lib/analytics/enquiry-event.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");

function sourceFiles(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("heading text keeps its word boundaries", () => {
  it("no text line runs straight into a line break without a space", () => {
    // JSX drops newline-only whitespace, so "first." + <br /> + "Build" extracts as "first.Build".
    const offenders = [];
    for (const file of [...sourceFiles("app"), ...sourceFiles("components")]) {
      const lines = read(file).split("\n");
      lines.forEach((line, index) => {
        const next = lines[index + 1]?.trim() ?? "";
        if (!next.startsWith("<br")) return;
        const text = line.trim();
        if (text === "" || /[>}{]$/.test(text) || text.startsWith("<") || text.startsWith("//")) return;
        offenders.push(`${relative(ROOT, join(ROOT, file))}:${index + 1} ${text}`);
      });
    }
    assert.deepEqual(offenders, []);
  });

  it("the homepage h1 keeps a space before its dimmed phrase", () => {
    const hero = read("components/sections/Hero.tsx");
    const h1 = hero.slice(hero.indexOf("<h1"), hero.indexOf("</h1>"));
    // Plain-English headline (2026-10-13): "...that make" + {" "} + <span>running your business easier.</span>
    assert.match(h1, /that make\{" "\}\s*<span[^>]*>running your business easier\.<\/span>/);
  });
});

describe("page-scoped JSON-LD ids", () => {
  it("homepage ids share the trailing-slash base of the site-wide ids", () => {
    assert.equal(nodeId("/", "webpage"), `${SITE_URL}/#webpage`);
    assert.equal(webPageNode({ path: "/", name: "Home", description: "x" })["@id"], `${SITE_URL}/#webpage`);
    assert.equal(faqNode("/", [])["@id"], `${SITE_URL}/#faq`);
  });

  it("other pages keep their canonical URL as the base", () => {
    for (const page of PUBLIC_PAGES.filter((p) => p.path !== "/")) {
      assert.equal(nodeId(page.path, "webpage"), `${absoluteUrl(page.path)}#webpage`);
    }
  });

  it("every Offer names its Service inline so the reference resolves on any page", () => {
    const offers = organizationNode().hasOfferCatalog.itemListElement;
    assert.equal(offers.length, SERVICES.length);
    offers.forEach((offer, index) => {
      const service = SERVICES[index];
      assert.deepEqual(offer.itemOffered, {
        "@type": "Service",
        "@id": `${absoluteUrl(service.path)}#service`,
        name: service.name,
        url: absoluteUrl(service.path),
      });
    });
  });

  it("every Service names its page inline so /services carries no dangling reference", () => {
    for (const service of SERVICES) {
      assert.deepEqual(serviceNode(service).mainEntityOfPage, {
        "@type": "WebPage",
        "@id": `${absoluteUrl(service.path)}#webpage`,
        url: absoluteUrl(service.path),
      });
    }
  });

  it("knowsAbout carries the buyer phrase for the AI service line, and that line exists", () => {
    assert.ok(organizationNode().knowsAbout.includes("AI integration"));
    assert.ok(SERVICES.some((service) => service.path === "/services/ai-automation"));
  });
});

describe("llms.txt", () => {
  const text = llmsText();

  it("links every public page that a visitor can navigate to", () => {
    for (const path of ["/", "/solutions", "/services", "/perth", "/about", "/contact", "/privacy", "/terms"]) {
      assert.ok(text.includes(`](${absoluteUrl(path)})`), path);
    }
  });

  it("states a last-updated date equal to the newest sitemap lastmod", () => {
    const newest = PUBLIC_PAGES.map((page) => page.lastModified).sort().at(-1);
    assert.equal(lastUpdated(), newest);
    assert.ok(text.includes(`Last updated: ${newest}`));
  });
});

describe("enquiry conversion event", () => {
  it("public form values pass through; anything else becomes 'other'", () => {
    assert.deepEqual(enquiryEventProperties("AI opportunity"), { surface: "public", projectType: "AI opportunity" });
    assert.deepEqual(enquiryEventProperties("jane@example.com"), { surface: "public", projectType: "other" });
    assert.deepEqual(enquiryEventProperties("Drylake Workspace: invoice question"), { surface: "portal", projectType: "other" });
  });

  it("the allowed values are exactly the public form's dropdown options", () => {
    const form = read("components/forms/ProjectForm.tsx");
    const select = form.slice(form.indexOf('name="projectType"'), form.indexOf("</select>", form.indexOf('name="projectType"')));
    const options = [...select.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(options.length > 0);
    for (const value of options) assert.equal(enquiryEventProperties(value).projectType, value, value);
  });

  it("sends one event with only the two closed-set properties", () => {
    const calls = [];
    trackEnquirySubmitted("Manual processes", (name, properties) => calls.push([name, properties]));
    assert.deepEqual(calls, [[ENQUIRY_EVENT, { surface: "public", projectType: "Manual processes" }]]);
  });

  it("never throws when analytics is blocked or missing", () => {
    assert.doesNotThrow(() => trackEnquirySubmitted("Other", () => { throw new Error("blocked"); }));
  });

  it("is called once, inside the confirmed-delivery branch only", () => {
    const source = read("lib/contact/submit-enquiry.ts");
    const calls = source.split("trackEnquirySubmitted(").length - 1;
    assert.equal(calls, 1);
    const branch = source.indexOf("if (response.ok && data?.success === true) {");
    const call = source.indexOf("trackEnquirySubmitted(");
    const branchEnd = source.indexOf("}", call);
    assert.ok(branch > 0 && call > branch && branchEnd > call);
    assert.ok(source.slice(branch, call).split("\n").length <= 4, "the call sits at the top of the success branch");
  });
});
