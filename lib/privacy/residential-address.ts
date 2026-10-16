/*
 * Residential address guard. PURE (no I/O): the unit test, the build scan and the live sweep
 * (scripts/privacy-address-sweep.mjs) all import these patterns.
 *
 * Owner rule (Ben, 2026-10-16): the residential street address must never appear anywhere on the
 * public website, in any form. Joondalup itself is NOT restricted: it is a mandatory service area
 * with its own landing page. What is restricted:
 *   1. the street address and its components (street name, unit/street numbers in that shape,
 *      the postcode, kept from the 13 Oct removal in 17874f8), in any spacing or abbreviation;
 *   2. any statement that Drylake is physically based in Joondalup (not authorised). Drylake is
 *      "based in Perth" (ENTITY.locality).
 *
 * The address is deliberately never written here as one string: the patterns match its parts, so
 * this file cannot itself leak it if the repository is ever opened up.
 */

/* Street name in any form: "Davidson Terrace", "Davidson Tce", "DAVIDSON TCE", "Davidson". */
const STREET_NAME = /\bdavidson\b/i;
/* Unit / street number shape: "10/53", "10 / 53", "Unit 10, 53", "U10 53". */
const UNIT_STREET_NUMBER = /\b10\s*\/\s*53\b|\b(unit|u|apt|apartment)\.?\s*10\s*,?\s*(\/\s*)?53\b/i;
/* The postcode. Not needed by any service-area page (suburb names are enough). */
const POSTCODE = /\b6027\b/;

export const RESIDENTIAL_ADDRESS_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "street name", pattern: STREET_NAME },
  { name: "unit/street number", pattern: UNIT_STREET_NUMBER },
  { name: "postcode", pattern: POSTCODE },
];

/*
 * "Drylake / we / our office ... based|located|headquartered|situated in|at Joondalup", and
 * "our Joondalup office". Matches a claim ABOUT Drylake only: a visitor-side question such as
 * "Do I need a web developer based in Joondalup?" and "Drylake has no office in Joondalup" pass.
 */
export const PHYSICAL_BASE_CLAIM_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  {
    name: "Drylake based in Joondalup",
    pattern:
      /\b(drylake|we|we're|we are|our (office|team|business|studio|base|company))\b(?![^.?!]{0,40}\bno\b)[^.?!]{0,40}\b(based|located|headquartered|situated)\s+(in|at|out of)\s+joondalup\b/i,
  },
  { name: "our Joondalup office", pattern: /\bour\s+joondalup\s+(office|base|studio|premises)\b/i },
  { name: "office in Joondalup", pattern: /(?<!\bno\s)\b(our|drylake'?s?)\s+(office|premises|studio)\s+(is\s+)?in\s+joondalup\b/i },
];

export type AddressFinding = { name: string; excerpt: string };

function scan(text: string, patterns: ReadonlyArray<{ name: string; pattern: RegExp }>): AddressFinding[] {
  const findings: AddressFinding[] = [];
  for (const { name, pattern } of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const start = Math.max(0, match.index - 25);
      findings.push({ name, excerpt: text.slice(start, match.index + match[0].length + 25).replace(/\s+/g, " ") });
    }
  }
  return findings;
}

export function findResidentialAddress(text: string): AddressFinding[] {
  return scan(text, RESIDENTIAL_ADDRESS_PATTERNS);
}

export function findPhysicalBaseClaim(text: string): AddressFinding[] {
  return scan(text, PHYSICAL_BASE_CLAIM_PATTERNS);
}

export function findPrivacyViolations(text: string): AddressFinding[] {
  return [...findResidentialAddress(text), ...findPhysicalBaseClaim(text)];
}
