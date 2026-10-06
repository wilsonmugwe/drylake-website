/*
 * Schema-as-code guard (PR 3, disaster recovery).
 *
 * Why it exists: production tables, RLS policies, functions and grants were created in the
 * Supabase dashboard, so a lost project could not be rebuilt from Git. The fix is a baseline
 * migration produced from a REAL dump of production (docs/operations/disaster-recovery/
 * schema-as-code.md). This script keeps that fix honest:
 *
 *   1. Migration file names must be `<14-digit timestamp>_<snake_case>.sql`, unique and sorted,
 *      so `supabase db push` / `supabase migration up` apply them in a defined order.
 *   2. Every table, RPC and storage bucket the application code uses must be defined by a
 *      committed migration. Until a baseline lands (a file whose name contains `_baseline`)
 *      this is REPORTED but does not fail, because the gap is already known. Once a baseline
 *      exists, any new gap fails CI: a table added in the dashboard without a migration is drift.
 *
 * It only reads files. It never connects to a database.
 * Run: node scripts/check-migrations.mjs [--strict]
 * Tests: tests/disaster-recovery.test.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const MIGRATION_NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;

/* Name checks: format, unique timestamps, and that lexical order equals timestamp order. */
export function validateMigrationNames(names) {
  const problems = [];
  const seen = new Map();

  for (const name of names) {
    const match = MIGRATION_NAME.exec(name);

    if (!match) {
      problems.push(`${name}: name must be <YYYYMMDDHHMMSS>_<snake_case>.sql`);
      continue;
    }

    if (seen.has(match[1])) {
      problems.push(`${name}: timestamp ${match[1]} already used by ${seen.get(match[1])}`);
    }

    seen.set(match[1], name);
  }

  return problems;
}

const IDENT = String.raw`(?:"?([a-z_][a-z0-9_]*)"?\.)?"?([a-z_][a-z0-9_]*)"?`;

/* Objects a migration defines. Lower-cased SQL text in, sets of names out. */
export function definedObjects(sql) {
  const text = sql.toLowerCase();
  const tables = new Set();
  const functions = new Set();
  const buckets = new Set();

  for (const m of text.matchAll(new RegExp(String.raw`create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${IDENT}`, "g"))) {
    if (!m[1] || m[1] === "public") tables.add(m[2]);
  }

  for (const m of text.matchAll(new RegExp(String.raw`create\s+(?:or\s+replace\s+)?function\s+${IDENT}`, "g"))) {
    if (!m[1] || m[1] === "public") functions.add(m[2]);
  }

  // Buckets are rows in storage.buckets, inserted by id.
  for (const m of text.matchAll(/insert\s+into\s+storage\.buckets\s*\(([^)]*)\)\s*values\s*\(\s*'([^']+)'/g)) {
    if (m[1].trim().startsWith("id")) buckets.add(m[2]);
  }

  return { tables, functions, buckets };
}

/* Objects application source uses through supabase-js. */
export function referencedObjects(source) {
  const tables = new Set();
  const functions = new Set();
  const buckets = new Set();

  for (const m of source.matchAll(/\.storage\s*\.from\(\s*["'`]([a-z0-9_-]+)["'`]/g)) buckets.add(m[1]);

  for (const m of source.matchAll(/(?<!storage\s*)\.from\(\s*["'`]([a-z_][a-z0-9_]*)["'`]\s*\)/g)) {
    tables.add(m[1]);
  }

  for (const m of source.matchAll(/\.rpc\(\s*["'`]([a-z_][a-z0-9_]*)["'`]/g)) functions.add(m[1]);

  // A bucket name can also sit in a constant; storage.from(CONST) is resolved by the caller
  // passing the constant's value through `extraBuckets`.
  for (const name of buckets) tables.delete(name);

  return { tables, functions, buckets };
}

function union(sets) {
  const out = new Set();
  for (const s of sets) for (const v of s) out.add(v);
  return out;
}

/*
 * Compare what the code uses with what migrations define.
 * status: "ENFORCED" once a baseline migration exists (or strict), else "PENDING_BASELINE".
 */
export function evaluateCoverage({ migrations, sources, strict = false }) {
  const defined = migrations.map((m) => definedObjects(m.sql));
  const used = sources.map((s) => referencedObjects(s));
  const baselinePresent = migrations.some((m) => m.name.includes("_baseline"));

  const missing = {
    tables: [...union(used.map((u) => u.tables))].filter((t) => !union(defined.map((d) => d.tables)).has(t)).sort(),
    functions: [...union(used.map((u) => u.functions))].filter((f) => !union(defined.map((d) => d.functions)).has(f)).sort(),
    buckets: [...union(used.map((u) => u.buckets))].filter((b) => !union(defined.map((d) => d.buckets)).has(b)).sort(),
  };

  const missingCount = missing.tables.length + missing.functions.length + missing.buckets.length;
  const status = baselinePresent || strict ? "ENFORCED" : "PENDING_BASELINE";

  return { status, baselinePresent, missing, missingCount, ok: status === "PENDING_BASELINE" || missingCount === 0 };
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(path);
  }
  return out;
}

export function loadRepo(root) {
  const migDir = join(root, "supabase", "migrations");
  const names = readdirSync(migDir).filter((n) => n.endsWith(".sql")).sort();
  const migrations = names.map((name) => ({ name, sql: readFileSync(join(migDir, name), "utf8") }));
  const sources = ["app", "lib", "components", "proxy.ts"]
    .flatMap((p) => {
      const full = join(root, p);
      try {
        return statSync(full).isDirectory() ? walk(full) : [full];
      } catch {
        return [];
      }
    })
    .map((path) => {
      // Inline `storage.from(BUCKET_CONST)` so the bucket name is visible to the scan.
      let text = readFileSync(path, "utf8");
      for (const m of text.matchAll(/const\s+([A-Z_]+)\s*=\s*["'`]([a-z0-9_-]+)["'`]/g)) {
        text = text.replaceAll(new RegExp(String.raw`\.storage\s*\.from\(\s*${m[1]}\s*\)`, "g"), `.storage.from("${m[2]}")`);
      }
      return { path: relative(root, path), text };
    });
  return { names, migrations, sources };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const strict = process.argv.includes("--strict");
  const { names, migrations, sources } = loadRepo(process.cwd());
  const nameProblems = validateMigrationNames(names);
  const result = evaluateCoverage({ migrations, sources: sources.map((s) => s.text), strict });

  console.log(`migrations: ${names.length} (${result.baselinePresent ? "baseline present" : "no baseline yet"})`);
  for (const p of nameProblems) console.log(`NAME  ${p}`);
  for (const kind of ["tables", "functions", "buckets"]) {
    for (const name of result.missing[kind]) console.log(`MISSING ${kind.slice(0, -1)} ${name}: used by the app, not defined by any migration`);
  }

  if (nameProblems.length > 0) process.exit(1);

  if (result.status === "PENDING_BASELINE") {
    console.log(`status: PENDING_BASELINE (${result.missingCount} objects not yet in migrations; known gap, see docs/operations/disaster-recovery/schema-as-code.md)`);
    process.exit(0);
  }

  if (!result.ok) {
    console.log("status: DRIFT. Add a migration for every object above.");
    process.exit(1);
  }

  console.log("status: OK, every object the app uses is defined by a committed migration");
}
