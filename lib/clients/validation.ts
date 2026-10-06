/*
 * Input normalisation for client onboarding forms. Pure module (tested in
 * tests/client-validation.test.mjs); route handlers call these at the system boundary.
 */

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_CLIENT_NAME_LENGTH = 100;
export const MAX_CONTACT_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

function collapse(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function normalizeClientName(value: unknown): FieldResult<string> {
  const name = collapse(value);

  if (name.length < 2 || name.length > MAX_CLIENT_NAME_LENGTH) {
    return {
      ok: false,
      error: `Client organisation name must be between 2 and ${MAX_CLIENT_NAME_LENGTH} characters.`,
    };
  }

  if (CONTROL_CHARACTERS.test(name)) {
    return { ok: false, error: "Client organisation name contains invalid characters." };
  }

  return { ok: true, value: name };
}

/* Optional field: empty input is valid and normalises to null. */
export function normalizeContactName(value: unknown): FieldResult<string | null> {
  const name = collapse(value);

  if (!name) {
    return { ok: true, value: null };
  }

  if (name.length > MAX_CONTACT_NAME_LENGTH || CONTROL_CHARACTERS.test(name)) {
    return { ok: false, error: "Enter a valid contact name (up to 100 characters)." };
  }

  return { ok: true, value: name };
}

/* Required variant: the primary contact is who the portal invitation is addressed to. */
export function parseRequiredContactName(value: unknown): FieldResult<string> {
  const result = normalizeContactName(value);

  if (!result.ok) {
    return result;
  }

  return result.value
    ? { ok: true, value: result.value }
    : { ok: false, error: "Enter the primary contact's name." };
}

/*
 * Escape a value for an exact, case-insensitive PostgREST `ilike` match: `%` and `_` are
 * wildcards and `\` is the escape character, so a name like "50% Off_Co" matches only itself.
 */
export function ilikeExact(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return (
    email.length >= 3 &&
    email.length <= MAX_EMAIL_LENGTH &&
    !CONTROL_CHARACTERS.test(email) &&
    EMAIL_PATTERN.test(email)
  );
}

/* Optional email: empty is valid (null); anything else must be a valid address. */
export function parseOptionalEmail(value: unknown): FieldResult<string | null> {
  const email = normalizeEmail(value);

  if (!email) {
    return { ok: true, value: null };
  }

  return isValidEmail(email)
    ? { ok: true, value: email }
    : { ok: false, error: "Enter a valid email address." };
}

export function parseRequiredEmail(value: unknown): FieldResult<string> {
  const email = normalizeEmail(value);

  return isValidEmail(email)
    ? { ok: true, value: email }
    : { ok: false, error: "Enter a valid email address." };
}

/* HTML checkbox semantics: present with "on"/"true"/"1" means checked. */
export function isChecked(value: unknown): boolean {
  return value === "on" || value === "true" || value === "1" || value === true;
}
