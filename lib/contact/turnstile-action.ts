/*
 * Turnstile action for the contact form. Shared by the browser widget (which mints tokens
 * with it) and the server verifier (which rejects tokens minted for any other action).
 * Safe in the browser: an action name is not a secret.
 */
export const CONTACT_ACTION = "contact";

/* Consultation booking form (/consultation). Its own action, so a contact-form token cannot be
 * replayed against the booking API, nor a booking token against the contact API. */
export const CONSULTATION_ACTION = "consultation";

/* AI assistant session start. Its own action, so a contact or booking token cannot open a chat. */
export const ASSISTANT_ACTION = "assistant";
