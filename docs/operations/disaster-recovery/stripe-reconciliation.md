# Stripe reconciliation and recovery

Stripe is an independent, permanent record of every payment. If the `invoices` table is
restored from an older backup, a webhook was missed, or a row was edited by hand, Stripe tells us
what really happened.

## How the two records link

| Drylake (`invoices`) | Stripe |
|---|---|
| `id` | Checkout Session `metadata.drylake_invoice_id` and `client_reference_id` |
| `organization_id` | `metadata.drylake_organization_id` |
| `invoice_number` | `metadata.drylake_invoice_number` |
| `stripe_checkout_session_id` | Checkout Session `id` (`cs_...`) |
| `stripe_payment_intent_id` | Payment Intent `id` (`pi_...`) |
| `total_cents`, `currency` | `amount_total`, `currency` (must be equal) |
| `status = PAID`, `paid_at` | Written only by the verified webhook on `checkout.session.completed` / `async_payment_succeeded` |

## Read-only report

```bash
STRIPE_SECRET_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
  node scripts/stripe-reconcile.mjs --days 90
```

It only issues GET requests (enforced in code and tested) and prints invoice numbers and Stripe
ids, never keys or card data. Exit code 1 when a HIGH finding exists.

| Finding | Meaning | What to do |
|---|---|---|
| `PAID_IN_STRIPE_NOT_IN_DB` | Client paid; our row is not PAID (missed webhook or restored backup) | **Resend the event** so the normal tested webhook applies it (below). Do not edit the row by hand |
| `AMOUNT_MISMATCH` | Paid amount differs from the stored total | Stop. Compare with the invoice PDF; refund or credit note by hand; record in `audit_logs` via Admin |
| `DUPLICATE_PAYMENT` | Two paid sessions for one invoice | Refund the second in Stripe; the webhook already flags these as anomalies |
| `PAID_SESSION_UNKNOWN_INVOICE` | Stripe has a Drylake payment for an invoice id we do not have | The invoices table is older than the payment: restore or re-create the invoice from the PDF/email, then resend the event |
| `SESSION_ID_MISMATCH` | Invoice PAID, but by a different session than stored | Investigate; usually a second session that also paid (refund) |
| `PAID_IN_DB_NO_STRIPE_SESSION_IN_WINDOW` | PAID with no Stripe payment in the window | Expected for bank transfers marked by hand or payments older than `--days`; widen the window to confirm |

## Replaying payments after an outage or restore

- Stripe retries failed webhook deliveries automatically for **3 days** in live mode.
- Dashboard **Resend** works for events up to **15 days** old; the Stripe CLI
  `stripe events resend <event_id> --webhook-endpoint=<endpoint_id>` up to **30 days**.
- The webhook is idempotent: a re-delivered event for an already-PAID invoice with the same
  session is a no-op (tested in `tests/stripe-payment.test.mjs`).
- Older than 30 days: the Checkout Session and Payment Intent are still readable. Mark the
  invoice paid through Admin with the session id in the audit note. This is the only case for a
  manual PAID, and it needs both founders to agree.

Source: https://docs.stripe.com/webhooks (automatic and manual retries).

## Not built, on purpose

An automatic "fix" that writes PAID from the report. Payment state is written by one path (the
verified webhook) so it can be audited; a second writer would undo that guarantee.
