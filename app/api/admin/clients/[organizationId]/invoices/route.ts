import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  CREATE_ERROR_MESSAGES,
  classifyInsertError,
  isUuidLike,
  validateDraftInvoice,
  type CreateErrorCode,
  type InvoiceField,
} from "@/lib/invoice-creation/validate";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { gstAppliesToNewInvoices } from "@/lib/tax";

/*
 * Create a DRAFT invoice for a client organisation.
 *
 * Two response modes from one handler:
 *   - JSON (the admin form sends Accept: application/json): { success, invoiceId,
 *     invoiceNumber } or { error, code, field }. The form navigates itself.
 *   - Redirect (no-JavaScript fallback, plain form POST): 303 to the new invoice, or back
 *     to the form with ?error=<code>. Only a fixed code travels in the URL, never text.
 *
 * invoice_number is deliberately NOT sent: PostgreSQL assigns it on insert
 * (generate_drylake_invoice_number(), added in e1d8207). That function lives in the
 * database, not in this repository; see docs/operations/sql/invoice-creation-diagnostics.sql
 * for how to inspect it.
 *
 * Duplicate protection: the form sends a per-attempt requestId (UUID). It is recorded on
 * the INVOICE_CREATED audit event, and a repeat with the same requestId returns the
 * invoice that already exists instead of creating a second one (double click, retry after
 * a timeout whose insert actually succeeded).
 *
 * Every database call is bounded by DB_TIMEOUT_MS, and one structured log line per
 * request records per-step timings and the Postgres error code, so a slow or failing
 * create identifies its own cause in the logs without exposing it to the browser.
 */

const DB_TIMEOUT_MS = 15_000;

type RouteContext = {
  params: Promise<{ organizationId: string }>;
};

type Timings = Record<string, number>;

function wantsJson(request: Request) {
  return (request.headers.get("accept") ?? "").includes("application/json");
}

function logOutcome(details: {
  outcome: string;
  timings: Timings;
  startedAt: number;
  pgCode?: string;
  invoiceId?: string;
  retried?: boolean;
}) {
  const totalMs = Math.round(performance.now() - details.startedAt);
  const line = {
    event: "invoice.create",
    outcome: details.outcome,
    totalMs,
    steps: details.timings,
    pgCode: details.pgCode,
    invoiceId: details.invoiceId,
    retried: details.retried || undefined,
  };

  if (details.outcome === "created" || details.outcome === "duplicate_request") {
    if (totalMs > 3_000) {
      console.warn("Slow invoice creation:", JSON.stringify(line));
    } else {
      console.info(JSON.stringify(line));
    }
  } else {
    console.error("Invoice creation failed:", JSON.stringify(line));
  }
}

async function timed<T>(timings: Timings, step: string, work: () => PromiseLike<T>): Promise<T> {
  const start = performance.now();

  try {
    return await work();
  } finally {
    timings[step] = Math.round(performance.now() - start);
  }
}

