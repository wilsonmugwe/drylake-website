/*
 * LLM gateway interface for the assistant (portfolio Tool Interoperability rule). Business code
 * (handler.ts) imports ONLY this file; the implementation is chosen at runtime by the
 * LLM_GATEWAY_PROVIDER env var:
 *
 *   disabled        (default) never calls a model
 *   bedrock-sydney  Claude via Amazon Bedrock, region forced to ap-southeast-2, AU-only model id
 *   mock            deterministic, for tests and e2e; REFUSES to load when VERCEL_ENV=production
 *
 * Decision: chose Bedrock Sydney now because the owner requires chat text to stay in Australia;
 * would revisit when an AU-hosted gateway (e.g. self-hosted LiteLLM) or a cheaper AU-resident
 * model is preferred. Swapping means adding an implementation and flipping the env var.
 */
export type LlmRequest = {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  /* The `reply` tool schema: providers force the model to answer through it. */
  tool: { name: string; description: string; input_schema: Record<string, unknown> };
};

export type LlmResult =
  | { ok: true; output: unknown; usage?: { inputTokens: number; outputTokens: number } }
  | { ok: false; kind: "throttled" | "unavailable" | "error" };

export interface LlmGatewayProvider {
  readonly name: string;
  generate(request: LlmRequest): Promise<LlmResult>;
}

export const disabledProvider: LlmGatewayProvider = {
  name: "disabled",
  async generate() {
    return { ok: false, kind: "unavailable" };
  },
};

type Env = Record<string, string | undefined>;

export async function getProvider(env: Env = process.env): Promise<LlmGatewayProvider> {
  const choice = (env.LLM_GATEWAY_PROVIDER ?? "disabled").trim().toLowerCase();

  if (choice === "bedrock-sydney") {
    // Dynamic import: the server-only Bedrock module and SDK load only when selected.
    const { createBedrockSydneyProvider } = await import("./providers/bedrock-sydney.ts");
    return createBedrockSydneyProvider(env);
  }

  if (choice === "mock") {
    if (env.VERCEL_ENV === "production") {
      console.error("Assistant: the mock LLM provider is refused in production.");
      return disabledProvider;
    }
    const { mockProvider } = await import("./providers/mock.ts");
    return mockProvider;
  }

  return disabledProvider;
}
