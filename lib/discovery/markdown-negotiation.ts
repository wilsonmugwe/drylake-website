/*
 * Markdown for agents, part 1: content negotiation. PURE and dependency-free, because proxy.ts
 * imports it and the proxy bundle must stay small. Conversion lives in markdown.ts.
 *
 * Safety contract:
 *   - Only paths that EXACTLY match a PUBLIC_PAGES path are ever converted. Private surfaces
 *     (/admin, /client, /portal, /sign-in, /sign-up, /api) are not in PUBLIC_PAGES, so they are
 *     never served as Markdown, and the route cannot be used to fetch an arbitrary URL.
 *   - Browsers never send text/markdown, so they keep getting HTML.
 */

import { PUBLIC_PAGES } from "./entity.ts";

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

/* Sent on the internal self-fetch so the proxy can never rewrite it back to Markdown. */
export const MARKDOWN_FETCH_HEADER = "x-drylake-markdown-fetch";

const MARKDOWN_PATHS: ReadonlySet<string> = new Set(PUBLIC_PAGES.map((page) => page.path));

/* Exact match only: no trailing-slash, query, encoding or prefix variants. */
export function isMarkdownPath(path: string | null | undefined): path is string {
  return typeof path === "string" && MARKDOWN_PATHS.has(path);
}

type MediaRange = { type: string; q: number };

function parseAccept(accept: string): MediaRange[] {
  return accept
    .split(",")
    .map((part) => {
      const [type = "", ...params] = part.split(";").map((piece) => piece.trim().toLowerCase());
      const qParam = params.find((param) => param.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;

      return { type, q: Number.isFinite(q) ? Math.min(Math.max(q, 0), 1) : 0 };
    })
    .filter((range) => range.type.length > 0);
}

function qualityOf(ranges: readonly MediaRange[], type: string): number {
  const match = ranges.find((range) => range.type === type);

  return match ? match.q : 0;
}

/*
 * True when the Accept header explicitly asks for text/markdown at a quality at least as high
 * as text/html. Wildcards (*\/*, text/*) never select Markdown: only an explicit request does.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) {
    return false;
  }

  const ranges = parseAccept(accept);
  const markdown = qualityOf(ranges, "text/markdown");

  return markdown > 0 && markdown >= qualityOf(ranges, "text/html");
}

export function shouldServeMarkdown(input: {
  method: string;
  pathname: string;
  accept: string | null;
  internalFetch: boolean;
}): boolean {
  return (
    (input.method === "GET" || input.method === "HEAD") &&
    !input.internalFetch &&
    isMarkdownPath(input.pathname) &&
    prefersMarkdown(input.accept)
  );
}

/* Rough token estimate for the x-markdown-tokens header (about four characters a token). */
export function estimateTokens(markdown: string): number {
  return Math.ceil(markdown.length / 4);
}
