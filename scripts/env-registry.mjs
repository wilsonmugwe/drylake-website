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
  { name: "CLERK_WEBHOOK_SIGNING_SECRET", exposure: "secret", required: true, readBy: "app/api/clerk/webhook/route.ts (@clerk/nextjs/webhooks)", purpose: "Verifies Clerk webhooks; the email.created event delivers the branded client invitation email" },
  { name: "CLERK_JWT_KEY", exposure: "server", required: false, readBy: "proxy.ts", purpose: "PEM public key for networkless session verification; optional" },
  { name: "NEXT_PUBLIC_CLERK_SIGN_IN_URL", exposure: "public", required: true, readBy: "@clerk/nextjs", purpose: "Must be /sign-in, or Clerk links fall back to the hosted Account Portal" },
  { name: "NEXT_PUBLIC_CLERK_SIGN_UP_URL", exposure: "public", required: true, readBy: "@clerk/nextjs", purpose: "Must be /sign-up (invitation sign-up path)" },

  // Stripe
  { name: "STRIPE_SECRET_KEY", exposure: "secret", required: true, readBy: "lib/stripe.ts", purpose: "Checkout Session creation and retrieval (sk_live_ in production)" },
  { name: "STRIPE_WEBHOOK_SECRET", exposure: "secret", required: true, readBy: "app/api/stripe/webhook/route.ts", purpose: "Verifies webhook signatures; the only path that marks an invoice PAID" },

  // Email (Resend)
  { name: "RESEND_API_KEY", exposure: "secret", required: true, readBy: "lib/email/resend.ts", purpose: "Invoice and contact email delivery" },
  { name: "EMAIL_FROM", exposure: "server", required: true, readBy: "lib/email/resend.ts", purpose: "Verified sender on a Resend-authenticated drylake.com.au subdomain" },
  { name: "CONTACT_EMAIL_FROM", exposure: "server", required: false, readBy: "lib/email/contact-enquiry.ts", purpose: "Optional sender for website enquiries; defaults to EMAIL_FROM's address as \"Drylake website enquiries\"" },
  { name: "CONTACT_TO_EMAIL", exposure: "server", required: true, readBy: "lib/email/contact-enquiry.ts", purpose: "Inbox that receives website and portal enquiries" },

  // Consultation booking (docs/operations/consultations.md)
  { name: "CONSULTATION_TOKEN_SECRET", exposure: "secret", required: true, readBy: "lib/consultations/token.ts (via app/api/consultations, app/api/admin/consultations, lib/consultations/dispatch-server.ts)", purpose: "HMAC key for customer appointment-management links (32+ random characters). Rotating it revokes every outstanding link" },
  { name: "CRON_SECRET", exposure: "secret", required: true, readBy: "app/api/cron/consultation-notifications/route.ts", purpose: "Bearer secret for the consultation email dispatcher (Vercel Cron sends it automatically; pg_cron reads it from Supabase Vault)" },
  { name: "CONSULTATION_CALENDAR_PROVIDER", exposure: "server", required: false, readBy: "lib/consultations/calendar/provider.ts", purpose: "\"none\" (default: Drylake bookings only, no Outlook events) or \"microsoft\" (Microsoft 365 free/busy, events, Teams links). Set to microsoft only after the MS_GRAPH_* app is scoped and tested (docs/operations/consultations.md)" },
  { name: "MS_GRAPH_TENANT_ID", exposure: "server", required: false, readBy: "lib/consultations/calendar/microsoft-graph.ts (via provider.ts)", purpose: "Drylake Microsoft 365 (Entra) tenant id; required when CONSULTATION_CALENDAR_PROVIDER=microsoft" },
  { name: "MS_GRAPH_CLIENT_ID", exposure: "server", required: false, readBy: "lib/consultations/calendar/microsoft-graph.ts (via provider.ts)", purpose: "App registration (client) id of the consultation calendar app; required when CONSULTATION_CALENDAR_PROVIDER=microsoft" },
  { name: "MS_GRAPH_CLIENT_SECRET", exposure: "secret", required: false, readBy: "lib/consultations/calendar/microsoft-graph.ts (via provider.ts)", purpose: "Client secret of the consultation calendar app (expires: put the expiry on the calendar); scoped by Exchange RBAC for Applications to the two consultation mailboxes only" },
  { name: "CONSULTATION_EMAIL_FROM", exposure: "server", required: false, readBy: "lib/consultations/dispatch-server.ts", purpose: "Optional sender for consultation emails; defaults to EMAIL_FROM's address as \"Drylake consultations\"" },

  // Review requests (/admin/reviews, /feedback)
  { name: "FEEDBACK_EMAIL_FROM", exposure: "server", required: false, readBy: "lib/email/review-request.ts", purpose: "Optional sender for review request emails; defaults to EMAIL_FROM's address as \"Drylake Feedback\". Replies go to hello@drylake.com.au" },
  { name: "REVIEW_PLATFORM_URL", exposure: "server", required: false, readBy: "lib/email/review-request.ts, app/feedback/page.tsx, components/reviews/ApprovedQuotes.tsx", purpose: "Optional https link to a review platform Drylake does not control (for example a Google Business Profile review link). Shown only when set; the site never copies reviews from it" },
  // Collaborate With Drylake (/collaborate)
  { name: "COLLABORATION_EMAIL_FROM", exposure: "server", required: false, readBy: "lib/email/collaboration.ts", purpose: "Optional sender for collaboration emails; defaults to EMAIL_FROM's address as \"Drylake Partnerships\". Replies go to hello@drylake.com.au" },
  { name: "COLLABORATION_ABBICARE_ENABLED", exposure: "server", required: false, readBy: "lib/collaboration/projects.ts", purpose: "Owner-gated, default off. Leave unset until the owners of the named organisation give written permission; \"true\" adds it as a project option and shows a neutral section on /collaborate (needs a redeploy)" },

  // Cloudflare Turnstile
  { name: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", exposure: "public", required: true, readBy: "components/forms/ProjectForm.tsx, components/collaboration/CollaborationForm.tsx, components/client/MessageDrylake.tsx", purpose: "Turnstile widget site key" },
  { name: "TURNSTILE_SECRET_KEY", exposure: "secret", required: true, readBy: "lib/contact/turnstile.ts", purpose: "Server-side Turnstile verification" },
  { name: "TURNSTILE_ALLOWED_HOSTNAMES", exposure: "server", required: false, readBy: "lib/contact/turnstile.ts", purpose: "Extra hostnames accepted in Turnstile responses" },

  // Canonical origin and search verification
  { name: "APP_BASE_URL", exposure: "server", required: false, readBy: "lib/invoices/invoice-url.ts, lib/clients/invitations.ts", purpose: "Canonical origin for emailed links; defaults to https://drylake.com.au. Leave unset in production" },
  { name: "GOOGLE_SITE_VERIFICATION", exposure: "server", required: false, readBy: "app/layout.tsx", purpose: "Search Console HTML-tag token (public by design)" },
  { name: "BING_SITE_VERIFICATION", exposure: "server", required: false, readBy: "app/layout.tsx", purpose: "Bing Webmaster HTML-tag token (public by design)" },

  // Platform
  { name: "VERCEL_ENV", exposure: "platform", required: false, readBy: "lib/clients/invitations.ts (via process.env)", purpose: "production | preview | development" },
  { name: "VERCEL_REGION", exposure: "platform", required: false, readBy: "lib/perf/request-timing.ts, lib/health/health-report.ts", purpose: "Region in timing logs and /api/health; must read syd1 in production" },
  { name: "VERCEL_GIT_COMMIT_SHA", exposure: "platform", required: false, readBy: "lib/health/health-report.ts", purpose: "Deployed commit, shortened in /api/health" },
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
