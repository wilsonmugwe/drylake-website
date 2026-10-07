/*
 * Brand artwork regression guard (logo option 2, drylake-ops D22, 2026-10-06).
 *
 * The old raster logo read "DRYLAKE TECHNOLOGIES", which is neither the brand nor the legal
 * name (Drylake Pty Ltd). These checks fail if it comes back, if a header or footer points at
 * an image that is not in /public, or if the Organization logo in JSON-LD stops resolving.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { LOGO_PATH, organizationNode } from "../lib/discovery/structured-data.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const SVGS = [
  "public/brand/drylake-wordmark-dark-bg.svg",
  "public/brand/drylake-wordmark-light-bg.svg",
  "public/brand/drylake-mark-tile.svg",
  "app/icon.svg",
];

describe("brand artwork", () => {
  it("ships every vector file, titled Drylake, with no TECHNOLOGIES lettering", () => {
    for (const file of SVGS) {
      assert.ok(existsSync(join(ROOT, file)), `${file} missing`);
      const svg = read(file);
      assert.match(svg, /<title>Drylake<\/title>/, `${file} needs an accessible title`);
      assert.match(svg, /aria-label="Drylake"/, `${file} needs aria-label`);
      assert.doesNotMatch(svg, /technolog/i, `${file} carries the retired name`);
    }
  });

  it("removes the retired DRYLAKE TECHNOLOGIES raster", () => {
    for (const old of ["public/brand/drylake-logo-black.png", "public/brand/drylake-logo-white.png"]) {
      assert.ok(!existsSync(join(ROOT, old)), `${old} should be deleted`);
    }
  });

  it("header shows [mark] Drylake, footer the wordmark, and every brand src exists", () => {
    for (const file of ["components/layout/Navbar.tsx", "components/layout/Footer.tsx", "components/brand/BrandHomeLink.tsx"]) {
      const src = read(file);
      assert.ok(!src.includes("drylake-logo-"), `${file} still references the old logo`);
      for (const [, path] of src.matchAll(/src="(\/brand\/[^"]+)"/g)) {
        assert.ok(existsSync(join(ROOT, "public", path)), `${file}: ${path} not in /public`);
      }
    }

    // Redesign (2026-10-07): the approved mark sits immediately left of the word Drylake.
    assert.match(read("components/layout/Navbar.tsx"), /<BrandHomeLink \/>/);
    const lockup = read("components/brand/BrandHomeLink.tsx");
    assert.ok(lockup.indexOf("<DrylakeMark") < lockup.indexOf(">\n        Drylake\n"), "mark before the word");
    assert.match(read("components/layout/Footer.tsx"), /\/brand\/drylake-wordmark-dark-bg\.svg/);
  });

  it("the inline header mark is the approved tile geometry", () => {
    const tile = read("public/brand/drylake-mark-tile.svg");
    const inline = read("components/brand/DrylakeMark.tsx");
    const path = tile.match(/<path d="([^"]+)"/)[1];

    assert.ok(inline.includes(path), "MARK_Y_PATH must match drylake-mark-tile.svg");
    assert.ok(inline.includes('translate(-68.56 60.13) scale(0.7930)'));
    assert.ok(inline.includes("#C2703D") && inline.includes("#17191E"));
  });

  it("publishes a square Organization logo that exists and meets Google's 112 px minimum", () => {
    const logo = organizationNode().logo;
    assert.equal(logo["@type"], "ImageObject");
    assert.equal(logo.url, `https://drylake.com.au${LOGO_PATH}`);
    assert.ok(logo.width >= 112 && logo.width === logo.height);
    const png = readFileSync(join(ROOT, "public", LOGO_PATH));
    assert.equal(png.subarray(1, 4).toString("latin1"), "PNG");
    assert.equal(png.readUInt32BE(16), logo.width, "PNG width must match the declared width");
    assert.equal(png.readUInt32BE(20), logo.height, "PNG height must match the declared height");
  });

  it("ships the favicon set (ico + svg icon + apple icon)", () => {
    const ico = readFileSync(join(ROOT, "app/favicon.ico"));
    assert.equal(ico.readUInt16LE(2), 1, "favicon.ico must be an ICO");
    assert.ok(ico.readUInt16LE(4) >= 3, "favicon.ico should carry 16, 32 and 48 px images");
    const apple = readFileSync(join(ROOT, "app/apple-icon.png"));
    assert.equal(apple.readUInt32BE(16), 180);
    assert.equal(apple.readUInt32BE(20), 180);
  });
});
