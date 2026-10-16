/*
 * Source-level and build-output guards for the AI assistant: no credentials in the browser
 * bundle, no raw HTML rendering, client code never imports server modules, no em dashes in
 * visitor-facing strings, runbook present. The build scan runs when a build exists (.next).
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ENV_REGISTRY } from "../scripts/env-registry.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(ROOT, file), "utf8");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const CLIENT_FILES = ["components/assistant/AssistantLauncher.tsx", "components/assistant/AssistantPanel.tsx", "components/assistant/AssistantEscalationForm.tsx", "lib/assistant/client.ts", "lib/assistant/constants.ts"];
const SERVER_MODULES = /assistant\/(handler|provider|providers|knowledge|session|schema|prompt|retrieve|guards|model-id)|bedrock|server-only|turnstile"|supabase/;

describe("client / server boundary", () => {
  it("client code never imports server-side assistant modules or the Bedrock SDK", () => {
    for (const file of CLIENT_FILES) {
      const imports = [...read(file).matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const spec of imports) {
        assert.ok(!SERVER_MODULES.test(spec) || spec.endsWith("turnstile-action"), `${file} imports ${spec}`);
      }
    }
  });

  it("the Bedrock provider is server-only and the SDK is imported nowhere else", () => {
    assert.match(read("lib/assistant/providers/bedrock-sydney.ts"), /^import "server-only";/);
    const importers = walk(join(ROOT, "lib")).concat(walk(join(ROOT, "components")), walk(join(ROOT, "app"))).filter((f) => /\.(ts|tsx)$/.test(f) && readFileSync(f, "utf8").includes("@anthropic-ai/bedrock-sdk"));
    assert.deepEqual(importers.map((f) => f.slice(ROOT.length)), ["lib/assistant/providers/bedrock-sydney.ts"]);
  });

  it("the provider is reached only through the gateway interface", () => {
    for (const file of ["lib/assistant/handler.ts", "app/api/assistant/route.ts"]) {
      assert.doesNotMatch(read(file), /bedrock/i, `${file} must not name a vendor`);
    }
  });

  it("nothing renders model output as HTML", () => {
    for (const file of walk(join(ROOT, "components/assistant"))) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML/, file);
    }
  });
});

describe("visitor-facing copy", () => {
  it("has no em dashes in any component or visitor-facing module", () => {
    const files = [...walk(join(ROOT, "components/assistant")).map((f) => f.slice(ROOT.length)), "lib/assistant/constants.ts", "lib/assistant/guards.ts", "lib/assistant/client.ts"];
    for (const file of files) assert.ok(!read(file).includes("—"), `${file} contains an em dash`);
  });
});

describe("environment registry", () => {
  it("registers every assistant variable as optional, with a purpose", () => {
    const names = ["CHAT_ASSISTANT_ENABLED", "LLM_GATEWAY_PROVIDER", "ASSISTANT_MODEL_ID", "ASSISTANT_SESSION_SECRET", "ASSISTANT_DAILY_REQUEST_CAP", "ASSISTANT_MAX_TURNS", "ASSISTANT_IP_LIMIT_10MIN", "ASSISTANT_START_LIMIT_10MIN", "ASSISTANT_LAUNCHER_BUILD", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"];
    for (const name of names) {
      const entry = ENV_REGISTRY.find((e) => e.name === name);
      assert.ok(entry, name);
      assert.equal(entry.required, false, name);
      assert.ok(entry.purpose.length > 20, name);
    }
    for (const secret of ["ASSISTANT_SESSION_SECRET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"]) {
      assert.equal(ENV_REGISTRY.find((e) => e.name === secret).exposure, "secret");
    }
  });

  it("no assistant variable is public (NEXT_PUBLIC_)", () => {
    assert.ok(!ENV_REGISTRY.some((e) => /ASSISTANT|BEDROCK|AWS_/.test(e.name) && e.name.startsWith("NEXT_PUBLIC_")));
  });
});

describe("runbook", () => {
  it("documents setup, least-privilege IAM, budgets, the sovereignty finding and the off switch", () => {
    const doc = read("docs/operations/chat-assistant.md");
    for (const needle of ["ap-southeast-2", "bedrock:InvokeModel", "au.anthropic", "AWS Budgets", "CHAT_ASSISTANT_ENABLED", "Knowledge pack", "Switching it off", "apac."]) {
      assert.ok(doc.includes(needle), needle);
    }
    assert.ok(!doc.includes("—"));
    const policy = JSON.parse(doc.match(/```json\n([\s\S]*?)\n```/)[1]);
    const actions = policy.Statement.flatMap((s) => s.Action);
    assert.ok(actions.every((a) => /^bedrock:InvokeModel(WithResponseStream)?$/.test(a)));
    const resources = policy.Statement.flatMap((s) => s.Resource);
    assert.ok(resources.every((r) => r.startsWith("arn:aws:bedrock:") && !r.includes("*")), "exact ARNs only");
    assert.ok(resources.every((r) => /:(ap-southeast-2|ap-southeast-4):/.test(r)), "Australian regions only");
  });
});

describe("build output (when a build exists)", () => {
  const staticDir = join(ROOT, ".next/static");
  const maybe = existsSync(staticDir) ? it : it.skip;

  maybe("the browser bundle holds no AWS credentials, secrets or Bedrock SDK", () => {
    const patterns = [/AKIA[0-9A-Z]{16}/, /ASIA[0-9A-Z]{16}/, /aws_secret_access_key/i, /AWS_SECRET_ACCESS_KEY/, /AWS_ACCESS_KEY_ID/, /ASSISTANT_SESSION_SECRET/, /bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com/, /@anthropic-ai\/bedrock-sdk/, /abcdefghijklmnopqrstuvwxyz0123456789ABCD/];
    for (const file of walk(staticDir).filter((f) => /\.(js|css|html|json|map)$/.test(f))) {
      const text = readFileSync(file, "utf8");
      for (const pattern of patterns) assert.doesNotMatch(text, pattern, `${file.slice(ROOT.length)} matches ${pattern}`);
    }
  });
});
