/*
 * Turnstile action for the contact form. Shared by the browser widget (which mints tokens
 * with it) and the server verifier (which rejects tokens minted for any other action).
 * Safe in the browser: an action name is not a secret.
 */
export const CONTACT_ACTION = "contact";
