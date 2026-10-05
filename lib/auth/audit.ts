import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntry = {
  actorClerkUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  /* No personal information (names, emails): ids and state only. */
  metadata?: Record<string, unknown>;
};

/*
 * Same shape as the existing inline audit inserts. An audit failure never undoes the
 * action it describes, but it is always logged, because audit coverage is part of the
 * security model.
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_clerk_user_id: entry.actorClerkUserId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    console.error(`Audit log failed for ${entry.action}:`, {
      code: error.code,
      message: error.message,
    });
  }
}
