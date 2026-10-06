/*
 * Pure: decide how an API route should answer an unauthenticated request.
 *
 * Admin forms post natively (a document navigation), where a 303 to sign-in is the only
 * useful answer. fetch()/XHR callers and scripts get a 401 JSON body instead, so a
 * protected API never answers a programmatic caller with an HTML redirect.
 * Either way no data is returned. Tested in tests/auth-request-kind.test.mjs.
 */

type HeaderSource = { get(name: string): string | null };

export function isDocumentNavigation(headers: HeaderSource): boolean {
  const mode = headers.get("sec-fetch-mode");

  if (mode) {
    return mode === "navigate";
  }

  const accept = headers.get("accept") ?? "";

  return accept.includes("text/html");
}

/*
 * Same-origin relative path only; anything else becomes the fallback.
 * Control characters and whitespace are refused outright: browsers strip tab and newline
 * from URLs, so "/\t/evil.example" would otherwise become the protocol-relative
 * "//evil.example" after the check passed.
 */
export function safeReturnPath(value: unknown, fallback = "/portal"): string {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\") &&
    !/[\x00-\x20\x7F]/.test(value)
    ? value
    : fallback;
}
