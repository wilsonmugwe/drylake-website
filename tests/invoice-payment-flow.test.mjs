/*
 * Invoice email -> sign-in -> invoice -> Stripe, end to end at the decision level:
 *   - one URL builder for the email button, the plain link and Checkout return URLs,
 *   - the sign-in round trip and workspace activation keep the invoice destination,
 *   - own invoice opens, another tenant's invoice does not, drafts stay hidden,
 *   - Stripe is charged the stored GST-inclusive total and the webhook settles only that,
 *   - replayed / duplicate payment events stay safe.
 * Static sweeps pin the wiring in the routes so a regression to request.url hosts or to the
 * old "redirect to /client" cannot come back silently. Run: npm test
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { resolveClientOrganization } from "../lib/auth/access.ts";
import { calculateInvoiceAmounts } from "../lib/invoices/gst.ts";
import {
  appBaseUrl,
  clientInvoicePath,
  clientInvoiceUrl,
  DEFAULT_APP_BASE_URL,
  invoiceSignInPath,
} from "../lib/invoices/invoice-url.ts";
import { evaluateCheckout, isClientVisible } from "../lib/invoices/lifecycle.ts";
import { evaluateSettlement } from "../lib/invoices/stripe-payment.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${ROOT}${path}`, "utf8");

const INVOICE_ID = "11111111-2222-4333-8444-555555555555";
const ACME = { id: "3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c", clerk_org_id: "org_acme", name: "Acme", status: "ACTIVE" };
const BETA = { id: "0190f3c2-7b1a-7e3d-9c2b-1a2b3c4d5e6f", clerk_org_id: "org_beta", name: "Beta", status: "ACTIVE" };

const GST = calculateInvoiceAmounts(100_000, true); // 1,000.00 + 100.00 = 1,100.00

function gstInvoice(overrides = {}) {
  return {
    id: INVOICE_ID,
    organization_id: ACME.id,
    status: "OPEN",
    visible_to_client: true,
    currency: "AUD",
    subtotal_cents: GST.subtotalCents,
    tax_cents: GST.taxCents,
    total_cents: GST.totalCents,
    stripe_checkout_session_id: "cs_test_gst",
    ...overrides,
  };
}

describe("invoice URL builder", () => {
  it("email links always use the canonical production origin by default", () => {
    assert.equal(appBaseUrl({}), "https://drylake.com.au");
    assert.equal(DEFAULT_APP_BASE_URL, "https://drylake.com.au");
    assert.equal(
      clientInvoiceUrl(INVOICE_ID, appBaseUrl({})),
      `https://drylake.com.au/client/billing/${INVOICE_ID}`
    );
  });

  it("APP_BASE_URL may override with an https origin (path and trailing slash dropped)", () => {
    assert.equal(appBaseUrl({ APP_BASE_URL: "https://staging.drylake.com.au/x/" }), "https://staging.drylake.com.au");
    assert.equal(appBaseUrl({ APP_BASE_URL: "http://localhost:3000" }), "http://localhost:3000");
  });

  it("rejects insecure or malformed overrides instead of mailing a bad host", () => {
    for (const bad of ["http://drylake.com.au", "javascript:alert(1)", "not a url", "ftp://drylake.com.au"]) {
      assert.equal(appBaseUrl({ APP_BASE_URL: bad }), DEFAULT_APP_BASE_URL, bad);
    }
  });

  it("links by invoice UUID only, never by invoice number", () => {
    assert.equal(clientInvoicePath(INVOICE_ID.toUpperCase()), `/client/billing/${INVOICE_ID}`);
    for (const bad of ["DL-0042", "", "../admin", `${INVOICE_ID}/../x`]) {
      assert.throws(() => clientInvoicePath(bad), RangeError, bad);
    }
  });

  it("sign-in keeps the invoice as the return destination", () => {
    const path = invoiceSignInPath(INVOICE_ID);
    const url = new URL(path, "https://drylake.com.au");
    assert.equal(url.pathname, "/sign-in");
    assert.equal(url.searchParams.get("redirect_url"), `/client/billing/${INVOICE_ID}`);
  });
});

describe("email -> sign-in -> invoice wiring (static)", () => {
  it("issue and resend build the email link with the shared builder, not the request host", () => {
    for (const route of [
      "app/api/admin/invoices/[invoiceId]/issue/route.ts",
      "app/api/admin/invoices/[invoiceId]/resend/route.ts",
    ]) {
      const source = read(route);
      assert.ok(source.includes("portalUrl: clientInvoiceUrl(invoice.id, appBaseUrl(process.env))"), route);
      assert.equal(/portalUrl:\s*new URL\(/.test(source), false, `${route} still derives the host from the request`);
    }
  });

  it("proxy sends a signed-out invoice request to sign-in with the full path", () => {
    const proxy = read("proxy.ts");
    assert.ok(proxy.includes('"/client(.*)"'));
    assert.ok(proxy.includes('signIn.searchParams.set("redirect_url", `${pathname}${search}`)'));
  });

  it("the invoice page never drops the destination for a session with no active org", () => {
    const page = read("app/client/billing/[invoiceId]/page.tsx");
    assert.equal(/redirect\(\s*["']\/client["']\s*\)/.test(page), false, "old redirect('/client') is back");
    assert.equal(/redirect_url=\/client\/billing["']/.test(page), false, "old hard-coded list return is back");
    assert.ok(page.includes("invoiceSignInPath(invoiceId)"), "signed-out goes to sign-in with the invoice path");
    assert.ok(page.includes("getClientWorkspace()"), "uses the one authoritative workspace resolver");
    assert.ok(/returnTo = isUuid\(invoiceId\)\s*\?\s*clientInvoicePath\(invoiceId\)/.test(page), "return path comes from the same builder as the email");
    assert.ok(/<ClientWorkspaceGate[\s\S]*returnTo=\{returnTo\}/.test(page), "activation returns to the invoice");
  });

  it("the invoice page reads the organisation and invoice through RLS with explicit filters", () => {
    const page = read("app/client/billing/[invoiceId]/page.tsx");
    // The RLS-scoped client comes from the resolver, which verified the org with the user's own token.
    assert.ok(/const\s*\{\s*supabase,\s*organization,\s*\}\s*=\s*workspace;/.test(page));
    assert.equal(page.includes("createAdminSupabaseClient"), false, "no service role on the client page");
    assert.ok(/\.eq\(\s*"organization_id",\s*organization\.id\s*\)/.test(page));
    assert.ok(/\.eq\(\s*"visible_to_client",\s*true\s*\)/.test(page));
    assert.ok(page.includes('.neq("status", "DRAFT")'));
  });

  it("no email-only authorization: the invoice page never matches on email", () => {
    const page = read("app/client/billing/[invoiceId]/page.tsx");
    assert.equal(/billing_email|emailAddress|primaryEmail/.test(page), false);
  });
});

describe("own vs other tenant invoice", () => {
  it("a member of Acme resolves to Acme only", () => {
    const resolution = resolveClientOrganization({
      activeOrgId: "org_acme",
      membershipOrgIds: ["org_acme"],
      organizations: [ACME, BETA],
    });
    assert.equal(resolution.kind, "ready");
    assert.equal(resolution.organization.id, ACME.id);
  });

  it("a fresh sign-in with no active org activates the single workspace (no dead end)", () => {
    const resolution = resolveClientOrganization({
      activeOrgId: null,
      membershipOrgIds: ["org_acme"],
      organizations: [ACME],
    });
    assert.equal(resolution.kind, "activate");
    assert.equal(resolution.option.clerkOrgId, "org_acme");
  });

  it("own issued invoice is visible and payable; another tenant's is not found", () => {
    assert.equal(isClientVisible(gstInvoice(), ACME.id), true);
    assert.equal(evaluateCheckout(gstInvoice(), ACME.id).ok, true);

    assert.equal(isClientVisible(gstInvoice(), BETA.id), false);
    const other = evaluateCheckout(gstInvoice(), BETA.id);
    assert.equal(other.ok, false);
    assert.equal(other.httpStatus, 404, "never confirms another tenant's invoice exists");
  });

  it("drafts and hidden invoices stay invisible to the client", () => {
    assert.equal(isClientVisible(gstInvoice({ status: "DRAFT" }), ACME.id), false);
    assert.equal(isClientVisible(gstInvoice({ visible_to_client: false }), ACME.id), false);
    assert.equal(evaluateCheckout(gstInvoice({ status: "DRAFT" }), ACME.id).httpStatus, 404);
  });
});

describe("Stripe charges the GST-inclusive total", () => {
  it("checkout amount is total_cents including GST", () => {
    const decision = evaluateCheckout(gstInvoice(), ACME.id);
    assert.equal(decision.ok, true);
    assert.equal(decision.amountCents, 110_000);
    assert.equal(decision.currency, "aud");
  });

  it("a stored total that disagrees with subtotal + GST is never sent to Stripe", () => {
    const decision = evaluateCheckout(gstInvoice({ total_cents: 100_000 }), ACME.id);
    assert.equal(decision.ok, false);
    assert.equal(decision.code, "INVALID_INVOICE_TOTAL");
  });

  it("checkout route sends unit_amount from the evaluated total and returns to the invoice URL", () => {
    const route = read("app/api/stripe/checkout/route.ts");
    assert.ok(route.includes("unit_amount: amountCents"));
    assert.ok(route.includes("const { amountCents, currency } = eligibility;"));
    assert.ok(route.includes("success_url: `${invoiceUrl}?payment=success`"));
    assert.ok(route.includes("cancel_url: `${invoiceUrl}?payment=cancelled`"));
    assert.ok(route.includes("subtotal_cents, tax_cents, total_cents"), "breakdown is checked");
  });

  it("the webhook settles only a payment of the GST-inclusive total", () => {
    const paid = { id: "cs_test_gst", mode: "payment", payment_status: "paid", currency: "aud" };

    assert.equal(
      evaluateSettlement(gstInvoice(), ACME.id, { ...paid, amount_total: 110_000 }).action,
      "MARK_PAID"
    );

    const subtotalOnly = evaluateSettlement(gstInvoice(), ACME.id, { ...paid, amount_total: 100_000 });
    assert.deepEqual(subtotalOnly, { action: "REJECT", reason: "AMOUNT_MISMATCH" });
  });

  it("a replayed completion is harmless; a second paid session is a flagged duplicate", () => {
    const paidInvoice = gstInvoice({ status: "PAID" });
    const event = { id: "cs_test_gst", mode: "payment", payment_status: "paid", amount_total: 110_000, currency: "aud" };

    assert.equal(evaluateSettlement(paidInvoice, ACME.id, event).action, "ALREADY_PAID");
    assert.deepEqual(evaluateSettlement(paidInvoice, ACME.id, { ...event, id: "cs_test_other" }), {
      action: "REJECT",
      reason: "DUPLICATE_PAYMENT",
    });
  });

  it("the success return never marks PAID: the invoice page shows the stored status", () => {
    const page = read("app/client/billing/[invoiceId]/page.tsx");
    assert.equal(/status:\s*["']PAID["']/.test(page), false);
    assert.equal(/\.update\(/.test(page), false, "the client invoice page writes nothing");
  });
});

describe("GST is authoritative on the server (static)", () => {
  it("creation computes GST from today's registration and ignores a browser tax field", () => {
    const route = read("app/api/admin/clients/[organizationId]/invoices/route.ts");
    assert.ok(route.includes("{ gstApplies: gstAppliesToNewInvoices() }"));
    assert.equal(route.includes('formData.get("tax")'), false);
  });

  it("issue fixes GST at issue with an optimistic lock on the amounts it read", () => {
    const route = read("app/api/admin/invoices/[invoiceId]/issue/route.ts");
    assert.ok(route.includes("calculateInvoiceAmounts(stored.subtotalCents, gstAppliesToNewInvoices())"));
    assert.ok(route.includes('.eq("status", "DRAFT")'));
    assert.ok(route.includes('.eq("total_cents", stored.totalCents)'));
  });

  it("no UI component computes GST itself", () => {
    for (const file of [
      "components/client/ClientInvoiceView.tsx",
      "components/client/ClientBillingView.tsx",
      "app/admin/invoices/[invoiceId]/page.tsx",
      "lib/email/invoice-email.ts",
    ]) {
      const source = read(file);
      assert.equal(/\*\s*0\.1\b|\/\s*10\b|\*\s*1\.1\b/.test(source), false, `${file} does its own GST maths`);
    }
  });
});
