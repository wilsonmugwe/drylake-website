/*
 * Collaboration proposal emails, rendered with the shared design system. PURE (no env, no SDK):
 * tests/collaboration.test.mjs renders both; lib/email/collaboration.ts sends them.
 *
 *   renderProposalNotification  -> Drylake's own inbox. Reply goes straight to the submitter.
 *   renderProposalAcknowledgement -> the submitter. States plainly that it is not a partnership.
 *
 * The submitter's details appear only in the email itself; they are never logged.
 */

import { ACK_COPY } from "../collaboration/copy.ts";
import { CATEGORY_LABELS } from "../collaboration/catalog.ts";
import { PROJECT_LABELS } from "../collaboration/admin-labels.ts";
import { CONTACT_EMAIL } from "../site.ts";
import { type DetailRow, type RenderedEmail, detailTable, messageBlock, paragraph, renderEmailLayout, textFooter } from "./layout.ts";

export type ProposalEmailInput = {
  id: string;
  name: string;
  organisation: string;
  email: string;
  category: string;
  project: string;
  summary: string;
  website: string | null;
  receivedAt: string;
};

export function proposalRows(proposal: ProposalEmailInput): DetailRow[] {
  return [
    { label: "Name", value: proposal.name },
    { label: "Organisation", value: proposal.organisation },
    { label: "Email", value: proposal.email },
    { label: "Category", value: CATEGORY_LABELS[proposal.category] ?? proposal.category },
    { label: "Project of interest", value: PROJECT_LABELS[proposal.project] ?? proposal.project },
    { label: "Website", value: proposal.website ?? "Not provided" },
    { label: "Received", value: proposal.receivedAt },
  ];
}

export function renderProposalNotification(proposal: ProposalEmailInput, assetOrigin: string): RenderedEmail {
  const heading = "New collaboration proposal";
  const subject = `Collaboration proposal: ${proposal.organisation} (${CATEGORY_LABELS[proposal.category] ?? proposal.category})`;
  const rows = proposalRows(proposal);
  const adminUrl = `${assetOrigin}/admin/collaborations/${proposal.id}`;

  const html = renderEmailLayout({
    title: subject,
    preheader: `${heading} from ${proposal.name}, ${proposal.organisation}.`,
    eyebrow: "Drylake Partnerships",
    heading,
    assetOrigin,
    bodyHtml: [
      detailTable(rows),
      messageBlock({ title: "Proposal", text: proposal.summary }),
      paragraph(`Review it in admin: ${adminUrl}`, { muted: true, small: true }),
      paragraph("Reply to this email to answer the sender directly.", { muted: true, small: true }),
    ].join("\n"),
  });

  const text = [
    heading,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    "Proposal:",
    proposal.summary,
    "",
    `Review it in admin: ${adminUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function renderProposalAcknowledgement(proposal: ProposalEmailInput, assetOrigin: string): RenderedEmail {
  const subject = ACK_COPY.subject;

  const html = renderEmailLayout({
    title: subject,
    preheader: ACK_COPY.heading,
    eyebrow: "drylake.com.au",
    heading: ACK_COPY.heading,
    assetOrigin,
    bodyHtml: [
      paragraph(`Hello ${proposal.name},`),
      paragraph(ACK_COPY.body),
      paragraph(ACK_COPY.notPartnership),
      paragraph(ACK_COPY.noReply, { muted: true, small: true }),
      paragraph(`Questions? Reply to this email or write to ${CONTACT_EMAIL}.`, { muted: true, small: true }),
    ].join("\n"),
  });

  const text = [
    ACK_COPY.heading,
    "",
    `Hello ${proposal.name},`,
    "",
    ACK_COPY.body,
    "",
    ACK_COPY.notPartnership,
    "",
    ACK_COPY.noReply,
    "",
    `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
    "",
    ...textFooter(),
  ].join("\n");

  return { subject, html, text };
}
