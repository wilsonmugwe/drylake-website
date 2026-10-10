/*
 * Favicon regression guard (2026-10-10).
 *
 * Google Search still showed the Vercel triangle beside drylake.com.au: the create-next-app
 * default favicon.ico shipped from 22 Sep to 6 Oct 2026 and Google cached it. These checks
 * fail if that default comes back, if a second favicon source appears (public/ files or a
 * metadata `icons` field that would compete with the app/ file conventions), or if the
 * manifest icons stop matching what Google and Android need.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import manifest from "../app/manifest.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p));

// sha256 of the create-next-app favicon.ico (Vercel triangle) from commit 2a83566.
const SCAFFOLD_FAVICON_SHA256 = "2b8ad2d33455a8f736fc3a8ebf8f0bdea8848ad4c0db48a2833bd0f9cd775932";

function icoSizes(buf) {
  const sizes = [];
  for (let i = 0; i < buf.readUInt16LE(4); i++) sizes.push(buf[6 + 16 * i] || 256);
  return sizes;
}

describe("favicon", () => {
  it("is not the create-next-app default that Google cached", () => {
    const sha = createHash("sha256").update(read("app/favicon.ico")).digest("hex");
    assert.notEqual(sha, SCAFFOLD_FAVICON_SHA256);
  });

  it("favicon.ico carries 16, 32 and 48 px (Google needs at least 48 px, square)", () => {
    const sizes = icoSizes(read("app/favicon.ico"));
    for (const px of [16, 32, 48]) assert.ok(sizes.includes(px), `missing ${px}px entry`);
  });

  it("has one favicon source: app/ file conventions, nothing in public/ or metadata icons", () => {
    for (const stray of ["public/favicon.ico", "public/favicon.png", "public/favicon.svg", "public/site.webmanifest", "public/manifest.json", "app/icon.png", "app/manifest.json", "app/manifest.webmanifest"]) {
      assert.ok(!existsSync(join(ROOT, stray)), `${stray} would compete with the app/ icons`);
    }
    assert.doesNotMatch(read("app/layout.tsx").toString(), /\bicons\s*:/, "layout metadata must not declare icons");
  });

  it("manifest icons are the tile at 192 and 512 px, and every src exists", () => {
    const m = manifest();
    assert.equal(m.name, "Drylake");
    const bySize = Object.fromEntries(m.icons.map((i) => [i.sizes, i]));
    for (const px of [192, 512]) {
      const icon = bySize[`${px}x${px}`];
      assert.ok(icon, `manifest needs a ${px}px icon`);
      const png = read(join("public", icon.src));
      assert.equal(png.subarray(1, 4).toString("latin1"), "PNG");
      assert.equal(png.readUInt32BE(16), px);
      assert.equal(png.readUInt32BE(20), px);
      assert.notEqual(icon.purpose, "maskable", "a mask would crop the plates");
    }
    for (const icon of m.icons) {
      const file = icon.src === "/icon.svg" ? "app/icon.svg" : join("public", icon.src);
      assert.ok(existsSync(join(ROOT, file)), `${icon.src} missing`);
    }
  });
});
