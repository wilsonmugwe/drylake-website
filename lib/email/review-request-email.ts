/*
 * "How did we do?" review request email, rendered with the shared design system. PURE (no env, no
 * SDK): tests/review-requests.test.mjs renders it and bans incentive and positive-only wording.
 *
 * Rules this copy lives by (tested):
 *   - neutral: it asks for honest feedback, good or bad, never for a good review or a high rating
 *   - no incentive of any kind (discount, gift, entry, free anything)
 *   - identifies the sender (Drylake Pty Ltd, ABN) and carries a working unsubscribe link, the
 *     Spam Act 2003 standard, even though this goes to existing customers
 *   - the optional external platform link is offered as a choice, with "no obligation either way"
 */

import { DRYLAKE_BUSINESS } from "../business.ts";
import { CONTACT_EMAIL } from "../site.ts";
import {
  EMAIL_COLORS,
  EMAIL_FONT,
  type RenderedEmail,
  button,
  escapeHtml,
  fallbackLink,
  paragraph,
  renderEmailLayout,
  textFooter,
} from "./layout.ts";

export type ReviewRequestEmailInput = {
  recipientName: string;
  engagementLabel: string;
  feedbackUrl: string;
  unsubscribeUrl: string;
  /* Present only when REVIEW_PLATFORM_URL is set to a valid https URL. */
  platform: { href: string; host: string } | null;
};

export const REVIEW_EMAIL_SUBJECT = "How did we do?";

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function legalLine(): string {
  return `${DRYLAKE_BUSINESS.legalName}, ABN ${DRYLAKE_BUSINESS.abn}. You are receiving this because you recently worked with Drylake.`;
}

export function renderReviewRequestEmail(input: ReviewRequestEmailInput, assetOrigin: string): RenderedEmail {
  const greeting = `Hello ${firstName(input.recipientName)},`;
  const intro = `Thank you for working with Drylake on ${input.engagementLabel}. We would value your honest feedback about the experience, good or bad. It takes a couple of minutes, and it helps us improve.`;
  const platformLine = input.platform
    ? `If you would rather leave a public review, you can do that on ${input.platform.host}. There is no obligation either way.`
    : null;

  const unsubscribeHtml = `<p style="margin:0 0 14px;font-family:${EMAIL_FONT};font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">Would you rather not receive feedback requests? <a href="${escapeHtml(input.unsubscribeUrl)}" target="_blank" style="color:${EMAIL_COLORS.link};text-decoration:underline;">Unsubscribe</a>.</p>`;

  const bodyHtml = [
    paragraph(greeting),
    paragraph(intro),
    button({ href: input.feedbackUrl, label: "Share your feedback" }),
    fallbackLink({ href: input.feedbackUrl, linkText: "Open the feedback form in your browser" }),
    ...(platformLine && input.platform
      ? [
          paragraph(platformLine),
          `<p style="margin:0 0 14px;font-family:${EMAIL_FONT};font-size:13px;line-height:20px;"><a href="${escapeHtml(input.platform.href)}" target="_blank" style="color:${EMAIL_COLORS.link};text-decoration:underline;">${escapeHtml(input.platform.host)}</a></p>`,
        ]
      : []),
    paragraph(`Questions? Reply to this email or write to ${CONTACT_EMAIL}.`, { muted: true, small: true }),
    unsubscribeHtml,
  ].join("\n");

  const html = renderEmailLayout({
    title: REVIEW_EMAIL_SUBJECT,
    preheader: "We would value your honest feedback.",
    eyebrow: "drylake.com.au",
    heading: REVIEW_EMAIL_SUBJECT,
    assetOrigin,
    bodyHtml,
    legalLine: legalLine(),
  });

  const text = [
    REVIEW_EMAIL_SUBJECT,
    "",
    greeting,
    "",
    intro,
    "",
    `Share your feedback: ${input.feedbackUrl}`,
    ...(platformLine && input.platform ? ["", platformLine, input.platform.href] : []),
    "",
    `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
    "",
    `Unsubscribe from feedback requests: ${input.unsubscribeUrl}`,
    "",
    ...textFooter(legalLine()),
  ].join("\n");

  return { subject: REVIEW_EMAIL_SUBJECT, html, text };
}
