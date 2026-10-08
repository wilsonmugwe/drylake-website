/*
 * Markdown for agents, part 2: HTML to Markdown conversion. PURE (tests import it).
 *
 * An agent that sends "Accept: text/markdown" (preferred over text/html) for a public page gets
 * a clean Markdown version of that page's <main id="main-content">, instead of the HTML a
 * browser gets. proxy.ts decides (shouldServeMarkdown) and rewrites to app/api/markdown, which
 * fetches the page's own HTML and converts it here (pageToMarkdown).
 *
 * Safety contract:
 *   - Only paths that EXACTLY match a PUBLIC_PAGES path are ever converted. Private surfaces
 *     (/admin, /client, /portal, /sign-in, /sign-up, /api) are not in PUBLIC_PAGES, so they are
 *     never served as Markdown, and the route cannot be used to fetch an arbitrary URL.
 *   - Browsers never send text/markdown, so they keep getting HTML.
 */

import { parse, type HTMLElement } from "node-html-parser";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { SITE_URL, absoluteUrl } from "./entity.ts";

export {
  MARKDOWN_CONTENT_TYPE,
  MARKDOWN_FETCH_HEADER,
  estimateTokens,
  isMarkdownPath,
  prefersMarkdown,
  shouldServeMarkdown,
} from "./markdown-negotiation.ts";

/* Chrome and decoration that carry no page content. */
const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "nav",
  "footer",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "iframe",
  '[aria-hidden="true"]',
  "[hidden]",
  'img[alt=""]',
].join(", ");

function absolutise(main: HTMLElement): void {
  for (const element of main.querySelectorAll("a[href], img[src]")) {
    const attribute = element.tagName === "A" ? "href" : "src";
    const value = element.getAttribute(attribute) ?? "";

    if (value.startsWith("/") && !value.startsWith("//")) {
      element.setAttribute(attribute, `${SITE_URL}${value}`);
    }
  }
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

function elementChildren(element: HTMLElement): HTMLElement[] {
  return element.childNodes.filter((node) => node.nodeType === ELEMENT_NODE) as HTMLElement[];
}

/*
 * Layout markup leans on CSS that Markdown does not have, so text glues together:
 *   - Card links wrap a title and a description in one <a> ("Custom software developmentInternal
 *     platforms..."). Each becomes "[title](href): description".
 *   - Adjacent elements with no whitespace between them (stacked spans in a headline, a flex row
 *     of tel + mailto links) get a space, or " · " between two links.
 */
function separateLayoutText(main: HTMLElement): void {
  for (const link of main.querySelectorAll("a[href]")) {
    const parts = elementChildren(link);
    const looseText = link.childNodes.some(
      (node) => node.nodeType === TEXT_NODE && node.rawText.trim().length > 0
    );

    if (parts.length >= 2 && !looseText) {
      const [title, ...rest] = parts;
      const href = (link.getAttribute("href") ?? "").replace(/"/g, "&quot;");
      const detail = rest.map((part) => part.innerHTML.trim()).filter(Boolean).join(" ");
      const label = `<a href="${href}">${title.innerHTML.trim()}</a>`;

      link.replaceWith(`<p>${detail ? `${label}: ${detail}` : label}</p>`);
    }
  }

  for (const element of main.querySelectorAll("*")) {
    const next = element.nextSibling;

    if (next && next.nodeType === ELEMENT_NODE) {
      const bothLinks = element.tagName === "A" && (next as HTMLElement).tagName === "A";

      element.insertAdjacentHTML("afterend", bothLinks ? " · " : " ");
    }
  }
}

export type PageMarkdown = { title: string; canonical: string; markdown: string };

/*
 * Converts a rendered page to Markdown: "# <title>", a "Source: <canonical URL>" line, then the
 * page's <main id="main-content"> with chrome and decoration removed. Returns null when the page
 * has no main-content element (nothing safe to convert).
 */
export function pageToMarkdown(html: string, path: string): PageMarkdown | null {
  const root = parse(html);
  const main = root.querySelector("main#main-content");

  if (!main) {
    return null;
  }

  for (const element of main.querySelectorAll(STRIP_SELECTORS)) {
    element.remove();
  }

  absolutise(main);
  separateLayoutText(main);

  const title = root.querySelector("title")?.text.trim() || "Drylake";
  const canonicalHref = root.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const canonical = canonicalHref?.startsWith(SITE_URL) ? canonicalHref : absoluteUrl(path);
  const body = NodeHtmlMarkdown.translate(main.innerHTML, { maxConsecutiveNewlines: 2 }).trim();

  return {
    title,
    canonical,
    markdown: `# ${title}\n\nSource: ${canonical}\n\n${body}\n`,
  };
}
