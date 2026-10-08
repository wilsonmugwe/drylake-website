/*
 * Crawler policy for drylake.com.au. PURE (tests import it directly).
 *
 * Goal: Drylake's PUBLIC pages are open to every legitimate search engine, AI search /
 * retrieval crawler and user-triggered fetcher, so they can be indexed and cited. Content is
 * NOT opted into model training just because AI search visibility is wanted.
 *
 * Every token below is taken from the vendor's own documentation, accessed 2026-10-06
 * (plans/reports/2026-10-06-crawler-verification.md). Do not add a token from memory, a blog
 * or a "list of AI bots": unknown bots are neither whitelisted nor blocked by name, they fall
 * through to the "*" group.
 *
 * How robots.txt works here: a crawler obeys the most specific group that names it, and only
 * that group. So the training tokens get their own "Disallow: /" group, and everything else
 * (Googlebot, bingbot, Applebot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, ...) uses the
 * "*" group: the whole public site allowed, private application surfaces disallowed.
 */

export type CrawlerClass =
  | "search" // builds a search index
  | "ai-search" // builds an index for an AI search/answer product
  | "user-fetch" // fetches a page because a user asked
  | "training" // collects content to train models
  | "control-token"; // robots.txt token only; no separate crawler

export type CrawlerEntry = {
  vendor: string;
  product: string;
  token: string;
  class: CrawlerClass;
  access: "allow" | "disallow";
  source: string;
  note?: string;
};

