# Secrets recovery inventory (names only)

**Never put a value in this file.** It lists which secrets exist, where each is issued, who can
reissue it, and what to redeploy. Variable details: `scripts/env-registry.mjs`.

| Secret (env var) | Issued in | Who can reissue today | After reissue | If leaked |
|---|---|---|---|---|
| `SUPABASE_SECRET_KEY` | Supabase > Project Settings > API keys | Wilson | Update Vercel, redeploy | Bypasses RLS: rotate immediately, review `audit_logs` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > API keys | Wilson | Update Vercel, redeploy | Public by design; RLS protects data |
| Supabase database password (not an app env var) | Supabase > Database settings | Wilson | Update any stored connection strings (none in the app) | Reset password |
| `CLERK_SECRET_KEY` | Clerk > API keys (production instance) | Wilson | Update Vercel, redeploy | Can create orgs and invitations: rotate, review Clerk logs |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_KEY` | Clerk > API keys | Wilson | Update Vercel, redeploy | Public / public PEM |
| `STRIPE_SECRET_KEY` | Stripe > Developers > API keys (live) | Wilson (Stripe account owner) | Update Vercel, redeploy | Roll the key in Stripe; review payments and refunds |
| `STRIPE_WEBHOOK_SECRET` | Stripe > Webhooks > endpoint > Roll secret (old secret can stay valid up to 24 h) | Wilson | Update Vercel, redeploy within the overlap | Roll; replay any events rejected during the switch |
| `RESEND_API_KEY` | Resend > API keys | Wilson | Update Vercel, redeploy | Delete the key in Resend (spoofed mail risk) |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare > Turnstile > widget | Wilson | Update Vercel, redeploy | Rotate secret key |
| `EMAIL_FROM`, `CONTACT_TO_EMAIL`, `APP_BASE_URL`, verification tokens | Not secret; set in Vercel | Wilson, Ben | Redeploy | n/a |
| GitHub access | GitHub `wilsonmugwe` (owner), `MshikadauMgigi` (collaborator) | Wilson | n/a | Revoke tokens, rotate PATs |
| Synergy Wholesale (registrar + DNS) | Synergy reseller account | **Ben** | n/a | Reset password, check DNS and transfer lock |
| Microsoft 365 global admin | Microsoft admin centre | Wilson | n/a | Reset, review sign-in logs |

## Single-person dependencies (fix: W7)

Every row except Synergy depends on **Wilson alone**. Add Ben as a second owner/admin (with MFA)
on Supabase, Vercel, Clerk, Stripe, Resend, Cloudflare and M365, and Wilson as a contact on
Synergy, so either founder can restore, roll back or rotate a key.

## Where values live

Only in each vendor's dashboard and in Vercel. Not in the repo, not in chat, not in email.
A password manager entry per account (login + MFA recovery codes) is the recovery path for the
accounts themselves; a value lost from Vercel is reissued at the vendor, never recovered.
