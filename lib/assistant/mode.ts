/*
 * Which engine answers, resolved from env. PURE and tiny: shared by the handler, the provider
 * factory and /api/health, so none of them repeats the parsing.
 *
 * LLM_GATEWAY_PROVIDER is the one switch:
 *   guided          no AI at all: the server returns approved knowledge-pack text by retrieval
 *   bedrock-sydney  Claude via Amazon Bedrock (AU only), see provider.ts
 *   mock            tests only
 *   disabled        (default, and anything unrecognised) every question gets the unavailable reply
 *
 * "guided" is a handler mode, not an LlmGatewayProvider: it has no prompt, no tool schema and no
 * model output to validate, so forcing it through that interface would mean rebuilding a fake
 * model request just to throw it away. The handler therefore asks isGuided() and never names a
 * vendor; every vendor stays behind provider.ts.
 */
type Env = Record<string, string | undefined>;

export const PROVIDER_NAMES = ["disabled", "guided", "bedrock-sydney", "mock"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export function isAssistantEnabled(env: Env = process.env): boolean {
  const flag = (env.CHAT_ASSISTANT_ENABLED ?? "").trim().toLowerCase();
  return flag === "true" || flag === "1";
}

/* Normalised choice. Unknown values collapse to "disabled", the safe default. */
export function providerName(env: Env = process.env): ProviderName {
  const choice = (env.LLM_GATEWAY_PROVIDER ?? "disabled").trim().toLowerCase();
  return (PROVIDER_NAMES as readonly string[]).includes(choice) ? (choice as ProviderName) : "disabled";
}

export function isGuided(env: Env = process.env): boolean {
  return providerName(env) === "guided";
}
