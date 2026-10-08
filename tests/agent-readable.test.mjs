/*
 * Agent readability (Cloudflare agent-readiness, Phase 1).
 *
 * Protects: Markdown content negotiation (public pages only, exact-path allowlist, Accept
 * parsing, HTML to Markdown extraction), the Content-Signal line in robots.txt, the homepage
 * Link header, the RFC 9727 API catalogue, and the declarative WebMCP attributes on the
 * contact form. Pure modules are imported directly; framework wiring is checked at source level.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { API_CATALOG_CONTENT_TYPE, apiCatalog } from "../lib/discovery/api-catalog.ts";
import { CONTENT_SIGNALS, TRAINING_ALLOWED_SIGNALS, TRAINING_ALLOWED_TOKENS, blockedTokens, robotsGroups, robotsText } from "../lib/discovery/crawlers.ts";
import { PRIVATE_PREFIXES, PUBLIC_PAGES, SITE_URL } from "../lib/discovery/entity.ts";
import {
  MARKDOWN_CONTENT_TYPE,
  estimateTokens,
  isMarkdownPath,
  pageToMarkdown,
  prefersMarkdown,
  shouldServeMarkdown,
} from "../lib/discovery/markdown.ts";
import { RESPONSE_TIME } from "../lib/site.ts";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const FIXTURE = `<!DOCTYPE html><html lang="en-AU"><head>
<title>Services | Drylake &amp; partners</title>
<link rel="canonical" href="${SITE_URL}/services">
<script>window.tracking = 1;</script><style>body{}</style>
</head><body>
<a href="#main-content">Skip to content</a>
<nav aria-label="Primary"><a href="/about">About</a></nav>
<main id="main-content" tabindex="-1">
  <svg viewBox="0 0 1 1"><text>logo</text></svg>
  <div aria-hidden="true">Decorative marquee</div>
  <h1>Software for Australian businesses</h1>
  <p>We build <strong>portals</strong> and <a href="/services/automation">automation</a>.</p>
  <ul><li>Custom software</li><li>Integrations</li></ul>
  <h2><span>Your business</span><span>runs on workarounds.</span></h2>
  <a href="/services/systems-integration"><span>Systems integration</span><span>Connected software.</span><svg><path d="M0"/></svg></a>
  <p><a href="tel:+61400000000">Call</a><a href="mailto:hello@drylake.com.au">Email</a></p>
  <img src="/brand/decor.png" alt="">
  <script>alert(1)</script>
  <form><label for="n">Your name</label><input id="n" name="n"><button>Send</button></form>
</main>
<footer>Footer links</footer>
</body></html>`;

describe("Markdown negotiation: path allowlist", () => {
  it("accepts every public page path, exactly", () => {
    for (const page of PUBLIC_PAGES) {
      assert.equal(isMarkdownPath(page.path), true, page.path);
    }
  });

  it("refuses private surfaces, near-misses and arbitrary URLs", () => {
    for (const prefix of PRIVATE_PREFIXES) {
      assert.equal(isMarkdownPath(prefix), false, prefix);
      assert.equal(isMarkdownPath(`${prefix}/anything`), false, prefix);
    }
    for (const bad of [
      null,
      undefined,
      "",
      "services",
      "/services/",
      "/services?x=1",
      "/SERVICES",
      "/%73ervices",
      "/services/../admin",
      "//evil.example/",
      "https://evil.example/",
      "http://localhost/services",
      "/api/markdown",
      "/nope",
    ]) {
      assert.equal(isMarkdownPath(bad), false, String(bad));
    }
  });
});

describe("Markdown negotiation: Accept parsing", () => {
  it("selects Markdown only when text/markdown is explicitly preferred", () => {
    assert.equal(prefersMarkdown("text/markdown"), true);
    assert.equal(prefersMarkdown("text/markdown, text/html;q=0.9"), true);
    assert.equal(prefersMarkdown("text/html;q=0.5, text/markdown;q=0.8"), true);
    assert.equal(prefersMarkdown("TEXT/MARKDOWN"), true);
  });

  it("keeps browsers, wildcards and HTML-preferring clients on HTML", () => {
    const chrome =
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
    assert.equal(prefersMarkdown(chrome), false);
    assert.equal(prefersMarkdown("*/*"), false);
    assert.equal(prefersMarkdown("text/*"), false);
    assert.equal(prefersMarkdown("text/html, text/markdown;q=0.5"), false);
    assert.equal(prefersMarkdown("text/markdown;q=0"), false);
    assert.equal(prefersMarkdown(""), false);
    assert.equal(prefersMarkdown(null), false);
  });

  it("only rewrites GET/HEAD for a public path, never the internal self-fetch", () => {
    const base = { method: "GET", pathname: "/services", accept: "text/markdown", internalFetch: false };
    assert.equal(shouldServeMarkdown(base), true);
    assert.equal(shouldServeMarkdown({ ...base, method: "HEAD" }), true);
    assert.equal(shouldServeMarkdown({ ...base, method: "POST" }), false);
    assert.equal(shouldServeMarkdown({ ...base, internalFetch: true }), false);
    assert.equal(shouldServeMarkdown({ ...base, accept: "text/html" }), false);
    assert.equal(shouldServeMarkdown({ ...base, pathname: "/admin" }), false);
    assert.equal(shouldServeMarkdown({ ...base, pathname: "/client/invoices" }), false);
    assert.equal(shouldServeMarkdown({ ...base, pathname: "/sign-in" }), false);
  });
});

