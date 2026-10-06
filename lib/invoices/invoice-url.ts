/*
 * The ONE builder for links to a client invoice. Pure (tests/invoice-url.test.mjs).
 *
 * Used by: the invoice email (button AND plain link: same string), Stripe Checkout
 * success/cancel URLs, and the client invoice page's sign-in / workspace return target.
 *
 * Why an absolute base URL and not the request: the email used to take its host from the
 * admin's POST (request.url). Any admin session on a preview deployment, a vercel.app
 * alias or localhost then mailed the client a link to a host they cannot use. Emails now
 * always point at the canonical production origin (APP_BASE_URL, default drylake.com.au).
 */

export const DEFAULT_APP_BASE_URL = "https://drylake.com.au";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clientInvoicePath(invoiceId: string): string {
  if (!UUID_PATTERN.test(invoiceId)) {
    throw new RangeError("Invoice links require the invoice UUID.");
  }

  return `/client/billing/${invoiceId.toLowerCase()}`;
}

/*
 * Canonical origin for links that leave the app (email). Accepts only an https origin, or
 * http://localhost for local development; anything else falls back to the default so a
 * typo can never mail clients a broken or foreign host.
 */
export function appBaseUrl(env: Record<string, string | undefined>): string {
  const raw = env.APP_BASE_URL?.trim();

  if (!raw) {
    return DEFAULT_APP_BASE_URL;
  }

  try {
    const url = new URL(raw);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);

    if (url.protocol !== "https:" && !local) {
      return DEFAULT_APP_BASE_URL;
    }

    return url.origin;
  } catch {
    return DEFAULT_APP_BASE_URL;
  }
}

export function clientInvoiceUrl(invoiceId: string, baseUrl: string): string {
  return new URL(clientInvoicePath(invoiceId), baseUrl).toString();
}

/* Sign-in URL that returns to the invoice. Mirrors lib/auth/guards.ts signInUrl. */
export function invoiceSignInPath(invoiceId: string): string {
  return `/sign-in?redirect_url=${encodeURIComponent(clientInvoicePath(invoiceId))}`;
}
