/*
 * Website / portal enquiry notification, rendered with the shared design system. Pure (no env,
 * no SDK) so tests/email-design-system.test.mjs renders it; lib/email/contact-enquiry.ts sends it.
 *
 * Audience: Drylake's own inbox, not the enquirer. It is still branded so the team sees the same
 * system clients do, and Reply goes straight to the enquirer (replyTo is set by the sender).
 * The enquirer's details appear only in the email itself; they are never logged.
 */

import { type DetailRow, type RenderedEmail, detailTable, messageBlock, paragraph, renderEmailLayout } from "./layout.ts";

export interface ContactEnquiry {
  name: string;
  email: string;
  company: string;
  projectType: string;
  /* "What kind of help are you looking for?" (was sent as `budget`; it never held money). */
  helpType: string;
  message: string;
  receivedAt: string;
  /* Set only by the AI assistant's escalation form (source tag "assistant"). */
  phone?: string;
  source?: "" | "assistant";
  wantsHuman?: boolean;
  /* Present only when sent by a signed-in user; values are server-verified. */
  portal?: PortalContext | null;
}

export interface PortalContext {
  accountEmail: string | null;
  workspaceName: string | null;
  workspaceState: string;
}

export function enquiryRows(enquiry: ContactEnquiry): DetailRow[] {
  const rows: Array<[string, string]> = [
    ["Name", enquiry.name],
    ["Email", enquiry.email],
    ["Company", enquiry.company || "Not provided"],
    ["Topic", enquiry.projectType || "Not provided"],
    ["Help wanted", enquiry.helpType || "Not provided"],
    ...(enquiry.phone ? ([["Phone", enquiry.phone]] as Array<[string, string]>) : []),
    ["Received", enquiry.receivedAt],
    ...(enquiry.source === "assistant"
      ? ([["Source", enquiry.wantsHuman ? "AI assistant: asked to speak to a person" : "AI assistant: enquiry"]] as Array<[string, string]>)
      : []),
    ...(enquiry.portal
      ? ([
          ["Source", "Signed-in Drylake account"],
          ["Verified account", enquiry.portal.accountEmail || "Unknown"],
          ["Verified workspace", enquiry.portal.workspaceName || `None (${enquiry.portal.workspaceState})`],
        ] as Array<[string, string]>)
      : []),
  ];

  return rows.map(([label, value]) => ({ label, value }));
}

export function renderEnquiryEmail(enquiry: ContactEnquiry, assetOrigin: string): RenderedEmail {
  const isClient = Boolean(enquiry.portal);
  const heading = isClient ? "New client message" : "New website enquiry";
  const subject = `${isClient ? "Client message" : "New website enquiry"}: ${enquiry.name}${
    enquiry.company ? ` (${enquiry.company})` : ""
  }`;
  const rows = enquiryRows(enquiry);

  const html = renderEmailLayout({
    title: subject,
    preheader: `${heading} from ${enquiry.name}.`,
    eyebrow: isClient ? "Drylake Workspace" : "drylake.com.au",
    heading,
    assetOrigin,
    bodyHtml: [
      detailTable(rows),
      messageBlock({ title: "Message", text: enquiry.message }),
      paragraph("Reply to this email to answer the sender directly.", { muted: true, small: true }),
    ].join("\n"),
  });

  const text = [heading, "", ...rows.map((row) => `${row.label}: ${row.value}`), "", "Message:", enquiry.message].join("\n");

  return { subject, html, text };
}
