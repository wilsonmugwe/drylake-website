/*
 * Building blocks for appointment emails (consultations), on top of lib/email/layout.ts.
 * PURE: no env, no SDK. Every argument is plain text and is escaped here with the layout's
 * escapeHtml, so nothing in this file renders an unescaped value.
 *
 * Email-client rules are the layout's (tables, inline styles, bgcolor for Outlook). These blocks
 * add the visual hierarchy an appointment needs: the date and time are the largest thing in the
 * body, then the facts, then the actions, then the policy.
 */

import { EMAIL_COLORS, EMAIL_FONT, type DetailRow, escapeHtml } from "./layout.ts";

const C = EMAIL_COLORS;
const FONT = EMAIL_FONT;
const e = escapeHtml;

const label = (text: string, color: string = C.muted) =>
  `<p style="margin:0 0 6px;font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:1.5px;font-weight:bold;text-transform:uppercase;color:${color};">${e(text)}</p>`;

export type AppointmentCardInput = {
  /* "Your appointment", "Cancelled appointment", "New time" ... (uppercased by CSS only). */
  title: string;
  date: string;
  time: string;
  zone: string;
  rows: readonly DetailRow[];
  /* A cancelled or superseded time: shown struck through and muted, never as an active booking. */
  inactive?: boolean;
};

/*
 * The appointment at a glance: date in 20px bold, time with its zone, then label/value rows
 * divided by hairlines. A 4px charcoal top rule (orange where active) makes it the anchor of
 * the email. The rows stack label-over-value on phones (.dl-row-cell), so a long value such as
 * "Microsoft Teams video call" never squeezes against its label at 320px.
 */
export function appointmentCard(input: AppointmentCardInput): string {
  const accent = input.inactive ? C.muted : C.signal;
  const dateColor = input.inactive ? C.muted : C.ink;
  const strike = input.inactive ? "text-decoration:line-through;" : "";
  const rows = input.rows
    .map(
      (row) => `<tr>
        <td class="dl-row-cell" valign="top" style="padding:10px 12px 10px 0;border-top:1px solid ${C.border};font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${e(row.label)}</td>
        <td class="dl-row-cell dl-row-value" valign="top" align="right" style="padding:10px 0;border-top:1px solid ${C.border};font-family:${FONT};font-size:14px;line-height:20px;font-weight:bold;color:${C.ink};word-break:break-word;">${e(row.value)}</td>
      </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.card}" style="background-color:${C.card};border:1px solid ${C.border};border-top:4px solid ${accent};border-radius:12px;margin:6px 0 22px;">
  <tr>
    <td style="padding:20px 22px 8px;">
      ${label(input.title, input.inactive ? C.muted : C.link)}
      <p style="margin:0;font-family:${FONT};font-size:20px;line-height:28px;font-weight:bold;color:${dateColor};${strike}">${e(input.date)}</p>
      <p style="margin:2px 0 0;font-family:${FONT};font-size:16px;line-height:24px;color:${dateColor};${strike}">${e(input.time)}</p>
      <p style="margin:2px 0 6px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${e(input.zone)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 22px 10px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>
    </td>
  </tr>
</table>`;
}

/*
 * A titled note with a 3px rule on its left: orange for something the reader should act on
 * (how to join, what to do if a link is missing), charcoal for information (policy, reason).
 */
export function notice(params: { title: string; text: string; tone?: "action" | "info" }): string {
  const rule = params.tone === "action" ? C.signal : C.charcoal;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.panel}" style="background-color:${C.panel};border-left:3px solid ${rule};border-radius:0 10px 10px 0;margin:4px 0 18px;">
  <tr><td style="padding:14px 18px;">
    ${label(params.title, C.ink)}
    <p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.body};white-space:pre-wrap;word-break:break-word;">${e(params.text)}</p>
  </td></tr>
</table>`;
}

/* A small uppercase heading between sections ("Your details", "About their business"). */
export function sectionLabel(text: string): string {
  return `<div style="margin:10px 0 0;">${label(text)}</div>`;
}

/* ------------------------------------------------------------------ plain text */

/* "APPOINTMENT" then one "Label: value" line per row: the text part keeps the HTML's order. */
export function textSection(title: string, lines: readonly string[]): string[] {
  return lines.length === 0 ? [] : [title.toUpperCase(), ...lines, ""];
}

export function textRows(rows: readonly DetailRow[]): string[] {
  return rows.map((row) => `${row.label}: ${row.value}`);
}
