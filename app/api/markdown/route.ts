import type { NextRequest } from "next/server";

import {
  MARKDOWN_CONTENT_TYPE,
  MARKDOWN_FETCH_HEADER,
  estimateTokens,
  isMarkdownPath,
  pageToMarkdown,
} from "@/lib/discovery/markdown";

/*
 * Markdown version of a PUBLIC page, reached only through the proxy.ts rewrite when an agent
 * asks for text/markdown (lib/discovery/markdown.ts has the rules). Lives under /api, which
 * robots.txt disallows and next.config.ts marks noindex, so it is never indexed in its own right.
 *
 * Not an open fetcher: "path" must exactly match a PUBLIC_PAGES path, and the page is fetched
 * from this deployment's own origin, never from a caller-supplied host.
 */
export const dynamic = "force-dynamic";

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  // Behind the proxy rewrite, nextUrl still carries the ORIGINAL request URL (/services), so the
  // query the proxy added is not visible here; the pathname is. A direct call to /api/markdown
  // uses ?path=. Either way the value must pass the exact public-page allowlist below.
  const { pathname, searchParams } = request.nextUrl;
  const path = pathname === "/api/markdown" ? searchParams.get("path") : pathname;

  if (!isMarkdownPath(path)) {
    return plain(404, "Not found");
  }

  let html: string;

  try {
    const upstream = await fetch(new URL(path, request.nextUrl.origin), {
      headers: { Accept: "text/html", [MARKDOWN_FETCH_HEADER]: "1" },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return plain(502, "Page unavailable");
    }

    html = await upstream.text();
  } catch {
    return plain(502, "Page unavailable");
  }

  const page = pageToMarkdown(html, path);

  if (!page) {
    return plain(502, "Page unavailable");
  }

  return new Response(page.markdown, {
    headers: {
      "Content-Type": MARKDOWN_CONTENT_TYPE,
      "Cache-Control": "public, s-maxage=3600",
      Vary: "Accept",
      "x-markdown-tokens": String(estimateTokens(page.markdown)),
      Link: `<${page.canonical}>; rel="canonical"`,
    },
  });
}
