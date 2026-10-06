/*
 * Registry of every environment variable the Drylake app reads, with NAMES ONLY.
 * Never put a value in this file.
 *
 * Why it exists: production configuration lived only in the Vercel dashboard, so nobody could
 * say which variables were required, which were safe to expose, or which were left over.
 * tests/production-readiness.test.mjs fails when code reads a variable that is not listed
 * here, and scripts/check-env.mjs audits a pulled environment against it.
 *
 * Fields:
 *   exposure  "public"   inlined into the browser bundle (NEXT_PUBLIC_*); must not be secret.
 *             "server"   server only, not secret (addresses, hostnames, public PEM).
 *             "secret"   server only and confidential.
 *             "platform" set by Vercel itself; never configure by hand.
 *   required  true when production breaks or degrades without it.
 *   readBy    where it is read. "@clerk/nextjs" means the SDK reads it implicitly.
 */

export const ENV_REGISTRY = [
  // Supabase
  { name: "NEXT_PUBLIC_SUPABASE_URL", exposure: "public", required: true, readBy: "lib/supabase/server.ts, lib/supabase/admin.ts", purpose: "Supabase project URL (ap-southeast-2)" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", exposure: "public", required: true, readBy: "lib/supabase/server.ts", purpose: "Publishable key; every client query is RLS-bound through the Clerk token" },
  { name: "SUPABASE_SECRET_KEY", exposure: "secret", required: true, readBy: "lib/supabase/admin.ts (server-only)", purpose: "Service-role access for admin APIs and the Stripe webhook; bypasses RLS" },

  // Clerk
  { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", exposure: "public", required: true, readBy: "@clerk/nextjs", purpose: "Clerk frontend key (pk_live_ in production)" },
  { name: "CLERK_SECRET_KEY", exposure: "secret", required: true, readBy: "@clerk/nextjs", purpose: "Clerk Backend API: organisations, invitations, memberships" },
  { name: "CLERK_JWT_KEY", exposure: "server", required: false, readBy: "proxy.ts", purpose: "PEM public key for networkless session verification; optional" },
  { name: "NEXT_PUBLIC_CLERK_SIGN_IN_URL", exposure: "public", required: true, readBy: "@clerk/nextjs", purpose: "Must be /sign-in, or Clerk links fall back to the hosted Account Portal" },
  { name: "NEXT_PUBLIC_CLERK_SIGN_UP_URL", exposure: "public", required: true, readBy: "@clerk/nextjs", purpose: "Must be /sign-up (invitation sign-up path)" },

  // Stripe
  { name: "STRIPE_SECRET_KEY", exposure: "secret", required: true, readBy: "lib/stripe.ts", purpose: "Checkout Session creation and retrieval (sk_live_ in production)" },
  { name: "STRIPE_WEBHOOK_SECRET", exposure: "secret", required: true, readBy: "app/api/stripe/webhook/route.ts", purpose: "Verifies webhook signatures; the only path that marks an invoice PAID" },

  // Email (Resend)
  { name: "RESEND_API_KEY", exposure: "secret", required: true, readBy: "lib/email/resend.ts", purpose: "Invoice and contact email delivery" },
  { name: "EMAIL_FROM", exposure: "server", required: true, readBy: "lib/email/resend.ts", purpose: "Verified sender on a Resend-authenticated drylake.com.au subdomain" },
  { name: "CONTACT_TO_EMAIL", exposure: "server", required: true, readBy: "lib/email/contact-enquiry.ts", purpose: "Inbox that receives website and portal enquiries" },

  // Cloudflare Turnstile
  { name: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", exposure: "public", required: true, readBy: "components/forms/ProjectForm.tsx, components/client/MessageDrylake.tsx", purpose: "Turnstile widget site key" },
  { name: "TURNSTILE_SECRET_KEY", exposure: "secret", required: true, readBy: "lib/contact/turnstile.ts", purpose: "Server-side Turnstile verification" },
  { name: "TURNSTILE_ALLOWED_HOSTNAMES", exposure: "server", required: false, readBy: "lib/contact/turnstile.ts", purpose: "Extra hostnames accepted in Turnstile responses" },

  // Canonical origin and search verification
  { name: "APP_BASE_URL", exposure: "server", required: false, readBy: "lib/invoices/invoice-url.ts, lib/clients/invitations.ts", purpose: "Canonical origin for emailed links; defaults to https://drylake.com.au. Leave unset in production" },
  { name: "GOOGLE_SITE_VERIFICATION", exposure: "server", required: false, readBy: "app/layout.tsx", purpose: "Search Console HTML-tag token (public by design)" },
  { name: "BING_SITE_VERIFICATION", exposure: "server", required: false, readBy: "app/layout.tsx", purpose: "Bing Webmaster HTML-tag token (public by design)" },

  // Platform
  { name: "VERCEL_ENV", exposure: "platform", required: false, readBy: "lib/clients/invitations.ts (via process.env)", purpose: "production | preview | development" },
  { name: "VERCEL_REGION", exposure: "platform", required: false, readBy: "lib/perf/request-timing.ts", purpose: "Region in timing logs; must read syd1 in production" },
];

/* Names from earlier Supabase/Clerk/Stripe conventions. Present in an environment = obsolete. */
export const KNOWN_OBSOLETE = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

/* Variables Vercel/Next/npm inject that are not app configuration. */
export const PLATFORM_PREFIXES = ["VERCEL", "NX_", "TURBO_", "NODE_", "NEXT_RUNTIME", "npm_"];

const SECRET_WORDS = /(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|TOKEN|API_KEY)/;

export function looksSecret(name) {
  return SECRET_WORDS.test(name);
}
