/*
 * Drylake is not registered for GST. Until GST_REGISTERED=true, no GST may be charged,
 * displayed or invoiced (Australian tax law: an unregistered business must not collect GST).
 * Flip the env var only after ATO registration, then review every pricing surface in one pass.
 */
export function isGstRegistered() {
  return process.env.GST_REGISTERED === "true";
}

export const NO_GST_NOTE =
  "No GST has been charged. Drylake Pty Ltd is not registered for GST.";
