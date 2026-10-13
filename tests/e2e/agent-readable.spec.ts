import { expect, test } from "@playwright/test";

/*
 * Agent readability against the running build: Markdown negotiation on public pages only,
 * HTML unchanged for browsers, Content-Signal in robots.txt, the homepage Link header and the
 * RFC 9727 API catalogue. Pure rules are unit-tested in tests/agent-readable.test.mjs.
 */

const MARKDOWN = { Accept: "text/markdown" };

test("a public page asked for text/markdown returns Markdown with the right headers", async ({ request }) => {
  const response = await request.get("/services", { headers: MARKDOWN });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("text/markdown; charset=utf-8");
  expect(response.headers()["vary"] ?? "").toMatch(/Accept/);
  expect(Number(response.headers()["x-markdown-tokens"])).toBeGreaterThan(50);

  const body = await response.text();
  expect(body).toMatch(/^# .*Drylake\n\nSource: https:\/\/drylake\.com\.au\/services\n/);
  // PR #65 renamed the service line in plain English ("Custom software & apps").
  expect(body).toContain("[Custom software & apps](https://drylake.com.au/services/custom-software-development)");
  expect(body).not.toMatch(/<(script|svg|nav|footer)\b/);
});

test("browsers still get HTML", async ({ request }) => {
  const response = await request.get("/services", {
    headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
  });
  expect(response.headers()["content-type"]).toContain("text/html");
});

test("private and unknown paths are never served as Markdown", async ({ request }) => {
  for (const path of ["/admin", "/client", "/portal", "/sign-in", "/api/health", "/a-missing-page"]) {
    const response = await request.get(path, { headers: MARKDOWN, maxRedirects: 0 });
    expect(response.headers()["content-type"] ?? "", path).not.toContain("text/markdown");
  }
  for (const path of ["/admin", "https://example.com/", "/services/"]) {
    const response = await request.get(`/api/markdown?path=${encodeURIComponent(path)}`);
    expect(response.status(), path).toBe(404);
  }
});

test("robots.txt carries the Content-Signal in the * group", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  const wildcard = body.split(/\n\s*\n/).find((group) => /User-Agent: \*/.test(group)) ?? "";
  expect(wildcard).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
  expect(body).toMatch(/User-Agent: GPTBot[\s\S]*?Disallow: \/\n/);
});

test("the homepage sends the RFC 8288 Link header", async ({ request }) => {
  const link = (await request.get("/")).headers()["link"] ?? "";
  expect(link).toContain('</llms.txt>; rel="describedby"; type="text/plain"');
  expect(link).toContain('</.well-known/api-catalog>; rel="api-catalog"');
  expect(link).toContain('</>; rel="alternate"; type="text/markdown"');
});

test("the API catalogue is a linkset", async ({ request }) => {
  const response = await request.get("/.well-known/api-catalog");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^application\/linkset\+json/);
  const catalog = await response.json();
  expect(catalog.linkset[0].anchor).toBe("https://drylake.com.au/api/");
  expect(catalog.linkset[0].status[0].href).toBe("https://drylake.com.au/api/health");
});
