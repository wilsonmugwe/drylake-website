/*
 * Drylake email design system: the ONE layout and set of building blocks every
 * application-sent email uses (client invitation, invoice issue/reminder, enquiry notice).
 * Pure: no env reads, no SDK, relative imports only, so tests/email-layout.test.mjs renders
 * it directly.
 *
 * Email-client rules (why the markup looks old-fashioned):
 *   - Tables for layout and `bgcolor` attributes: Outlook desktop ignores most CSS.
 *   - Every style inline: Gmail drops <style> rules it cannot scope. The single <style> block
 *     only adds mobile padding, which degrades harmlessly where unsupported.
 *   - Light scheme only (`color-scheme: light`), white card on a warm off-white page. The logo
 *     is an opaque PNG (scripts/build-email-logo.mjs), so a client that forces dark mode still
 *     shows a white chip with the charcoal wordmark rather than charcoal on charcoal.
 *   - Buttons are a bgcolor table cell + link: they render in Outlook (square corners there).
 *   - Long URLs are never printed as text. A secondary hyperlink carries the same destination.
 *
 * Copy rules: every value interpolated into HTML goes through escapeHtml(); no em dashes in
 * any client-facing string (portfolio rule; tested).
 */

import { BUSINESS_PHONE, CONTACT_EMAIL } from "../site.ts";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/* Opaque, trimmed copy of the approved light-background lockup; 531x137 source, shown at 140x36. */
export const EMAIL_LOGO_PATH = "/brand/drylake-email-logo-light.png";
export const EMAIL_LOGO_SIZE = { width: 140, height: 36 } as const;
/* The approved dark-background lockup flattened onto opaque charcoal, for `header: "dark"`.
 * Same trim and size as the light one (scripts/build-email-logo.mjs builds both). */
export const EMAIL_LOGO_DARK_PATH = "/brand/drylake-email-logo-dark.png";

export const EMAIL_WEBSITE = { label: "drylake.com.au", href: "https://drylake.com.au" } as const;

/* Brand tokens (app/globals.css). Contrast on white: INK 19:1, BODY 10:1, MUTED 5.3:1,
 * LINK 5.6:1. The button is INK on SIGNAL (about 6.9:1); white on SIGNAL would be 3:1.
 * CHARCOAL is --color-ink-3, the dark header band and the secondary button; ON_DARK on it is
 * about 15:1. All pairs are asserted in tests/email-design-system.test.mjs. */
export const EMAIL_COLORS = {
  page: "#f4f4f1",
  card: "#ffffff",
  border: "#e6e3da",
  panel: "#f8f7f3",
  ink: "#0b0b0a",
  body: "#3d3c38",
  muted: "#6b6a64",
  signal: "#f26a2e",
  link: "#b83f0c",
  charcoal: "#1a1a17",
  onDark: "#f4f3ee",
} as const;

const C = EMAIL_COLORS;
export const EMAIL_FONT = "Arial,Helvetica,sans-serif";
const FONT = EMAIL_FONT;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const e = escapeHtml;

/* ------------------------------------------------------------------ building blocks
 * Each returns an HTML fragment for the card body. Arguments are plain text unless the
 * parameter name says Html; the block escapes them. */

export function paragraph(text: string, options: { muted?: boolean; small?: boolean } = {}): string {
  const size = options.small ? "13px;line-height:20px" : "15px;line-height:24px";
  const color = options.muted ? C.muted : C.body;

  return `<p style="margin:0 0 14px;font-family:${FONT};font-size:${size};color:${color};">${e(text)}</p>`;
}

/* primary: ink on Drylake orange, the ONE main action. secondary: off-white on charcoal, for a
 * second real action beside it (e.g. Manage Booking under Join Teams Meeting). */
