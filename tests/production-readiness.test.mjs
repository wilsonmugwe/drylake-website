/*
 * Production-readiness guards (PR 1). Covers what the lifecycle depends on but no feature
 * test owned: the environment-variable contract, production URLs, the invitation origin,
 * and the root error boundary. Docs: docs/production-readiness/.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { auditEnv, hostClass, parseDotenv } from "../scripts/check-env.mjs";
import { ENV_REGISTRY, looksSecret } from "../scripts/env-registry.mjs";
import { invitationOrigin, invitationRedirectUrl } from "../lib/clients/invitations.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE_DIRS = ["app", "lib", "components"];
const SOURCE_FILES = ["proxy.ts", "next.config.ts"];

function sourceFiles() {
  const out = [...SOURCE_FILES.map((file) => join(ROOT, file))];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(full);
    }
  };
  for (const dir of SOURCE_DIRS) walk(join(ROOT, dir));
  return out;
}

const relative = (file) => file.slice(ROOT.length).replaceAll("\\", "/");

/* A full, valid production-shaped environment. Values are fake shapes, never real keys. */
function productionEnv(overrides = {}) {
  const env = {};
  for (const entry of ENV_REGISTRY) {
    if (entry.required) env[entry.name] = `value-for-${entry.name}`;
  }
  return {
    ...env,
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_fake",
    STRIPE_SECRET_KEY: "sk_live_fake",
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    ...overrides,
  };
}

describe("environment registry", () => {
  it("registers every variable the app reads (no undocumented production config)", () => {
    const registered = new Set(ENV_REGISTRY.map((entry) => entry.name));
    const unregistered = new Set();

    for (const file of sourceFiles()) {
      for (const match of readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        if (!registered.has(match[1])) unregistered.add(`${match[1]} (${relative(file)})`);
      }
    }

    assert.deepEqual([...unregistered], []);
  });

  it("never marks a NEXT_PUBLIC_ variable as secret, nor gives a secret a public name", () => {
    for (const entry of ENV_REGISTRY) {
      if (entry.name.startsWith("NEXT_PUBLIC_")) {
        assert.equal(entry.exposure, "public", entry.name);
        assert.equal(looksSecret(entry.name), false, entry.name);
      }
      if (entry.exposure === "secret") assert.equal(entry.name.startsWith("NEXT_PUBLIC_"), false);
    }
  });

  it("has no duplicate names", () => {
    const names = ENV_REGISTRY.map((entry) => entry.name);
    assert.equal(new Set(names).size, names.length);
  });
});

