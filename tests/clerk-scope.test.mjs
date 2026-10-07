/*
 * Public pages carry no Clerk client code (components/auth/ClerkScope.tsx).
 *
 * Production mobile Lighthouse on 2026-10-07 measured ~600 KB of script on "/" and LCP ~6 s,
 * because the root layout wrapped every route in <ClerkProvider>. These checks fail if Clerk's
 * browser SDK is pulled back into a public route: through the root layout, the public header,
 * or any component a public page renders.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(ROOT, file), "utf8");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(relative(ROOT, path));
  }
  return out;
}

/* Client SDK only: "@clerk/nextjs/server" is server code and ships no browser script. */
const CLERK_CLIENT = /from "@clerk\/nextjs"/;

const PUBLIC_COMPONENT_DIRS = [
  "components/layout",
  "components/navigation",
  "components/sections",
  "components/system",
  "components/seo",
  "components/brand",
  "components/ui",
].filter((dir) => existsSync(join(ROOT, dir)));

/* Route segments that mount ClerkScope. Everything else under app/ is public. */
const CLERK_SEGMENTS = ["app/admin", "app/client", "app/portal", "app/sign-in", "app/sign-up"];

describe("Clerk is scoped to the signed-in areas", () => {
  it("the root layout mounts no ClerkProvider", () => {
    const layout = read("app/layout.tsx");
    assert.ok(!CLERK_CLIENT.test(layout));
    assert.ok(!/<ClerkProvider\b/.test(layout));
  });

  it("no public component imports the Clerk client SDK", () => {
    const offenders = PUBLIC_COMPONENT_DIRS.flatMap((dir) => walk(join(ROOT, dir))).filter((file) =>
      CLERK_CLIENT.test(read(file))
    );
    assert.deepEqual(offenders, []);
  });

  it("no public route file imports the Clerk client SDK", () => {
    const offenders = walk(join(ROOT, "app"))
      .filter((file) => !file.startsWith("app/api/"))
      .filter((file) => !CLERK_SEGMENTS.some((segment) => file.startsWith(`${segment}/`)))
      .filter((file) => CLERK_CLIENT.test(read(file)));
    assert.deepEqual(offenders, []);
  });

  it("every signed-in area and auth screen mounts ClerkScope in its layout", () => {
    for (const segment of CLERK_SEGMENTS) {
      const layout = read(`${segment}/layout.tsx`);
      assert.match(layout, /import ClerkScope from "@\/components\/auth\/ClerkScope"/, segment);
      assert.match(layout, /<ClerkScope>/, segment);
    }
  });

  it("Client Login is a plain link to /portal, which serves both signed-in and signed-out", async () => {
    const { CLIENT_LOGIN, PORTAL_PATH } = await import("../lib/navigation/site-nav.ts");
    assert.equal(CLIENT_LOGIN.href, PORTAL_PATH);
    assert.ok(!/useAuth|useUser|useClerk/.test(read("components/navigation/ClientAccessLink.tsx")));
    // proxy.ts must keep sending a signed-out /portal request to sign-in with a return URL.
    const proxy = read("proxy.ts");
    assert.match(proxy, /"\/portal\(\.\*\)"/);
    assert.match(proxy, /signIn\.searchParams\.set\("redirect_url"/);
  });
});
