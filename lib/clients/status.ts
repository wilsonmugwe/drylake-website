/*
 * Client (organisation) status lifecycle. Pure module: no framework imports, so the rules
 * are unit-tested directly (tests/client-status.test.mjs).
 *
 * Lifecycle:
 *   ACTIVE   <-> INACTIVE        (pause and resume an engagement)
 *   ACTIVE    -> ARCHIVED        (engagement over; hidden from default admin lists)
 *   INACTIVE  -> ARCHIVED
 *   ARCHIVED  -> ACTIVE          (restore)
 *
 * Only ACTIVE is operational: new projects, invoices, documents and portal access all
 * require it (the existing server checks compare against "ACTIVE" directly, so INACTIVE
 * and ARCHIVED are blocked everywhere without further changes).
 *
 * INACTIVE and ARCHIVED need the database to accept them. Until migration
 * 20261005120000_client_status_lifecycle.sql is applied, a status write may be rejected by
 * a CHECK constraint or enum. That rejection is atomic (nothing is written), and the API
 * maps it to a clear "requires migration" message via isStatusSchemaRejection().
 */

export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const STATUS_MIGRATION_FILE =
  "supabase/migrations/20261005120000_client_status_lifecycle.sql";

/* Statuses the admin client list hides unless the status filter asks for them. */
export const DEFAULT_HIDDEN_CLIENT_STATUSES: readonly ClientStatus[] = ["ARCHIVED"];

const TRANSITIONS: Record<ClientStatus, readonly ClientStatus[]> = {
  ACTIVE: ["INACTIVE", "ARCHIVED"],
  INACTIVE: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["ACTIVE"],
};

export function isClientStatus(value: unknown): value is ClientStatus {
  return (
    typeof value === "string" &&
    (CLIENT_STATUSES as readonly string[]).includes(value)
  );
}

/* Accepts any casing and surrounding whitespace; returns null for anything unknown. */
export function parseClientStatus(value: unknown): ClientStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const upper = value.trim().toUpperCase();

  return isClientStatus(upper) ? upper : null;
}

export function isClientOperational(status: unknown): boolean {
  return status === "ACTIVE";
}

export function isVisibleInDefaultClientList(status: unknown): boolean {
  return !(
    typeof status === "string" &&
    (DEFAULT_HIDDEN_CLIENT_STATUSES as readonly string[]).includes(status.toUpperCase())
  );
}

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: string };

/*
 * A legacy or unknown current status (not one of the three) may move to any known status,
 * so an admin can always repair a row. Moving to the same status is rejected as a no-op.
 */
export function checkClientStatusTransition(
  from: unknown,
  to: unknown
): TransitionCheck {
  const target = parseClientStatus(to);

  if (!target) {
    return { ok: false, reason: "Choose a valid client status." };
  }

  const current = typeof from === "string" ? from.trim().toUpperCase() : "";

  if (current === target) {
    return { ok: false, reason: `This client is already ${statusLabel(target).toLowerCase()}.` };
  }

  if (!isClientStatus(current)) {
    return { ok: true };
  }

  if (!TRANSITIONS[current].includes(target)) {
    return {
      ok: false,
      reason: `A ${statusLabel(current).toLowerCase()} client cannot be moved to ${statusLabel(target).toLowerCase()}.`,
    };
  }

  return { ok: true };
}

export function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "ARCHIVED":
      return "Archived";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}

export type StatusAction = {
  to: ClientStatus;
  label: string;
  description: string;
  /* Destructive actions need an explicit confirmation step in the UI and the API. */
  requiresConfirmation: boolean;
};

export function availableStatusActions(current: unknown): StatusAction[] {
  const currentUpper = typeof current === "string" ? current.toUpperCase() : "";
  const targets = isClientStatus(currentUpper)
    ? TRANSITIONS[currentUpper]
    : CLIENT_STATUSES;

  return targets.map((to) => {
    switch (to) {
      case "ACTIVE":
        return {
          to,
          label: currentUpper === "ARCHIVED" ? "Restore client" : "Reactivate client",
          description:
            "Portal access returns for existing members, and new projects and invoices can be created.",
          requiresConfirmation: false,
        };
      case "INACTIVE":
        return {
          to,
          label: "Mark inactive",
          description:
            "Pauses the engagement. Client users lose portal access and no new projects or invoices can be created. Nothing is deleted.",
          requiresConfirmation: false,
        };
      case "ARCHIVED":
        return {
          to,
          label: "Archive client",
          description:
            "Ends the engagement. Client users lose portal access, pending invitations are revoked, and the client is hidden from the default client list. Records are kept and the client can be restored.",
          requiresConfirmation: true,
        };
    }
  });
}

/*
 * Postgres rejects a value outside a CHECK constraint with 23514 (check_violation) and a
 * value outside an enum with 22P02 (invalid_text_representation). Either means the status
 * migration has not been applied yet.
 */
export function isStatusSchemaRejection(
  error: { code?: string | null } | null | undefined
): boolean {
  return error?.code === "23514" || error?.code === "22P02";
}
