#!/usr/bin/env node
/*
 * Audits an environment against scripts/env-registry.mjs WITHOUT printing any value.
 *
 * Usage (Wilson, production):
 *   vercel env pull .env.production.check --environment=production
 *   node scripts/check-env.mjs .env.production.check production
 *   rm .env.production.check            # it contains every production secret
 *
 * Output reports names and value CLASSES only (set/empty, live/test mode, host class).
 * Exit code 1 when anything required is missing or any rule fails.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { ENV_REGISTRY, KNOWN_OBSOLETE, PLATFORM_PREFIXES, looksSecret } from "./env-registry.mjs";

export function parseDotenv(text) {
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

    if (!match) continue;

    let value = match[2];

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[match[1]] = value;
  }

  return env;
}

/* Host class of a URL-ish value, never the value itself. */
export function hostClass(value) {
  try {
    const url = new URL(value);

    if (["localhost", "127.0.0.1"].includes(url.hostname)) return "localhost";
    if (url.hostname.endsWith(".vercel.app")) return "vercel-preview";
    if (url.hostname === "drylake.com.au" || url.hostname.endsWith(".drylake.com.au")) return "drylake.com.au";
    if (url.hostname.endsWith(".supabase.co")) return "supabase";

    return "other";
  } catch {
    return "not-a-url";
  }
}

/*
 * Pure audit. `environment` is "production" | "preview" | "development".
 * Returns { rows, problems } where rows carry no values.
 */
export function auditEnv(env, environment = "production") {
  const registered = new Map(ENV_REGISTRY.map((entry) => [entry.name, entry]));
  const problems = [];
  const rows = [];
  const production = environment === "production";

  for (const entry of ENV_REGISTRY) {
    if (entry.exposure === "platform") continue;

    const value = env[entry.name];
    const state = value === undefined ? "missing" : value.trim() === "" ? "empty" : "set";
    rows.push({ name: entry.name, category: entry.required ? "required" : "optional", state });

    if (entry.required && state !== "set") {
      problems.push(`${entry.name}: required but ${state}`);
    }
  }

  for (const name of Object.keys(env)) {
    if (registered.has(name) || PLATFORM_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;

    const category = KNOWN_OBSOLETE.includes(name) ? "obsolete" : "unregistered";
    rows.push({ name, category, state: "set" });
    problems.push(`${name}: ${category} (not read by the app; remove or register it)`);
  }

  for (const name of Object.keys(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && looksSecret(name)) {
      problems.push(`${name}: incorrectly public (a secret-looking name is inlined into the browser bundle)`);
    }

    const entry = registered.get(name);

    if (entry?.exposure === "secret" && name.startsWith("NEXT_PUBLIC_")) {
      problems.push(`${name}: incorrectly public (registered as secret)`);
    }
  }

  // Duplicates: two names carrying the same non-empty value, compared by hash only.
  const byHash = new Map();

  for (const [name, value] of Object.entries(env)) {
    if (!value || PLATFORM_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;

    const digest = createHash("sha256").update(value).digest("hex");
    byHash.set(digest, [...(byHash.get(digest) ?? []), name]);
  }

  for (const names of byHash.values()) {
    if (names.length > 1) problems.push(`duplicated value: ${names.join(" = ")}`);
  }

  if (production) {
    const stripe = env.STRIPE_SECRET_KEY ?? "";
    if (stripe && !stripe.startsWith("sk_live_") && !stripe.startsWith("rk_live_")) {
      problems.push("STRIPE_SECRET_KEY: not a live-mode key in production");
    }

    const clerk = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
    if (clerk && !clerk.startsWith("pk_live_")) {
      problems.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: not a production (pk_live_) instance");
    }

    for (const name of ["APP_BASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
      if (!env[name]) continue;
      const cls = hostClass(env[name]);
      if (cls === "localhost" || cls === "vercel-preview" || cls === "not-a-url") {
        problems.push(`${name}: points at ${cls} in production`);
      }
    }

    if (env.APP_BASE_URL && hostClass(env.APP_BASE_URL) !== "drylake.com.au") {
      problems.push("APP_BASE_URL: set to a non-drylake.com.au host; leave it unset in production");
    }

    for (const name of ["NEXT_PUBLIC_CLERK_SIGN_IN_URL", "NEXT_PUBLIC_CLERK_SIGN_UP_URL"]) {
      const expected = name.endsWith("IN_URL") ? "/sign-in" : "/sign-up";
      if (env[name] && env[name] !== expected) problems.push(`${name}: expected ${expected}`);
    }
  }

  return { rows, problems };
}

function main() {
  const [file, environment = "production"] = process.argv.slice(2);

  if (!file) {
    console.error("Usage: node scripts/check-env.mjs <pulled-env-file> [production|preview|development]");
    process.exit(2);
  }

  const { rows, problems } = auditEnv(parseDotenv(readFileSync(file, "utf8")), environment);

  console.log(`Environment audit (${environment}). Names only, no values.\n`);
  for (const row of rows) console.log(`${row.category.padEnd(12)} ${row.state.padEnd(8)} ${row.name}`);
  console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n- ${problems.join("\n- ")}` : "\nNo problems found.");
  process.exit(problems.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