export const CRAWLERS: readonly CrawlerEntry[] = [
  // Search engines
  { vendor: "Google", product: "Google Search, AI Overviews, AI Mode", token: "Googlebot", class: "search", access: "allow", source: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers", note: "AI Overviews and AI Mode use the normal Search index; no separate crawler." },
  { vendor: "Microsoft", product: "Bing, Microsoft Copilot (grounded on Bing)", token: "bingbot", class: "search", access: "allow", source: "https://learn.microsoft.com/en-us/microsoft-365-copilot/manage-public-web-access", note: "Microsoft has no robots training token; its only opt-outs (noarchive/nocache) also remove pages from Copilot answers, so none is set." },
  { vendor: "DuckDuckGo", product: "DuckDuckGo search", token: "DuckDuckBot", class: "search", access: "allow", source: "https://duckduckgo.com/duckduckgo-help-pages/results/duckduckbot" },
  { vendor: "DuckDuckGo", product: "DuckAssist AI answers", token: "DuckAssistBot", class: "ai-search", access: "allow", source: "https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot" },
  { vendor: "Apple", product: "Siri, Spotlight, Safari suggestions", token: "Applebot", class: "search", access: "allow", source: "https://support.apple.com/en-us/119829" },
  { vendor: "Mojeek", product: "Mojeek (independent index)", token: "MojeekBot", class: "search", access: "allow", source: "https://www.mojeek.com/bot.html" },
  // AI search and retrieval
  { vendor: "OpenAI", product: "ChatGPT search", token: "OAI-SearchBot", class: "ai-search", access: "allow", source: "https://developers.openai.com/api/docs/bots" },
  { vendor: "OpenAI", product: "ChatGPT user actions", token: "ChatGPT-User", class: "user-fetch", access: "allow", source: "https://developers.openai.com/api/docs/bots", note: "OpenAI says robots.txt may not apply to user-initiated fetches." },
  { vendor: "Anthropic", product: "Claude search", token: "Claude-SearchBot", class: "ai-search", access: "allow", source: "https://support.claude.com/en/articles/8896518" },
  { vendor: "Anthropic", product: "Claude user-directed fetches", token: "Claude-User", class: "user-fetch", access: "allow", source: "https://support.claude.com/en/articles/8896518" },
  { vendor: "Perplexity", product: "Perplexity search", token: "PerplexityBot", class: "ai-search", access: "allow", source: "https://docs.perplexity.ai/guides/bots" },
  { vendor: "Perplexity", product: "Perplexity user requests", token: "Perplexity-User", class: "user-fetch", access: "allow", source: "https://docs.perplexity.ai/guides/bots" },
  { vendor: "Meta", product: "Meta AI search and citations", token: "meta-webindexer", class: "ai-search", access: "allow", source: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers" },
  { vendor: "Meta", product: "Link previews when shared", token: "facebookexternalhit", class: "user-fetch", access: "allow", source: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers" },
  { vendor: "Amazon", product: "Alexa and Amazon search", token: "Amzn-SearchBot", class: "ai-search", access: "allow", source: "https://developer.amazon.com/amazonbot" },
  // Model training: opted out
  { vendor: "OpenAI", product: "Model training", token: "GPTBot", class: "training", access: "disallow", source: "https://developers.openai.com/api/docs/bots", note: "ChatGPT search uses OAI-SearchBot, so search visibility is unaffected." },
  { vendor: "Anthropic", product: "Model training", token: "ClaudeBot", class: "training", access: "disallow", source: "https://support.claude.com/en/articles/8896518", note: "Claude search uses Claude-SearchBot." },
  { vendor: "Common Crawl", product: "Open corpus widely used for model training", token: "CCBot", class: "training", access: "disallow", source: "https://commoncrawl.org/faq" },
  { vendor: "Meta", product: "Training and product indexing", token: "meta-externalagent", class: "training", access: "disallow", source: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers", note: "Meta AI search uses meta-webindexer, which stays allowed." },
  { vendor: "Amazon", product: "Product improvement, may train AI", token: "Amazonbot", class: "training", access: "disallow", source: "https://developer.amazon.com/amazonbot", note: "Alexa search uses Amzn-SearchBot, which stays allowed." },
  { vendor: "Apple", product: "Apple foundation-model training", token: "Applebot-Extended", class: "control-token", access: "disallow", source: "https://support.apple.com/en-us/119829", note: "Apple says pages can still appear in search results. Effect on Apple Intelligence answers is not documented." },
  /*
   * ALLOWED by deliberate business decision (Wilson/Ben, 2026-10-06, drylake-ops D20), for
   * PUBLIC marketing content only. Google's documentation (google-common-crawlers, updated
   * 2026-07-14, read 2026-10-06) says Google-Extended governs BOTH use of crawled content for
   * training future Gemini models AND grounding in Gemini Apps / Vertex AI API for Gemini, and
   * that it "does not impact a site's inclusion in Google Search nor is it used as a ranking
   * signal". Google offers no way to allow grounding without training, so maximum Gemini
   * discovery requires allowing both. Private surfaces stay disallowed via the "*" group.
   */
  { vendor: "Google", product: "Gemini grounding (Gemini Apps, Vertex AI) and Gemini model training", token: "Google-Extended", class: "control-token", access: "allow", source: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers", note: "Allowed by business decision D20 for public content: one Google token controls both Gemini grounding and Gemini training. Does not affect Google Search, AI Overviews or AI Mode either way." },
];

/* Tokens that receive "Disallow: /". */
export function blockedTokens(): string[] {
  return CRAWLERS.filter((crawler) => crawler.access === "disallow").map((crawler) => crawler.token);
}

export type ContentSignals = Readonly<Record<"search" | "ai-input" | "ai-train", "yes" | "no">>;

export type RobotsGroup = {
  userAgent: string[];
  allow: string[];
  disallow: string[];
  /* Rendered as a Content-Signal line inside the group when present. */
  contentSignals?: ContentSignals;
};

/*
 * Tokens that may use the public site for model training (Ben, 2026-10-08: "Google Gemini can
 * train on our website"; decision D-1). They get their own group ONLY so that its Content-Signal
 * can say ai-train=yes; their fetch rules are generated from the same private prefixes as the
 * "*" group, so access is identical and cannot drift.
 */
export const TRAINING_ALLOWED_TOKENS = ["Google-Extended"] as const;

/*
 * The complete robots.txt policy as data: app/robots.txt/route.ts renders it (robotsText), and the tests evaluate
 * it with an RFC 9309 matcher (lib/discovery/robots-eval.ts), so the crawler matrix is
 * computed from the shipped configuration rather than asserted by hand.
 */
export function robotsGroups(privatePrefixes: readonly string[]): RobotsGroup[] {
  return [
    { userAgent: blockedTokens(), allow: [], disallow: ["/"] },
    {
      userAgent: [...TRAINING_ALLOWED_TOKENS],
      contentSignals: TRAINING_ALLOWED_SIGNALS,
      allow: ["/"],
      disallow: [...privatePrefixes],
    },
    { userAgent: ["*"], contentSignals: CONTENT_SIGNALS, allow: ["/"], disallow: [...privatePrefixes] },
  ];
}

/*
 * Content Signals (contentsignals.org): how content may be USED once fetched, as opposed to
 * whether it may be fetched at all. The "*" group: search and AI search/answers allowed, model
 * training opted out (matching the training-token opt-outs above). Decided by Ben 2026-10-08,
 * together with TRAINING_ALLOWED_SIGNALS for Google-Extended.
 */
export const CONTENT_SIGNALS = {
  search: "yes",
  "ai-input": "yes",
  "ai-train": "no",
} as const satisfies ContentSignals;

/* For TRAINING_ALLOWED_TOKENS only: Gemini may train on the public site (decision D-1). */
export const TRAINING_ALLOWED_SIGNALS = {
  search: "yes",
  "ai-input": "yes",
  "ai-train": "yes",
} as const satisfies ContentSignals;

export function contentSignalLine(signals: ContentSignals = CONTENT_SIGNALS): string {
  const pairs = Object.entries(signals).map(([key, value]) => `${key}=${value}`);

  return `Content-Signal: ${pairs.join(", ")}`;
}

/*
 * Renders robots.txt in the same format Next's MetadataRoute.Robots produced (User-Agent lines,
 * then Allow, then Disallow, a blank line between groups, Sitemap last), plus a Content-Signal
 * line in each group that declares one. MetadataRoute.Robots cannot emit custom directives, which is why
 * app/robots.txt/route.ts renders this text instead.
 */
export function robotsText(groups: readonly RobotsGroup[], sitemapUrl: string): string {
  const blocks = groups.map((group) => {
    const lines = group.userAgent.map((agent) => `User-Agent: ${agent}`);

    if (group.contentSignals) {
      lines.push(contentSignalLine(group.contentSignals));
    }

    lines.push(...group.allow.map((rule) => `Allow: ${rule}`));
    lines.push(...group.disallow.map((rule) => `Disallow: ${rule}`));

    return `${lines.join("\n")}\n`;
  });

  return `${blocks.join("\n")}\nSitemap: ${sitemapUrl}\n`;
}