describe("Markdown extraction from rendered HTML", () => {
  const page = pageToMarkdown(FIXTURE, "/services");

  it("starts with the title and the canonical source line", () => {
    assert.ok(page);
    assert.equal(page.title, "Services | Drylake & partners");
    assert.equal(page.canonical, `${SITE_URL}/services`);
    assert.ok(page.markdown.startsWith(`# Services | Drylake & partners\n\nSource: ${SITE_URL}/services\n\n`));
  });

  it("keeps the main content as Markdown with absolute links", () => {
    assert.match(page.markdown, /^# Software for Australian businesses$/m);
    assert.match(page.markdown, /\*\*portals\*\*/);
    assert.ok(page.markdown.includes(`[automation](${SITE_URL}/services/automation)`));
    assert.match(page.markdown, /^\* Custom software$/m);
  });

  it("separates layout text: card links, stacked spans and adjacent links", () => {
    assert.ok(page.markdown.includes("[Systems integration]("+SITE_URL+"/services/systems-integration): Connected software."));
    assert.match(page.markdown, /^## Your business runs on workarounds\.$/m);
    assert.ok(page.markdown.includes("[Call](tel:+61400000000) · [Email](mailto:hello@drylake.com.au)"));
  });

  it("strips chrome, scripts, svg, forms and aria-hidden decoration", () => {
    for (const gone of ["Skip to content", "About", "Footer links", "logo", "Decorative marquee", "alert(1)", "tracking", "Your name", "Send", "decor.png", "<"]) {
      assert.ok(!page.markdown.includes(gone), gone);
    }
  });

  it("returns null when the page has no main-content element", () => {
    assert.equal(pageToMarkdown("<html><body><p>x</p></body></html>", "/"), null);
  });

  it("estimates tokens as characters divided by four", () => {
    assert.equal(estimateTokens("abcdefgh"), 2);
    assert.equal(estimateTokens("abcdefghi"), 3);
  });
});

describe("Markdown route and proxy wiring", () => {
  it("the route validates the path, fetches only its own origin and sets the headers", () => {
    const route = code("app/api/markdown/route.ts");
    assert.match(route, /if \(!isMarkdownPath\(path\)\)\s*\{\s*return plain\(404/);
    assert.match(route, /new URL\(path, request\.nextUrl\.origin\)/);
    assert.match(route, /"Content-Type": MARKDOWN_CONTENT_TYPE/);
    assert.match(route, /Vary: "Accept"/);
    assert.match(route, /"x-markdown-tokens": String\(estimateTokens\(/);
    assert.match(route, /"Cache-Control": "public, s-maxage=3600"/);
    assert.match(route, /\[MARKDOWN_FETCH_HEADER\]: "1"/);
    assert.equal(MARKDOWN_CONTENT_TYPE, "text/markdown; charset=utf-8");
  });

  it("the route lives under /api, which robots disallows", () => {
    assert.ok(PRIVATE_PREFIXES.includes("/api"));
    assert.ok(existsSync(join(root, "app/api/markdown/route.ts")));
  });

  it("the proxy rewrites before the private-page check and keeps the CSRF guard first", () => {
    const proxy = code("proxy.ts");
    const csrf = proxy.indexOf("isCrossSiteMutation(");
    const markdown = proxy.indexOf("shouldServeMarkdown(");
    const privateCheck = proxy.indexOf("!isPrivatePage(request)");
    assert.ok(csrf > -1 && markdown > csrf && privateCheck > markdown);
    assert.match(proxy, /NextResponse\.rewrite\(target\)/);
    assert.match(proxy, /from "\.\/lib\/discovery\/markdown-negotiation"/);
  });

  it("the negotiation module the proxy imports pulls in no HTML libraries", () => {
    const negotiation = code("lib/discovery/markdown-negotiation.ts");
    assert.doesNotMatch(negotiation, /node-html-(parser|markdown)/);
  });

  it("public HTML pages also send Vary: Accept (set in the proxy; Next overwrites a config Vary)", () => {
    const proxy = code("proxy.ts");
    assert.match(proxy, /if \(isMarkdownPath\(request\.nextUrl\.pathname\)\)\s*\{\s*const response = NextResponse\.next\(\);\s*response\.headers\.set\("Vary", "Accept"\);/);
    assert.ok(proxy.indexOf("isMarkdownPath(request.nextUrl.pathname)") < proxy.indexOf("!isPrivatePage(request)"));
  });
});

describe("robots.txt Content-Signal", () => {
  const groups = robotsGroups(PRIVATE_PREFIXES);
  const text = robotsText(groups, `${SITE_URL}/sitemap.xml`);
  const blocks = text.split(/\n\s*\n/);
  const wildcard = blocks.find((block) => /^User-Agent: \*$/m.test(block)) ?? "";
  const training = blocks.find((block) => block.includes("User-Agent: GPTBot")) ?? "";

  const gemini = blocks.find((block) => /^User-Agent: Google-Extended$/m.test(block)) ?? "";

  it("signals search and AI input allowed, training opted out, in the * group", () => {
    assert.deepEqual(CONTENT_SIGNALS, { search: "yes", "ai-input": "yes", "ai-train": "no" });
    assert.match(wildcard, /^Content-Signal: search=yes, ai-input=yes, ai-train=no$/m);
    assert.equal(text.match(/Content-Signal:/g)?.length, 2);
  });

  it("lets Gemini train (Ben, 2026-10-08, D-1) with exactly the access of the * group", () => {
    assert.deepEqual([...TRAINING_ALLOWED_TOKENS], ["Google-Extended"]);
    assert.deepEqual(TRAINING_ALLOWED_SIGNALS, { search: "yes", "ai-input": "yes", "ai-train": "yes" });
    assert.match(gemini, /^Content-Signal: search=yes, ai-input=yes, ai-train=yes$/m);
    const rules = (block) => block.split("\n").filter((line) => /^(Allow|Disallow):/.test(line));
    assert.deepEqual(rules(gemini), rules(wildcard));
    assert.ok(!blockedTokens().includes("Google-Extended"));
  });

  it("still disallows every training token and keeps private surfaces closed", () => {
    for (const token of blockedTokens()) {
      assert.match(training, new RegExp(`^User-Agent: ${token}$`, "m"));
    }
    assert.match(training, /^Disallow: \/$/m);
    assert.match(wildcard, /^Allow: \/$/m);
    for (const prefix of PRIVATE_PREFIXES) {
      assert.match(wildcard, new RegExp(`^Disallow: ${prefix}$`, "m"));
    }
  });

  it("renders the same format Next produced, plus the one signal line", () => {
    const expected = [
      ...blockedTokens().map((token) => `User-Agent: ${token}`),
      "Disallow: /",
      "",
      "User-Agent: Google-Extended",
      "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
      "Allow: /",
      ...PRIVATE_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
      "",
      "User-Agent: *",
      "Content-Signal: search=yes, ai-input=yes, ai-train=no",
      "Allow: /",
      ...PRIVATE_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
      "",
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
    ].join("\n");
    assert.equal(text, expected);
  });

  it("is served by a route handler, not MetadataRoute.Robots", () => {
    assert.equal(existsSync(join(root, "app/robots.ts")), false);
    const route = code("app/robots.txt/route.ts");
    assert.match(route, /robotsText\(robotsGroups\(PRIVATE_PREFIXES\), `\$\{SITE_URL\}\/sitemap\.xml`\)/);
    assert.match(route, /"Content-Type": "text\/plain; charset=utf-8"/);
  });
});

describe("Homepage Link header (RFC 8288)", () => {
  it("advertises llms.txt, the API catalogue and the Markdown alternate on / only", () => {
    const config = read("next.config.ts");
    assert.match(config, /'<\/llms\.txt>; rel="describedby"; type="text\/plain"'/);
    assert.match(config, /'<\/\.well-known\/api-catalog>; rel="api-catalog"'/);
    assert.match(config, /'<\/>; rel="alternate"; type="text\/markdown"'/);
    assert.match(code("next.config.ts"), /\{ source: "\/", headers: \[HOMEPAGE_LINK_HEADER\] \}/);
    assert.match(code("next.config.ts"), /source: "\/\(\.\*\)",\s*headers: securityHeaders/);
  });
});

describe("API catalogue (RFC 9727)", () => {
  it("lists only endpoints that exist, as a linkset", () => {
    assert.deepEqual(apiCatalog(), {
      linkset: [
        {
          anchor: "https://drylake.com.au/api/",
          status: [{ href: "https://drylake.com.au/api/health" }],
          "service-doc": [{ href: "https://drylake.com.au/llms-full.txt", type: "text/plain" }],
        },
      ],
    });
    assert.ok(existsSync(join(root, "app/api/health/route.ts")));
    assert.ok(existsSync(join(root, "app/llms-full.txt/route.ts")));
  });

  it("is served as application/linkset+json from /.well-known/api-catalog", () => {
    assert.match(API_CATALOG_CONTENT_TYPE, /^application\/linkset\+json/);
    const route = code("app/.well-known/api-catalog/route.ts");
    assert.match(route, /JSON\.stringify\(apiCatalog\(\)\)/);
    assert.match(route, /"Content-Type": API_CATALOG_CONTENT_TYPE/);
  });

  it("robots does not block /.well-known", () => {
    for (const rule of robotsGroups(PRIVATE_PREFIXES).find((g) => g.userAgent.includes("*")).disallow) {
      assert.ok(!"/.well-known/api-catalog".startsWith(rule), rule);
    }
  });
});

describe("Contact form WebMCP attributes", () => {
  const form = read("components/forms/ProjectForm.tsx");

  it("names the form as a tool with the site's response-time promise", () => {
    assert.match(form, /toolname: "request_conversation"/);
    assert.match(form, /tooldescription: `Ask Drylake about a software, automation or integration problem\. A person at Drylake replies within \$\{RESPONSE_TIME\}\.`/);
    assert.match(form, /<form\s+\{\.\.\.FORM_TOOL\}/);
    assert.equal(RESPONSE_TIME, "1 business day");
  });

  it("describes every field", () => {
    assert.equal((form.match(/toolParamDescription="/g) ?? []).length, 3);
    assert.equal((form.match(/\{\.\.\.toolParam\("/g) ?? []).length, 3);
  });

  it("carries no em dash in any new string", () => {
    for (const file of ["components/forms/ProjectForm.tsx", "lib/discovery/markdown.ts", "lib/discovery/api-catalog.ts", "lib/discovery/crawlers.ts", "next.config.ts"]) {
      assert.ok(!read(file).includes(String.fromCharCode(0x2014)), file);
    }
  });
});