describe("check-env audit", () => {
  it("passes a complete production environment", () => {
    assert.deepEqual(auditEnv(productionEnv()).problems, []);
  });

  it("reports missing required variables by name", () => {
    const env = productionEnv();
    delete env.STRIPE_WEBHOOK_SECRET;
    assert.ok(auditEnv(env).problems.some((p) => p.startsWith("STRIPE_WEBHOOK_SECRET: required")));
  });

  it("reports obsolete, unregistered and incorrectly public variables", () => {
    const { problems } = auditEnv(
      productionEnv({ SUPABASE_SERVICE_ROLE_KEY: "x1", OLD_THING: "x2", NEXT_PUBLIC_STRIPE_SECRET: "x3" })
    );
    assert.ok(problems.some((p) => p.startsWith("SUPABASE_SERVICE_ROLE_KEY: obsolete")));
    assert.ok(problems.some((p) => p.startsWith("OLD_THING: unregistered")));
    assert.ok(problems.some((p) => p.startsWith("NEXT_PUBLIC_STRIPE_SECRET: incorrectly public")));
  });

  it("reports duplicated values without printing them", () => {
    const { problems, rows } = auditEnv(productionEnv({ CONTACT_TO_EMAIL: "same", EMAIL_FROM: "same" }));
    const duplicate = problems.find((p) => p.startsWith("duplicated value"));
    assert.ok(duplicate);
    assert.equal(duplicate.includes("same"), false);
    assert.equal(JSON.stringify(rows).includes("value-for-"), false);
  });

  it("rejects test-mode keys, preview hosts and localhost in production", () => {
    const { problems } = auditEnv(
      productionEnv({
        STRIPE_SECRET_KEY: "sk_test_fake",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fake",
        APP_BASE_URL: "https://drylake-website-git-main.vercel.app",
      })
    );
    assert.ok(problems.some((p) => p.includes("STRIPE_SECRET_KEY")));
    assert.ok(problems.some((p) => p.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")));
    assert.ok(problems.some((p) => p.includes("APP_BASE_URL: points at vercel-preview")));
  });

  it("allows test keys outside production", () => {
    const env = productionEnv({ STRIPE_SECRET_KEY: "sk_test_fake", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fake" });
    assert.deepEqual(auditEnv(env, "preview").problems, []);
  });

  it("parses dotenv files including quoted values", () => {
    assert.deepEqual(parseDotenv('A="1"\nexport B=two\n# c\nC=\'x=y\''), { A: "1", B: "two", C: "x=y" });
  });

  it("classifies hosts", () => {
    assert.equal(hostClass("http://localhost:3000"), "localhost");
    assert.equal(hostClass("https://x.vercel.app"), "vercel-preview");
    assert.equal(hostClass("https://drylake.com.au"), "drylake.com.au");
  });
});

describe("production URLs", () => {
  it("no production code path hard-codes localhost, a vercel.app host or a stale domain", () => {
    // invoice-url.ts allows http://localhost only for local development, guarded by tests.
    const allowed = new Set(["lib/invoices/invoice-url.ts", "lib/discovery/indexnow.ts"]);
    const offenders = [];

    for (const file of sourceFiles()) {
      const rel = relative(file);
      if (allowed.has(rel)) continue;
      const text = readFileSync(file, "utf8");
      if (/localhost|127\.0\.0\.1|\.vercel\.app|drylaketechnologies|drylake\.tech/i.test(text)) offenders.push(rel);
    }

    assert.deepEqual(offenders, []);
  });
});

describe("invitation origin", () => {
  it("production always invites to the canonical domain, whatever host the admin used", () => {
    const env = { VERCEL_ENV: "production" };
    assert.equal(invitationOrigin("https://drylake-website-abc.vercel.app", env), "https://drylake.com.au");
    assert.equal(
      invitationRedirectUrl(invitationOrigin("https://drylake-website-abc.vercel.app", env)),
      "https://drylake.com.au/portal/accept-invitation"
    );
  });

  it("production honours a valid APP_BASE_URL and ignores a non-https one", () => {
    assert.equal(invitationOrigin("https://x.vercel.app", { VERCEL_ENV: "production", APP_BASE_URL: "https://drylake.com.au/" }), "https://drylake.com.au");
    assert.equal(invitationOrigin("https://x.vercel.app", { VERCEL_ENV: "production", APP_BASE_URL: "ftp://evil" }), "https://drylake.com.au");
  });

  it("preview and local keep the request origin (their own Clerk instance)", () => {
    assert.equal(invitationOrigin("https://pr-1.vercel.app", { VERCEL_ENV: "preview" }), "https://pr-1.vercel.app");
    assert.equal(invitationOrigin("http://localhost:3000", {}), "http://localhost:3000");
  });

  it("every invitation route uses invitationOrigin, never the raw request origin", () => {
    const routes = [
      "app/api/admin/clients/route.ts",
      "app/api/admin/clients/[organizationId]/invitations/route.ts",
      "app/api/admin/clients/[organizationId]/invitations/[invitationId]/route.ts",
    ];
    for (const route of routes) {
      const text = readFileSync(join(ROOT, route), "utf8");
      assert.match(text, /invitationOrigin\(new URL\(request\.url\)\.origin, process\.env\)/, route);
      assert.doesNotMatch(text, /invitationRedirectUrl\(new URL\(request\.url\)\.origin\)/, route);
    }
  });
});

describe("error boundaries", () => {
  it("a root global-error boundary exists and never renders error.message or the stack", () => {
    const file = join(ROOT, "app/global-error.tsx");
    assert.ok(existsSync(file));
    const text = readFileSync(file, "utf8");
    assert.match(text, /<html/);
    assert.match(text, /error\.digest/);
    assert.doesNotMatch(text, /\{error\.message\}|\{error\.stack\}|error\.message\s*\}/);
  });

  it("route-level boundaries exist for the public site and the client portal", () => {
    for (const file of ["app/error.tsx", "app/client/error.tsx", "app/not-found.tsx"]) {
      assert.ok(existsSync(join(ROOT, file)), file);
    }
  });

  it("client-visible error copy carries no em dashes", () => {
    for (const file of ["app/global-error.tsx", "app/error.tsx", "app/client/error.tsx"]) {
      assert.equal(readFileSync(join(ROOT, file), "utf8").includes("—"), false, file);
    }
  });
});
