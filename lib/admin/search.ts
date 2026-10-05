import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isUuid } from "@/lib/validation/uuid";

/*
 * Cross-table search helpers for the admin list pages.
 *
 * Pattern: resolve matching ids in a small first query (e.g. organisations whose name
 * matches), then the list query combines its own text columns with `.in()` on those ids
 * inside one `.or()`. Only two kinds of value ever reach an `.or()` string:
 *   - patterns from ilikePattern() (lib/admin/filters.ts), which strips PostgREST syntax;
 *   - UUIDs returned by the database, re-checked with isUuid() before use.
 */

/* Upper bound on rows an admin list renders in one page. */
export const ADMIN_LIST_LIMIT = 200;

/* Upper bound on resolved ids folded into one `.in()` clause, to keep the URL short. */
export const MAX_RESOLVED_IDS = 100;

type NamedTable = "organizations" | "projects";

export async function findIdsByName(
  supabase: SupabaseClient,
  table: NamedTable,
  pattern: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .ilike("name", pattern)
    .limit(MAX_RESOLVED_IDS);

  if (error) {
    console.error(`Admin search lookup on ${table} failed:`, {
      code: error.code,
      message: error.message,
    });

    return [];
  }

  return (data ?? [])
    .map((row: { id: unknown }) => row.id)
    .filter(isUuid);
}

export async function findProjectIdsForOrganizations(
  supabase: SupabaseClient,
  organizationIds: string[]
): Promise<string[]> {
  if (organizationIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .in("organization_id", organizationIds)
    .limit(MAX_RESOLVED_IDS);

  if (error) {
    console.error("Admin search project lookup failed:", {
      code: error.code,
      message: error.message,
    });

    return [];
  }

  return (data ?? [])
    .map((row: { id: unknown }) => row.id)
    .filter(isUuid);
}

/* `column.in.(a,b)` for an `.or()` string, or null when there are no ids. */
export function inClause(column: string, ids: string[]): string | null {
  const safeIds = [...new Set(ids.filter(isUuid))].slice(0, MAX_RESOLVED_IDS);

  return safeIds.length > 0 ? `${column}.in.(${safeIds.join(",")})` : null;
}

/* Joins clauses for `.or()`, dropping nulls. */
export function orFilter(clauses: Array<string | null>): string {
  return clauses.filter((clause): clause is string => Boolean(clause)).join(",");
}
