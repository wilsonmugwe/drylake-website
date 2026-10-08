# Stripe security review

## Who decides the amount

The browser sends only an invoice UUID. `POST /api/stripe/checkout`:
1. requires a Clerk session **and** an active organisation;
2. reads the organisation (`status = 'ACTIVE'`) and the invoice through the user's **RLS
   client**, with explicit `organization_id`, `visible_to_client = true` and `status <> DRAFT`
   filters;
3. `evaluateCheckout()` takes the **stored** `total_cents` (GST-inclusive) and refuses any
   invoice whose stored total disagrees with `subtotal_cents + tax_cents`, a non-AUD
   currency, or a non-payable status;
4. creates one line item with `unit_amount` = that stored total.

Nothing from the request body reaches the amount, currency, description or URLs. Tested in
`tests/invoice-payment-flow.test.mjs` ("Stripe charges the GST-inclusive total").

## Checkout session handling

| Concern | Behaviour |
|---|---|
| Ownership | Metadata carries invoice id, invoice number and organisation id; the webhook re-checks all three against the database |
| Re-use | An open, matching, fresh session is re-used; a stale or changed one is expired first (`decideSessionReuse`) |
| Double click / concurrency | Idempotency key per invoice state; the stored session id is written conditionally, so a second concurrent session is expired and the caller told payment is processing |
| Success / cancel URLs | Built server-side from the canonical invoice path; the success return **never** marks anything paid |

## Webhook: the only writer of PAID

Verified by test: `status: "PAID"` appears in exactly one file under `app/`
(`app/api/stripe/webhook/route.ts`).

| Scenario | Result | Where proven |
|---|---|---|
| Missing signature | 400 | `tests/security-hardening.test.mjs` (new) |
| Invalid signature / wrong secret / tampered body | 400 | same (new, using Stripe's own test-header generator offline) |
| Replay of a captured delivery older than 300 s | 400 | same (new) |
| Missing `STRIPE_WEBHOOK_SECRET` | 500 (Stripe retries until fixed) | same (new) |
| Duplicate event / replay within the window | no second write; same session converges to ALREADY_PAID | `tests/stripe-payment.test.mjs` |
| Unknown invoice / other organisation's invoice | rejected, recorded as `INVOICE_PAYMENT_ANOMALY` for a human | `tests/stripe-payment.test.mjs` |
| Already-paid invoice, different paid session | flagged duplicate payment (anomaly), invoice unchanged | `tests/stripe-payment.test.mjs` |
| Mismatched metadata (non-UUID, inconsistent) | logged as malformed, not applied | `tests/stripe-payment.test.mjs` |
| Amount or currency mismatch | rejected as anomaly | `tests/stripe-payment.test.mjs` |
| Unexpected event type | 200, ignored | `tests/stripe-payment.test.mjs` (classify) + route |
| Database failure | 500 so Stripe retries; an anomaly that cannot be recorded also retries | route (`TransientWebhookError`) |
| Async payment failed / session expired | stored session released; invoice stays outstanding; PAID never moves backwards | `tests/stripe-payment.test.mjs` |

## Residual items

- Stripe test events are refused in production because they are signed with the test-mode
  secret. That signature check is the only test-versus-live guard: `evaluateSettlement` rejects a
  Checkout Session whose Checkout `mode` is not `payment` (`UNEXPECTED_MODE`), which is a different
  thing, and no code compares `event.livemode` with the environment (anomaly rows record it).
  Corrected 2026-10-08; an explicit livemode check is listed as deferred in
  `docs/code-quality/2026-10-08-review.md`.
- Webhook endpoint events and secret are dashboard configuration (Wilson, acceptance S6).
