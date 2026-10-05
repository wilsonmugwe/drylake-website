/*
 * Server-side helpers for the admin list filters (see components/admin/AdminFilterBar).
 *
 * Every value here comes from the URL, so it is untrusted. Two rules keep it safe in
 * Supabase/PostgREST filters:
 *   1. readFilterParam caps length and strips control characters.
 *   2. ilikePattern escapes LIKE wildcards and removes the characters PostgREST treats as
 *      syntax inside .or() strings (comma, parentheses, quotes, backslash), so a search
 *      term can never add or alter a filter clause.
 */

export type AdminSearchParams = Record<string, string | string[] | undefined>;

const MAX_PARAM_LENGTH = 100;

export function readFilterParam(
  params: AdminSearchParams,
  key: string
): string {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_PARAM_LENGTH);
}

/* Returns the value only if it is one of the allowed options, else "". */
export function readEnumParam<T extends string>(
  params: AdminSearchParams,
  key: string,
  allowed: readonly T[]
): T | "" {
  const value = readFilterParam(params, key).toUpperCase();

  return (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

/* `%term%` safe for .ilike() and for use inside an .or() filter string. */
export function ilikePattern(term: string): string {
  const cleaned = term
    .replace(/[,()"'\\]/g, " ")
    .replace(/[%_]/g, (match) => `\\${match}`)
    .replace(/\s+/g, " ")
    .trim();

  return `%${cleaned}%`;
}

/* Human label for an enum value such as ON_HOLD -> "On hold". */
export function statusLabel(value: string): string {
  const spaced = value.replaceAll("_", " ").toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function toOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: statusLabel(value) }));
}