function failure(
  request: Request,
  organizationId: string,
  code: CreateErrorCode,
  status: number,
  field: InvoiceField = "form"
) {
  if (wantsJson(request)) {
    return NextResponse.json(
      { error: CREATE_ERROR_MESSAGES[code], code, field },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (code === "unauthenticated") {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/admin", request.url), 303);
  }

  const url = new URL(
    isUuidLike(organizationId)
      ? `/admin/clients/${organizationId}/invoices/new`
      : "/admin/clients",
    request.url
  );

  url.searchParams.set("error", code);

  return NextResponse.redirect(url, 303);
}

function success(request: Request, invoiceId: string, invoiceNumber: string | null) {
  if (wantsJson(request)) {
    return NextResponse.json(
      { success: true, invoiceId, invoiceNumber },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.redirect(new URL(`/admin/invoices/${invoiceId}`, request.url), 303);
}

export async function POST(request: Request, context: RouteContext) {
  const startedAt = performance.now();
  const timings: Timings = {};
  const { organizationId } = await context.params;

  // ---------------------------------------------------------------- authorization
  const { userId } = await auth();

  if (!userId) {
    return failure(request, organizationId, "unauthenticated", 401);
  }

  const platformAdmin = await timed(timings, "adminCheck", () => isPlatformAdmin());

  if (!platformAdmin) {
    return failure(request, organizationId, "forbidden", 403);
  }

  // Browser-supplied id: reject anything that is not a UUID before it reaches Postgres.
  if (!isUuidLike(organizationId)) {
    return failure(request, organizationId, "organization_not_found", 404);
  }

  // ---------------------------------------------------------------- input
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return failure(request, organizationId, "invalid_form", 400);
  }

  const validation = validateDraftInvoice(
    {
      projectId: formData.get("projectId"),
      subtotal: formData.get("subtotal"),
      dueDate: formData.get("dueDate"),
      visibleToClient: formData.get("visibleToClient"),
      requestId: formData.get("requestId"),
    },
    { gstApplies: gstAppliesToNewInvoices() }
  );

  if (!validation.ok) {
    return failure(request, organizationId, validation.code, 400, validation.field);
  }

  const input = validation.value;
  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------------- lookups (parallel)
  const [organizationResult, projectResult, duplicateResult] = await timed(
    timings,
    "lookups",
    () =>
      Promise.all([
        supabase
          .from("organizations")
          .select("id, status")
          .eq("id", organizationId)
          .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
          .maybeSingle(),

        input.projectId
          ? supabase
              .from("projects")
              .select("id")
              .eq("id", input.projectId)
              .eq("organization_id", organizationId)
              .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        input.requestId
          ? supabase
              .from("audit_logs")
              .select("entity_id, metadata")
              .eq("action", "INVOICE_CREATED")
              .eq("entity_type", "invoice")
              .eq("metadata->>request_id", input.requestId)
              .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])
  );

  if (organizationResult.error) {
    logOutcome({ outcome: "organization_lookup_error", timings, startedAt, pgCode: organizationResult.error.code });
    return failure(request, organizationId, "database_error", 503);
  }

  if (!organizationResult.data) {
    return failure(request, organizationId, "organization_not_found", 404);
  }

  if (organizationResult.data.status !== "ACTIVE") {
    return failure(request, organizationId, "organization_inactive", 409);
  }

  if (projectResult.error) {
    logOutcome({ outcome: "project_lookup_error", timings, startedAt, pgCode: projectResult.error.code });
    return failure(request, organizationId, "database_error", 503);
  }

  if (input.projectId && !projectResult.data) {
    return failure(request, organizationId, "invalid_project", 400, "projectId");
  }

  // A failed duplicate check must not block creation; it only weakens retry protection.
  if (duplicateResult.error) {
    console.error("Invoice duplicate check failed:", { code: duplicateResult.error.code });
  }

  const previous = duplicateResult.data as
    | { entity_id: string | null; metadata: { organization_id?: string; invoice_number?: string } | null }
    | null;

  if (
    previous?.entity_id &&
    isUuidLike(previous.entity_id) &&
    previous.metadata?.organization_id === organizationId
  ) {
    logOutcome({ outcome: "duplicate_request", timings, startedAt, invoiceId: previous.entity_id });
    return success(request, previous.entity_id, previous.metadata?.invoice_number ?? null);
  }

  // ---------------------------------------------------------------- insert
  const row = {
    organization_id: organizationId,
    project_id: input.projectId,
    stripe_invoice_id: null,
    status: "DRAFT",
    currency: input.currency,
    subtotal_cents: input.subtotalCents,
    tax_cents: input.taxCents,
    total_cents: input.totalCents,
    due_date: input.dueDate,
    paid_at: null,
    visible_to_client: input.visibleToClient,
  };

  const insertOnce = () =>
    supabase
      .from("invoices")
      .insert(row)
      .select("id, invoice_number")
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
      .single();

  let insert = await timed(timings, "insert", insertOnce);
  let retried = false;

  // A unique violation is what two concurrent number assignments look like: retry once.
  if (insert.error && classifyInsertError(insert.error.code).retryable) {
    retried = true;
    insert = await timed(timings, "insertRetry", insertOnce);
  }

  if (insert.error || !insert.data) {
    // An aborted request has no Postgres code; treat it as the timeout it is.
    const aborted = insert.error?.message?.toLowerCase().includes("abort");
    const classified = aborted
      ? { code: "database_timeout" as const }
      : classifyInsertError(insert.error?.code);

    logOutcome({
      outcome: aborted ? "insert_timeout" : "insert_error",
      timings,
      startedAt,
      pgCode: insert.error?.code,
      retried,
    });

    return failure(request, organizationId, classified.code, aborted ? 504 : 500);
  }

  const invoice = insert.data;

  // ---------------------------------------------------------------- audit (+ idempotency record)
  const { error: auditError } = await timed(timings, "audit", () =>
    supabase
      .from("audit_logs")
      .insert({
        actor_clerk_user_id: userId,
        action: "INVOICE_CREATED",
        entity_type: "invoice",
        entity_id: invoice.id,
        metadata: {
          organization_id: organizationId,
          project_id: input.projectId,
          invoice_number: invoice.invoice_number,
          subtotal_cents: input.subtotalCents,
          tax_cents: input.taxCents,
          total_cents: input.totalCents,
          currency: input.currency,
          visible_to_client: input.visibleToClient,
          request_id: input.requestId,
        },
      })
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
  );

  // The invoice exists; a failed audit row must not turn a success into an error.
  if (auditError) {
    console.error("Invoice audit log failed:", { code: auditError.code, invoiceId: invoice.id });
  }

  logOutcome({ outcome: "created", timings, startedAt, invoiceId: invoice.id, retried });

  return success(request, invoice.id, invoice.invoice_number ?? null);
}
