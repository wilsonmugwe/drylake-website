/*
 * Builds the email header logo from the approved light-background lockup (no new artwork).
 *
 * Why a separate file: the source PNG is transparent. Dark-mode email clients (Outlook.com,
 * Gmail apps, Apple Mail) repaint or invert the background behind a transparent image, which
 * leaves the charcoal "Drylake" wordmark on a dark surface, unreadable. Flattening onto solid
 * white keeps the wordmark legible whatever the client does. Trimmed so the header has no
 * dead space; rendered at 2x the display size for sharp text on high-density screens.
 *
 * Run: node scripts/build-email-logo.mjs   (output is committed; re-run only if the brand changes)
 */
import sharp from "sharp";

const SOURCE = "public/brand/drylake-lockup-light-bg.png";
const OUTPUT = "public/brand/drylake-email-logo-light.png";
const PADDING = 8; // px at 2x: a small white margin so the tile never touches the edge

const trimmed = await sharp(SOURCE).trim().toBuffer();

const info = await sharp(trimmed)
  .extend({ top: PADDING, bottom: PADDING, left: PADDING, right: PADDING, background: "#ffffff" })
  .flatten({ background: "#ffffff" })
  .png({ compressionLevel: 9, palette: true })
  .toFile(OUTPUT);

console.log(`${OUTPUT}: ${info.width}x${info.height}, ${info.size} bytes`);