export function button(params: { href: string; label: string; variant?: "primary" | "secondary" }): string {
  const secondary = params.variant === "secondary";
  const bg = secondary ? C.charcoal : C.signal;
  const fg = secondary ? C.onDark : C.ink;
  return `<table role="presentation" class="dl-btn-wrap" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 18px;">
  <tr>
    <td bgcolor="${bg}" style="background-color:${bg};border-radius:10px;">
      <a href="${e(params.href)}" target="_blank" class="dl-btn" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:bold;color:${fg};text-decoration:none;border-radius:10px;">${e(params.label)}</a>
    </td>
  </tr>
</table>`;
}

/* "Button not working? Open your invitation in your browser." The URL stays behind the link
 * text: a ticket URL printed in full dominated the old invitation, worst of all on mobile. */
export function fallbackLink(params: { href: string; linkText: string }): string {
  return `<p style="margin:0 0 14px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">Button not working? <a href="${e(params.href)}" target="_blank" style="color:${C.link};text-decoration:underline;">${e(params.linkText)}</a>.</p>`;
}

export function checklist(params: { title: string; items: readonly string[] }): string {
  const rows = params.items
    .map(
      (item) => `<tr>
        <td width="18" valign="top" style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.signal};">&#9679;</td>
        <td style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.ink};">${e(item)}</td>
      </tr>`
    )
    .join("");

  return panel(
    `<p style="margin:0 0 4px;font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:1.5px;font-weight:bold;text-transform:uppercase;color:${C.muted};">${e(params.title)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>`
  );
}

export type DetailRow = { label: string; value: string; emphasis?: boolean };

/* Label/value table (invoice lines, enquiry fields). An emphasised row is the total line. */
export function detailTable(rows: readonly DetailRow[]): string {
  const body = rows
    .map((row) => {
      const top = row.emphasis ? `border-top:1px solid ${C.border};padding-top:14px;` : "";
      const value = row.emphasis
        ? `color:${C.ink};font-size:18px;font-weight:bold;`
        : `color:${C.ink};font-size:14px;`;

      return `<tr>
        <td valign="top" style="padding:7px 12px 7px 0;${top}font-family:${FONT};font-size:14px;line-height:20px;color:${row.emphasis ? C.ink : C.muted};${row.emphasis ? "font-weight:bold;" : ""}">${e(row.label)}</td>
        <td valign="top" align="right" style="padding:7px 0;${top}font-family:${FONT};line-height:20px;${value}word-break:break-word;">${e(row.value)}</td>
      </tr>`;
    })
    .join("");

  return panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${body}</table>`);
}

/* Preformatted, escaped free text (an enquiry message). Line breaks are kept. */
export function messageBlock(params: { title: string; text: string }): string {
  return panel(
    `<p style="margin:0 0 8px;font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:1.5px;font-weight:bold;text-transform:uppercase;color:${C.muted};">${e(params.title)}</p>
    <p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.ink};white-space:pre-wrap;word-break:break-word;">${e(params.text)}</p>`
  );
}

function panel(innerHtml: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.border};border-radius:12px;margin:4px 0 18px;">
  <tr><td style="padding:14px 18px;">${innerHtml}</td></tr>
