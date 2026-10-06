/*
 * IndexNow (https://www.indexnow.org). One POST tells every participating engine (Bing,
 * Yandex, Seznam, Naver, Yep, and others listed at indexnow.org/searchengines.json) that
 * URLs changed. Google does not participate; Google discovers changes via the sitemap.
 *
 * The key is PUBLIC by design: engines prove site ownership by fetching
 * https://drylake.com.au/<key>.txt and comparing its content to the key in the submission.
 * It is not a secret and grants nothing except the right to submit URLs for this host.
 * public/<key>.txt must contain exactly this value (tests/discoverability.test.mjs).
 *
 * Only canonical public production URLs can ever be submitted: a URL is kept only if it is
 * EXACTLY one of the PUBLIC_PAGES canonicals (https, drylake.com.au, no www, no query, no
 * fragment). That rules out private paths, Vercel preview/staging hosts, localhost and any
 * URL a tampered sitemap might list.
 */

import { PUBLIC_PAGES, absoluteUrl } from "./entity.ts";

export const INDEXNOW_KEY = "81ebccabf60ea274ff01b3265b24c197";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_HOST = "drylake.com.au";

/* IndexNow accepts up to 10,000 URLs per request. */
export const INDEXNOW_MAX_URLS = 10_000;

const CANONICAL_PUBLIC_URLS = new Set(PUBLIC_PAGES.map((page) => absoluteUrl(page.path)));

export function isSubmittableUrl(url: string): boolean {
  return CANONICAL_PUBLIC_URLS.has(url);
}

export function indexNowPayload(urls: readonly string[]) {
  return {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: [...new Set(urls.filter(isSubmittableUrl))].slice(0, INDEXNOW_MAX_URLS),
  };
}
