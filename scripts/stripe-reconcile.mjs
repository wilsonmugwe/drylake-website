/*
 * READ-ONLY Stripe <-> Drylake invoice reconciliation (PR 3, disaster recovery).
 *
 * Stripe is an independent record of every payment. If the invoices table is restored from an
 * older backup, a webhook was missed, or a row was edited by hand, this report shows where the
 * two disagree. It NEVER writes: every HTTP call goes through `readOnlyFetch`, which refuses any
 * method other than GET. Fixing a mismatch is a human decision (runbook:
 * docs/operations/disaster-recovery/stripe-reconciliation.md), usually by resending the Stripe
 * event so the normal, tested webhook path applies it.
 *
 * Run (Wilson, with production keys exported in the shell, never pasted into a file):
 *   STRIPE_SECRET_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
 *     node scripts/stripe-reconcile.mjs --days 90
 * Output names invoice numbers and Stripe ids only. No keys, card or customer details.
 * Tests: tests/disaster-recovery.test.mjs
 */

import { pathToFileURL } from "node:url";

export const METADATA_INVOICE_ID = "drylake_invoice_id";

/* Every network call in this script goes through here. GET only, by construction. */
export async function readOnlyFetch(url, init = {}, fetchImpl = globalThis.fetch) {
  const method = (init.method ?? "GET").toUpperCase();

  if (method !== "GET") {
    throw new Error(`readOnlyFetch refuses ${method}: reconciliation never writes`);
  }

  if (init.body !== undefined) {
    throw new Error("readOnlyFetch refuses a request body");
  }

  return fetchImpl(url, { ...init, method: "GET" });
}

/*
 * Pure comparison. `invoices` are rows from public.invoices; `sessions` are Stripe Checkout
 * Session objects (id, payment_status, amount_total, currency, metadata, payment_intent).
 * Returns findings sorted by severity; an empty list means the two records agree.
 */
export function reconcile({ invoices, sessions }) {
  const findings = [];
  const byId = new Map(invoices.map((i) => [i.id, i]));
  const paidSessionsByInvoice = new Map();

  for (const s of sessions) {
    const invoiceId = s.metadata?.[METADATA_INVOICE_ID];
    if (!invoiceId) continue; // not a Drylake session
    if (s.payment_status !== "paid") continue;

    const list = paidSessionsByInvoice.get(invoiceId) ?? [];
    list.push(s);
    paidSessionsByInvoice.set(invoiceId, list);
  }

  for (const [invoiceId, paid] of paidSessionsByInvoice) {
    const invoice = byId.get(invoiceId);

    if (!invoice) {
      findings.push({ severity: "HIGH", code: "PAID_SESSION_UNKNOWN_INVOICE", invoiceId, sessions: paid.map((s) => s.id) });
      continue;
    }

    if (paid.length > 1) {
      findings.push({ severity: "HIGH", code: "DUPLICATE_PAYMENT", invoice: invoice.invoice_number, sessions: paid.map((s) => s.id) });
    }

    const s = paid[0];
    const total = Number(invoice.total_cents);
    const currency = String(invoice.currency ?? "").trim().toLowerCase();

    if (s.amount_total !== total || String(s.currency ?? "").toLowerCase() !== currency) {
      findings.push({ severity: "HIGH", code: "AMOUNT_MISMATCH", invoice: invoice.invoice_number, session: s.id, stripe: `${s.amount_total} ${s.currency}`, stored: `${total} ${currency}` });
    }

    if (invoice.status !== "PAID") {
      findings.push({ severity: "HIGH", code: "PAID_IN_STRIPE_NOT_IN_DB", invoice: invoice.invoice_number, status: invoice.status, session: s.id });
    } else if (invoice.stripe_checkout_session_id && !paid.some((p) => p.id === invoice.stripe_checkout_session_id)) {
      findings.push({ severity: "MEDIUM", code: "SESSION_ID_MISMATCH", invoice: invoice.invoice_number, stored: invoice.stripe_checkout_session_id, stripe: paid.map((p) => p.id) });
    }
  }

  for (const invoice of invoices) {
    if (invoice.status === "PAID" && !paidSessionsByInvoice.has(invoice.id)) {
      // Either paid outside Stripe (bank transfer marked by hand) or paid before the window.
      findings.push({ severity: "LOW", code: "PAID_IN_DB_NO_STRIPE_SESSION_IN_WINDOW", invoice: invoice.invoice_number, session: invoice.stripe_checkout_session_id ?? null });
    }
  }

  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

async function listSessions(stripeKey, sinceUnix, fetchImpl) {
  const sessions = [];
  let startingAfter = null;

  for (let page = 0; page < 50; page += 1) {
    const params = new URLSearchParams({ limit: "100", "created[gte]": String(sinceUnix) });
    if (startingAfter) params.set("starting_after", startingAfter);

    const res = await readOnlyFetch(`https://api.stripe.com/v1/checkout/sessions?${params}`, { headers: { Authorization: `Bearer ${stripeKey}` } }, fetchImpl);
    if (!res.ok) throw new Error(`Stripe list sessions failed: HTTP ${res.status}`);

    const body = await res.json();
    sessions.push(...body.data);
    if (!body.has_more) break;
    startingAfter = body.data[body.data.length - 1].id;
  }

  return sessions;
}

async function listInvoices(supabaseUrl, serviceKey, fetchImpl) {
  const select = "id,organization_id,invoice_number,status,currency,total_cents,paid_at,stripe_checkout_session_id,stripe_payment_intent_id";
  const res = await readOnlyFetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/invoices?select=${select}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  }, fetchImpl);
  if (!res.ok) throw new Error(`Supabase invoices read failed: HTTP ${res.status}`);
  return res.json();
}

export async function main(argv = process.argv, env = process.env, fetchImpl = globalThis.fetch) {
  const daysArg = argv.indexOf("--days");
  const days = daysArg > -1 ? Number(argv[daysArg + 1]) : 90;
  const missing = ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"].filter((n) => !env[n]);

  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")} (values are never printed)`);
    return 2;
  }

  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const [sessions, invoices] = await Promise.all([
    listSessions(env.STRIPE_SECRET_KEY, since, fetchImpl),
    listInvoices(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, fetchImpl),
  ]);
  const findings = reconcile({ invoices, sessions });

  console.log(`window: last ${days} days | stripe sessions: ${sessions.length} | invoices: ${invoices.length}`);
  for (const f of findings) console.log(JSON.stringify(f));
  console.log(findings.length === 0 ? "RESULT: Stripe and invoices agree" : `RESULT: ${findings.length} finding(s); follow docs/operations/disaster-recovery/stripe-reconciliation.md`);
  return findings.some((f) => f.severity === "HIGH") ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then((code) => process.exit(code), (err) => {
    console.error(`reconciliation failed: ${err.message}`);
    process.exit(3);
  });
}
