/*
 * Sovereignty guard for the Bedrock model id. PURE (unit-tested).
 *
 * Why an ALLOWLIST and not a blocklist of "apac./global./us./eu.": Bedrock keeps adding geographic
 * prefixes (jp., in., ...) and an application inference profile ARN hides its destinations
 * entirely. Only two shapes are accepted, both verified to keep inference in Australia:
 *   - "anthropic.claude-..."     in-region id, served from ap-southeast-2 only
 *   - "au.anthropic.claude-..."  AU geographic profile: Sydney (ap-southeast-2) and Melbourne
 *                                (ap-southeast-4) only (AWS Bedrock model card, 2026-10-16)
 * "apac." (any APAC region incl. Singapore/Tokyo/Mumbai), "global." (all commercial regions),
 * us./eu./jp./in., ARNs and anything else are refused.
 *
 * Claude Haiku 4.5 has NO in-region id in Sydney (bedrock-runtime): it is reachable only through
 * the au. profile (or apac./global., which we refuse). Hence the default below.
 */
export const BEDROCK_REGION = "ap-southeast-2" as const;
export const DEFAULT_MODEL_ID = "au.anthropic.claude-haiku-4-5-20251001-v1:0";

const ALLOWED = /^(?:au\.)?anthropic\.claude-[a-z0-9][a-z0-9.-]*(?::\d+)?$/;
const KNOWN_LEAKY = /^(apac|global|us|eu|jp|in|us-gov)\./;

export type ModelIdCheck = { ok: true; id: string } | { ok: false; reason: string };

export function validateModelId(value: string | undefined | null): ModelIdCheck {
  const id = (value ?? "").trim();

  if (!id) return { ok: false, reason: "model id is empty" };
  if (KNOWN_LEAKY.test(id)) {
    return { ok: false, reason: `profile prefix "${id.split(".")[0]}." can route outside Australia` };
  }
  if (!ALLOWED.test(id)) {
    return { ok: false, reason: "only anthropic.claude-* or au.anthropic.claude-* ids are accepted" };
  }

  return { ok: true, id };
}
