/*
 * Route IDs are Postgres uuid columns. A string that is not a UUID makes Postgres raise
 * "invalid input syntax for type uuid", which surfaces as a generic error page instead of a
 * 404. Validate the shape first. Any version is accepted: Postgres stores any valid UUID.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
