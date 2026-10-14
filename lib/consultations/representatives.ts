/*
 * Who holds consultations, and how. PURE (unit-tested in tests/consultation-m365.test.mjs).
 *
 * The roster keys are also a CHECK constraint in supabase/migrations/
 * 20261014090000_consultation_representatives.sql; roster ORDER is the final tie-break of the
 * fair assignment there (fewest upcoming consultations first). Adding a representative means
 * changing both, plus scoping the Microsoft 365 app to their mailbox (docs/operations/consultations.md).
 */

export type RepresentativeKey = "wilson" | "benedict";

export type Representative = { key: RepresentativeKey; name: string; email: string };

export const REPRESENTATIVES: readonly Representative[] = [
  { key: "wilson", name: "Wilson", email: "wilson@drylake.com.au" },
  { key: "benedict", name: "Benedict", email: "benedict@drylake.com.au" },
];

export const REPRESENTATIVE_KEYS: readonly RepresentativeKey[] = REPRESENTATIVES.map((r) => r.key);

export function representativeByKey(key: string | null | undefined): Representative | null {
  return REPRESENTATIVES.find((r) => r.key === key) ?? null;
}

export function representativeName(key: string | null | undefined): string {
  return representativeByKey(key)?.name ?? "Not assigned";
}

export type MeetingMethod = "TEAMS" | "PHONE";

export const MEETING_METHODS: readonly MeetingMethod[] = ["TEAMS", "PHONE"];

export const MEETING_METHOD_LABELS: Record<MeetingMethod, string> = {
  TEAMS: "Microsoft Teams video call",
  PHONE: "Phone call",
};

export function isMeetingMethod(value: unknown): value is MeetingMethod {
  return value === "TEAMS" || value === "PHONE";
}
