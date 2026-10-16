/*
 * One-off QR generator for the October 2026 flyers. Runs fully offline: it borrows qrcode.react
 * (v4, which bundles its own QR encoder) and react-dom/server from another local node_modules,
 * because this repo has no QR dependency and adding one for six static files is not worth it.
 * Output is committed (src/qr/*.svg), so building the flyers never needs this script again.
 *
 * Usage: node gen-qr.mjs <path-to-a-node_modules-that-has-qrcode.react-and-react-dom>
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FLYERS } from "./content.mjs";

const modules = process.argv[2];
if (!modules) throw new Error("pass a node_modules path that contains qrcode.react and react-dom");
const require = createRequire(join(modules, "noop.js"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { QRCodeSVG } = require("qrcode.react");

const out = join(dirname(fileURLToPath(import.meta.url)), "qr");
mkdirSync(out, { recursive: true });

for (const flyer of FLYERS) {
  const svg = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: flyer.qrUrl,
      size: 256,
      level: "M",
      marginSize: 0,
      bgColor: "#ffffff",
      fgColor: "#0b0b0a",
      title: `QR code linking to ${flyer.printUrl}`,
    }),
  );
  writeFileSync(join(out, `${flyer.slug}.svg`), `${svg}\n`);
  console.log(`qr ${flyer.slug} -> ${flyer.qrUrl}`);
}