</table>`;
}

/* ------------------------------------------------------------------ page shell */

export type EmailLayoutInput = {
  /* <title>, also the subject in most emails. */
  title: string;
  /* Inbox preview text (hidden in the body). */
  preheader: string;
  /* Small orange label above the heading, e.g. "YOU'RE INVITED". */
  eyebrow: string;
  heading: string;
  /* Pre-rendered blocks from the helpers above. */
  bodyHtml: string;
  /* Absolute origin the logo is served from (the app base URL). */
  assetOrigin: string;
  /* Extra footer line, e.g. legal name + ABN on invoices. */
  legalLine?: string;
  /* "light" (default): logo on the white card. "dark": a charcoal band carrying the dark-background
   * lockup over a thin orange rule (consultation emails). The card body is white either way. */
  header?: "light" | "dark";
};

/* The logo row of the card. The dark band sets bgcolor as well as CSS (Outlook desktop) and its
 * logo is opaque charcoal, so a client that forces dark mode has nothing to invert. */
function headerRows(input: EmailLayoutInput): string {
  const dark = input.header === "dark";
  const logo = new URL(dark ? EMAIL_LOGO_DARK_PATH : EMAIL_LOGO_PATH, input.assetOrigin).toString();
  const img = `<a href="${EMAIL_WEBSITE.href}" target="_blank" style="text-decoration:none;"><img src="${e(logo)}" width="${EMAIL_LOGO_SIZE.width}" height="${EMAIL_LOGO_SIZE.height}" alt="Drylake" style="display:block;border:0;outline:none;width:${EMAIL_LOGO_SIZE.width}px;height:${EMAIL_LOGO_SIZE.height}px;"></a>`;

  if (!dark) {
    return `<tr>
                  <td class="dl-pad" style="padding:28px 36px 0;">
                    ${img}
                  </td>
                </tr>`;
  }
  return `<tr>
                  <td class="dl-pad" bgcolor="${C.charcoal}" style="background-color:${C.charcoal};padding:24px 36px;border-radius:15px 15px 0 0;">
                    ${img}
                  </td>
                </tr>
                <tr>
                  <td height="4" bgcolor="${C.signal}" style="background-color:${C.signal};height:4px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
                </tr>`;
}

export function renderEmailLayout(input: EmailLayoutInput): string {

  return `<!doctype html>
<html lang="en-AU" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${e(input.title)}</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    @media only screen and (max-width: 620px) {
      .dl-pad { padding-left: 22px !important; padding-right: 22px !important; }
      .dl-h1 { font-size: 24px !important; line-height: 30px !important; }
      .dl-btn-wrap { width: 100% !important; }
      .dl-btn { display: block !important; text-align: center !important; }
      .dl-row-cell { display: block !important; width: 100% !important; text-align: left !important; padding-right: 0 !important; }
      .dl-row-value { border-top: 0 !important; padding-top: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};" bgcolor="${C.page}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <tr>
            <td bgcolor="${C.card}" style="background-color:${C.card};border:1px solid ${C.border};border-radius:16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${headerRows(input)}
                <tr>
                  <td class="dl-pad" style="padding:${input.header === "dark" ? "28px" : "24px"} 36px 14px;">
                    <p style="margin:0;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.5px;font-weight:bold;text-transform:uppercase;color:${C.link};">${e(input.eyebrow)}</p>
                    <h1 class="dl-h1" style="margin:10px 0 0;font-family:${FONT};font-size:28px;line-height:34px;font-weight:bold;color:${C.ink};">${e(input.heading)}</h1>
                  </td>
                </tr>
                <tr>
                  <td class="dl-pad" style="padding:6px 36px 18px;">
${input.bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="dl-pad" style="padding:20px 36px 0;font-family:${FONT};font-size:12px;line-height:19px;color:${C.muted};">
${footerHtml(input.legalLine)}
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function footerHtml(legalLine: string | undefined): string {
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${C.muted};text-decoration:underline;">${label}</a>`;

  return [
    `<p style="margin:0 0 4px;"><strong style="color:${C.body};">Drylake Pty Ltd</strong> &middot; Perth, Western Australia</p>`,
    `<p style="margin:0 0 4px;">${link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)} &middot; ${link(BUSINESS_PHONE.href, BUSINESS_PHONE.display)} &middot; ${link(EMAIL_WEBSITE.href, EMAIL_WEBSITE.label)}</p>`,
    legalLine ? `<p style="margin:0;">${e(legalLine)}</p>` : "",
  ].join("\n");
}

/* Plain-text footer, matching the HTML one line for line. */
export function textFooter(legalLine?: string): string[] {
  return [
    "Drylake Pty Ltd, Perth, Western Australia",
    `${CONTACT_EMAIL} | ${BUSINESS_PHONE.display} | ${EMAIL_WEBSITE.label}`,
    ...(legalLine ? [legalLine] : []),
  ];
}
