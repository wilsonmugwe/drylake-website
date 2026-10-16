import "server-only";

import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";

import { BEDROCK_REGION, DEFAULT_MODEL_ID, validateModelId } from "../model-id.ts";
import type { LlmGatewayProvider } from "../provider.ts";

/*
 * Claude on Amazon Bedrock, Sydney. SERVER ONLY (the import above makes a client import a build error).
 *
 * Why @anthropic-ai/bedrock-sdk and not the AWS SDK Converse API: it speaks the same Messages API
 * and tool-use contract as the rest of the Claude tooling (forced tool_choice gives schema-shaped
 * output with one call), signs with SigV4 itself, and retries 429/5xx. Converse would mean a
 * second request/response vocabulary for no sovereignty difference. Both hit bedrock-runtime.
 *
 * Sovereignty is enforced HERE, not by convention:
 *   - region and base URL are pinned to ap-southeast-2; AWS_REGION and ANTHROPIC_BEDROCK_BASE_URL
 *     are never consulted (the SDK would otherwise honour them and default to us-east-1);
 *   - the model id must pass validateModelId (anthropic.* or au.anthropic.* only), checked on
 *     every construction, so an apac./global./us./eu. id disables the assistant instead of leaking.
 * Credentials come from env only: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (+ AWS_SESSION_TOKEN).
 * The SDK may also honour AWS_BEARER_TOKEN_BEDROCK (a Bedrock API key); the endpoint is still
 * pinned to Sydney. Vercel OIDC role: see docs/operations/chat-assistant.md.
 * Timeout 12 s, one retry (the SDK backs off on throttling), then the caller's circuit breaker.
 */
const TIMEOUT_MS = 12_000;

type Env = Record<string, string | undefined>;

const unavailable: LlmGatewayProvider = {
  name: "bedrock-sydney",
  async generate() {
    return { ok: false, kind: "unavailable" };
  },
};

export function createBedrockSydneyProvider(env: Env): LlmGatewayProvider {
  const model = validateModelId(env.ASSISTANT_MODEL_ID?.trim() || DEFAULT_MODEL_ID);

  if (!model.ok) {
    console.error("Assistant: ASSISTANT_MODEL_ID refused (sovereignty):", model.reason);
    return unavailable;
  }

  const accessKey = env.AWS_ACCESS_KEY_ID;
  const secretKey = env.AWS_SECRET_ACCESS_KEY;

  if (!accessKey || !secretKey) {
    console.error("Assistant: AWS credentials are not configured.");
    return unavailable;
  }

  const client = new AnthropicBedrock({
    awsRegion: BEDROCK_REGION,
    baseURL: `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com`,
    awsAccessKey: accessKey,
    awsSecretKey: secretKey,
    awsSessionToken: env.AWS_SESSION_TOKEN || null,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
  });

  return {
    name: "bedrock-sydney",
    async generate(request) {
      try {
        const response = await client.messages.create({
          model: model.id,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          tools: [request.tool as never],
          tool_choice: { type: "tool", name: request.tool.name },
        });

        const block = response.content.find((part) => part.type === "tool_use");

        if (!block || block.type !== "tool_use") return { ok: false, kind: "error" };

        return {
          ok: true,
          output: block.input,
          usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        };
      } catch (error) {
        const status = (error as { status?: number }).status;
        // Class and status only: error text can echo the request (visitor words).
        console.error("Assistant: Bedrock call failed:", (error as Error).name, status ?? "");
        return { ok: false, kind: status === 429 ? "throttled" : "unavailable" };
      }
    },
  };
}
