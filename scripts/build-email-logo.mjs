/*
 * Builds the email header logos from the approved lockups (no new artwork).
 *
 * Why separate files: the source PNGs are transparent. Dark-mode email clients (Outlook.com,
 * Gmail apps, Apple Mail) repaint or invert the background behind a transparent image, which
 * can leave a wordmark on a surface it was not drawn for. Flattening each lockup onto the exact
 * colour of the header it sits in keeps it legible whatever the client does. Trimmed so the
 * header has no dead space; rendered at 2x+ the display size for high-density screens.
 *
 *   light: dark wordmark on opaque white, the standard header (invitations, invoices, enquiries)
 *   dark:  off-white wordmark on opaque charcoal (--color-ink-3), the consultation header band
 *
 * Run: node scripts/build-email-logo.mjs   (outputs are committed; re-run only if the brand changes)
 */
import sharp from "sharp";

const SOURCE = "public/brand/drylake-lockup-light-bg.png";
const OUTPUT = "public/brand/drylake-email-logo-light.png";
const DARK_SOURCE = "public/brand/drylake-lockup-dark-bg.png";
const DARK_OUTPUT = "public/brand/drylake-email-logo-dark.png";
const CHARCOAL = "#1a1a17"; // EMAIL_COLORS.charcoal in lib/email/layout.ts
const PADDING = 8; // px at 2x: a small margin so the tile never touches the edge

async function build(source, output, background) {
  const trimmed = await sharp(source).trim().toBuffer();
  const info = await sharp(trimmed)
    .extend({ top: PADDING, bottom: PADDING, left: PADDING, right: PADDING, background })
    .flatten({ background })
    .png({ compressionLevel: 9, palette: true })
    .toFile(output);
  console.log(`${output}: ${info.width}x${info.height}, ${info.size} bytes`);
}

await build(SOURCE, OUTPUT, "#ffffff");
await build(DARK_SOURCE, DARK_OUTPUT, CHARCOAL);
