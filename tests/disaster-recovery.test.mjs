/*
 * Disaster-recovery guards (PR 3). Covers the schema-as-code check, the read-only Stripe
 * reconciliation, and that the recovery docs exist and name every runbook.
 * Docs: docs/operations/disaster-recovery/.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  definedObjects,
  evaluateCoverage,
  loadRepo,
  referencedObjects,
  validateMigrationNames,
} from "../scripts/check-migrations.mjs";
import { main, readOnlyFetch, reconcile } from "../scripts/stripe-reconcile.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const DR = join(ROOT, "docs", "operations", "disaster-recovery");

describe("migration names", () => {
  it("accepts the committed migration and rejects bad names", () => {
    assert.deepEqual(validateMigrationNames(["20261005120000_client_status_lifecycle.sql"]), []);
    assert.equal(validateMigrationNames(["2026_bad.sql"]).length, 1);
    assert.equal(validateMigrationNames(["20261005120000_a.sql", "20261005120000_b.sql"]).length, 1);
  });

  it("every committed migration file is well named", () => {
    const { names } = loadRepo(ROOT);
    assert.deepEqual(validateMigrationNames(names), []);
  });
});

describe("schema coverage", () => {
  it("finds tables, functions and buckets defined by SQL", () => {
    const d = definedObjects(`
      create table if not exists public.invoices (id uuid);
      CREATE TABLE "projects" (id uuid);
      create table auth.ignored (id int);
      create or replace function public.current_clerk_org_id() returns text as $$ select 1 $$;
      insert into storage.buckets (id, name, public) values ('client-documents', 'client-documents', false);
    `);
    assert.deepEqual([...d.tables].sort(), ["invoices", "projects"]);
    assert.deepEqual([...d.functions], ["current_clerk_org_id"]);
    assert.deepEqual([...d.buckets], ["client-documents"]);
  });

  it("finds tables, RPCs and buckets used by supabase-js code", () => {
    const r = referencedObjects(`
      supabase.from("invoices").select("*");
      supabase.rpc("current_clerk_org_id");
      admin.storage.from("client-documents").createSignedUrl(p, 60);
    `);
    assert.deepEqual([...r.tables], ["invoices"]);
    assert.deepEqual([...r.functions], ["current_clerk_org_id"]);
    assert.deepEqual([...r.buckets], ["client-documents"]);
  });

  it("only reports before a baseline exists, and fails on drift after", () => {
    const sources = ['db.from("invoices"); db.from("projects");'];
    const before = evaluateCoverage({ migrations: [{ name: "20261005120000_x.sql", sql: "" }], sources });
    assert.equal(before.status, "PENDING_BASELINE");
    assert.equal(before.ok, true);
    assert.equal(before.missingCount, 2);

    const after = evaluateCoverage({
      migrations: [{ name: "20261010000000_baseline.sql", sql: "create table public.invoices (id uuid);" }],
      sources,
    });
    assert.equal(after.status, "ENFORCED");
    assert.equal(after.ok, false);
    assert.deepEqual(after.missing.tables, ["projects"]);

    const complete = evaluateCoverage({
      migrations: [{ name: "20261010000000_baseline.sql", sql: "create table invoices (id uuid); create table projects (id uuid);" }],
      sources,
    });
    assert.equal(complete.ok, true);
  });

  it("the live repo reports the known gap but does not fail CI before the baseline", () => {
    const { migrations, sources } = loadRepo(ROOT);
    const result = evaluateCoverage({ migrations, sources: sources.map((s) => s.text) });
    assert.ok(result.missing.tables.includes("invoices"), "invoices must be detected as used");
    assert.ok(result.missing.buckets.includes("client-documents"), "the documents bucket must be detected");
    if (!result.baselinePresent) assert.equal(result.ok, true);
  });
});

const invoice = (over = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  organization_id: "22222222-2222-4222-8222-222222222222",
  invoice_number: "DL-2026-0001",
  status: "OPEN",
  currency: "aud",
  total_cents: 11000,
  stripe_checkout_session_id: null,
  ...over,
});
const session = (over = {}) => ({
  id: "cs_test_1",
  payment_status: "paid",
  amount_total: 11000,
  currency: "aud",
  metadata: { drylake_invoice_id: "11111111-1111-4111-8111-111111111111" },
  ...over,
});

describe("stripe reconciliation (pure)", () => {
  it("agrees when the paid session matches a PAID invoice", () => {
    assert.deepEqual(reconcile({ invoices: [invoice({ status: "PAID", stripe_checkout_session_id: "cs_test_1" })], sessions: [session()] }), []);
  });

  it("flags a payment Stripe has but the database missed (lost webhook or old backup)", () => {
    const f = reconcile({ invoices: [invoice()], sessions: [session()] });
    assert.equal(f[0].code, "PAID_IN_STRIPE_NOT_IN_DB");
    assert.equal(f[0].severity, "HIGH");
  });

  it("flags amount mismatch, duplicate payment and unknown invoice", () => {
    const codes = (r) => r.map((x) => x.code).sort();
    assert.ok(codes(reconcile({ invoices: [invoice({ status: "PAID", stripe_checkout_session_id: "cs_test_1" })], sessions: [session({ amount_total: 999 })] })).includes("AMOUNT_MISMATCH"));
    assert.ok(codes(reconcile({ invoices: [invoice({ status: "PAID", stripe_checkout_session_id: "cs_test_1" })], sessions: [session(), session({ id: "cs_test_2" })] })).includes("DUPLICATE_PAYMENT"));
    assert.deepEqual(codes(reconcile({ invoices: [], sessions: [session()] })), ["PAID_SESSION_UNKNOWN_INVOICE"]);
  });

  it("ignores unpaid and non-Drylake sessions, and notes PAID rows with no session in the window", () => {
    assert.deepEqual(reconcile({ invoices: [invoice()], sessions: [session({ payment_status: "unpaid" }), session({ metadata: {} })] }), []);
    const f = reconcile({ invoices: [invoice({ status: "PAID" })], sessions: [] });
    assert.equal(f[0].code, "PAID_IN_DB_NO_STRIPE_SESSION_IN_WINDOW");
    assert.equal(f[0].severity, "LOW");
  });
});

describe("stripe reconciliation never writes", () => {
  it("readOnlyFetch refuses every method but GET, and any body", async () => {
    const calls = [];
    const fake = async (url, init) => { calls.push(init.method); return { ok: true }; };
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      await assert.rejects(() => readOnlyFetch("https://x", { method }, fake), /refuses/);
    }
    await assert.rejects(() => readOnlyFetch("https://x", { body: "{}" }, fake), /body/);
    await readOnlyFetch("https://x", {}, fake);
    assert.deepEqual(calls, ["GET"]);
  });

  it("the script has no other network or SDK path", () => {
    const src = readFileSync(join(ROOT, "scripts", "stripe-reconcile.mjs"), "utf8");
    const fetchCalls = src.match(/\bfetch\(|fetchImpl\(/g) ?? [];
    assert.equal(fetchCalls.length, 1, "only readOnlyFetch may call fetch");
    assert.doesNotMatch(src, /from ["'](stripe|@supabase\/supabase-js)["']/);
    assert.doesNotMatch(src, /\.(insert|update|upsert|delete)\(/);
  });

  it("end to end with fake HTTP: issues only GETs and reports the missed payment", async () => {
    const methods = [];
    const fake = async (url, init) => {
      methods.push(init.method);
      const body = url.includes("api.stripe.com") ? { data: [session()], has_more: false } : [invoice()];
      return { ok: true, status: 200, json: async () => body };
    };
    const env = { STRIPE_SECRET_KEY: "sk_test_fake", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "fake" };
    const log = console.log;
    const lines = [];
    console.log = (l) => lines.push(String(l));
    try {
      const code = await main(["node", "x", "--days", "30"], env, fake);
      assert.equal(code, 1);
    } finally {
      console.log = log;
    }
    assert.deepEqual([...new Set(methods)], ["GET"]);
    assert.ok(lines.some((l) => l.includes("PAID_IN_STRIPE_NOT_IN_DB")));
    assert.ok(!lines.join("\n").includes("sk_test_fake"), "keys are never printed");
  });

  it("refuses to run without keys and prints no values", async () => {
    const err = console.error;
    const lines = [];
    console.error = (l) => lines.push(String(l));
    try {
      assert.equal(await main(["node", "x"], {}, async () => { throw new Error("no network"); }), 2);
    } finally {
      console.error = err;
    }
    assert.match(lines[0], /Missing environment variables/);
  });
});

describe("recovery documentation", () => {
  const required = [
    "README.md",
    "data-inventory.md",
    "supabase-backup-and-restore.md",
    "schema-as-code.md",
    "stripe-reconciliation.md",
    "clerk-recovery.md",
    "vercel-recovery.md",
    "secrets-recovery-inventory.md",
    "dns-and-domain-recovery.md",
    "source-control.md",
    "runbooks.md",
    "wilson-actions.md",
  ];

  it("every recovery document exists", () => {
    for (const file of required) assert.ok(existsSync(join(DR, file)), `missing ${file}`);
  });

  it("the runbooks cover every required disaster scenario with all five stages", () => {
    const text = readFileSync(join(DR, "runbooks.md"), "utf8");
    const scenarios = [
      "Bad deployment",
      "Broken database migration",
      "Accidental deletion or data corruption",
      "Compromised credential",
      "Supabase outage",
      "Clerk outage",
      "Stripe webhook outage",
      "Vercel outage or deployment failure",
      "Lost environment variables",
      "DNS or domain problem",
    ];
    for (const s of scenarios) assert.match(text, new RegExp(`## .*${s}`), `runbook missing: ${s}`);
    for (const stage of ["Detection", "Containment", "Recovery", "Verification", "Post-incident"]) {
      const count = (text.match(new RegExp(`\\*\\*${stage}`, "g")) ?? []).length;
      assert.ok(count >= scenarios.length, `${stage} appears ${count} times, expected ${scenarios.length}`);
    }
  });

  it("the secrets inventory names variables but never values", () => {
    const text = readFileSync(join(DR, "secrets-recovery-inventory.md"), "utf8");
    assert.doesNotMatch(text, /(sk_live_|sk_test_|whsec_|re_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9]{8,})/);
    for (const name of ["SUPABASE_SECRET_KEY", "CLERK_SECRET_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY"]) {
      assert.match(text, new RegExp(name));
    }
  });
});
