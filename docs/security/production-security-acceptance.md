# Production security acceptance (PR 2)

Run after this PR deploys. Each step says who does it and what result passes. Do not run
anything destructive against production; no live Stripe charges are needed for these steps.
Space scripted requests at least 12 seconds apart (the Vercel firewall rate-limits bursts).

## S1. Deploy and headers (anyone)

```bash
curl -sI https://drylake.com.au/ | grep -i content-security-policy
```
Pass: the policy contains `object-src 'none'`, `base-uri 'self'` and `frame-ancestors 'none'`,
and still lists `challenges.cloudflare.com`, `js.stripe.com` and the Clerk hosts.

## S2. Cross-origin mutation refused (anyone)

```bash
curl -s -w ' %{http_code}\n' -X POST -H 'Origin: https://evil.example' \
  -H 'Content-Type: application/json' -d '{}' https://drylake.com.au/api/contact
# wait 12 s
curl -s -w ' %{http_code}\n' -X POST -H 'Origin: https://evil.example' -d '{}' \
  https://drylake.com.au/api/stripe/webhook
```
Pass: first returns `403 {"success":false,"error":"Forbidden"}`; second returns
`400 {"error":"Missing Stripe signature"}` (the webhook is exempt and still refuses unsigned
calls).

Then, in a browser, submit the real contact form once (Ben ticks Turnstile). Pass: the
enquiry is accepted as before.

## S3. Sign-in redirect stays on site (Wilson, browser)

Open `https://drylake.com.au/sign-in?redirect_url=https://example.com` and sign in with a
test client account. Pass: you land on a drylake.com.au page, never example.com.

## S4. Cross-tenant tampering (Wilson, two test client workspaces)

Needs two ACTIVE test clients, A and B, each with one project, one visible document and one
issued invoice. Note B's real project, document and invoice UUIDs from admin. Signed in as
A's user:

| Request | Pass |
|---|---|
| `/client/projects/<B project UUID>` | not found / no B data |
| `/client/billing/<B invoice UUID>` | not found |
| `/api/client/documents/<B document UUID>/download` | `404 Document not found` |
| Browser console: `fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({invoiceId:'<B invoice UUID>'})}).then(r=>r.json())` | `INVOICE_NOT_FOUND` |
| A's own DRAFT invoice UUID at `/client/billing/<id>` | not found |
| A hidden document of A's own project at the download route | `404` |
| `/admin` | redirected to `/client` |
| Console: `fetch('/api/admin/clients',{method:'POST',body:new FormData()}).then(r=>r.status)` | `403` |

## S5. RLS inventory (Wilson, Supabase SQL editor, read-only)

Run `docs/security/sql/rls-inventory.sql` section by section and send the result grids to
Claude. Pass criteria are in `rls-and-tenant-isolation.md` ("Any of the following in the
results is a finding").

## S6. Stripe configuration (Wilson, Stripe dashboard)

Developers > Webhooks > the `https://drylake.com.au/api/stripe/webhook` endpoint:
- events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`,
  `payment_intent.payment_failed`;
- the endpoint's signing secret equals Vercel's `STRIPE_WEBHOOK_SECRET` (live mode);
- recent deliveries show `200` for real events and no run of `400`s (a run of `400`s means
  the secrets disagree, and payments would never be marked PAID);
- step S2 already proved an unsigned delivery is refused with `400`.

## S7. Rate limiting (Wilson, Vercel dashboard)

Firewall > Rules: confirm a rate-limit rule covers `POST /api/contact` (for example 5 per
minute per IP) and consider `POST /api/stripe/checkout` and `/api/client/*` (for example 30
per minute per IP). Pass: rules exist and are enabled. Record the values in the PR thread.

## S8. Secrets (Wilson)

- Vercel > Settings > Environment Variables: no secret has a `NEXT_PUBLIC_` name;
  `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`,
  `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` are set for Production only (not exposed to
  Preview unless needed).
- If any secret was ever pasted into chat, email or a ticket, rotate it now.
