#!/usr/bin/env node
/*
 * Writes .env.example from scripts/env-registry.mjs: every configurable variable, NAMES ONLY,
 * grouped required first, with its purpose as a comment. Platform variables (set by Vercel) are
 * left out. tests/env-example.test.mjs fails when .env.example and the registry disagree, so
 * run `node scripts/generate-env-example.mjs` after editing the registry.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { ENV_REGISTRY } from "./env-registry.mjs";

export function renderEnvExample() {
  const configurable = ENV_REGISTRY.filter((entry) => entry.exposure !== "platform");
  const block = (title, entries) => [
    `# ---- ${title} ----`,
    ...entries.flatMap((entry) => [`# ${entry.purpose} (${entry.exposure})`, `${entry.name}=`]),
    "",
  ];

  return [
    "# Generated from scripts/env-registry.mjs by scripts/generate-env-example.mjs. Do not edit by hand.",
    "# Copy to .env.local for local development. Never commit real values.",
    "",
    ...block("Required", configurable.filter((entry) => entry.required)),
    ...block("Optional", configurable.filter((entry) => !entry.required)),
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL("../.env.example", import.meta.url), renderEnvExample());
  console.log("wrote .env.example");
}
