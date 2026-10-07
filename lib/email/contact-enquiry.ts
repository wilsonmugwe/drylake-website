import "server-only";

import { enquiryFromAddress } from "@/lib/email/contact-enquiry-sender";
import { getResendClient } from "@/lib/email/resend";

export interface ContactEnquiry {
  name: string;
  email: string;
  company: string;
  projectType: string;
  /* "What kind of help are you looking for?" (was sent as `budget`; it never held money). */
  helpType: string;
  message: string;
  receivedAt: string;
  /* Present only when sent by a signed-in user; values are server-verified. */
  portal?: PortalContext | null;
}

export interface PortalContext {
  accountEmail: string | null;
  workspaceName: string | null;
  workspaceState: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getEnquiryInbox() {
  const to = process.env.CONTACT_TO_EMAIL;

  if (!to) {
    throw new Error("Missing CONTACT_TO_EMAIL");
  }

  return to;
}

/*
 * Delivers a website enquiry to the Drylake inbox.
 * Contract: resolves only when the email provider accepted the message; throws otherwise,
 * so the route never tells a visitor "received" for an enquiry that went nowhere.
 * The enquiry is never logged (it contains personal information).
 */
export async function deliverContactEnquiry(enquiry: ContactEnquiry) {
  const rows: Array<[string, string]> = [
    ["Name", enquiry.name],
    ["Email", enquiry.email],
    ["Company", enquiry.company || "Not provided"],
    ["Topic", enquiry.projectType || "Not provided"],
    ["Help wanted", enquiry.helpType || "Not provided"],
    ["Received", enquiry.receivedAt],
    ...(enquiry.portal
      ? ([
          ["Source", "Signed-in Drylake account"],
          ["Verified account", enquiry.portal.accountEmail || "Unknown"],
          [
            "Verified workspace",
            enquiry.portal.workspaceName || `None (${enquiry.portal.workspaceState})`,
          ],
        ] as Array<[string, string]>)
      : []),
  ];

  const html = `
    <h2>${enquiry.portal ? "New client message" : "New website enquiry"}</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`
        )
        .join("")}
    </table>
    <h3>Message</h3>
    <p style="white-space:pre-wrap">${escapeHtml(enquiry.message)}</p>
  `;

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Message:",
    enquiry.message,
  ].join("\n");

  const { error } = await getResendClient().emails.send({
    // Own display name on the shared verified sender: never labelled as billing mail.
    from: enquiryFromAddress({ CONTACT_EMAIL_FROM: process.env.CONTACT_EMAIL_FROM, EMAIL_FROM: process.env.EMAIL_FROM }),
    to: getEnquiryInbox(),
    replyTo: enquiry.email,
    subject: `${enquiry.portal ? "Client message" : "New website enquiry"}: ${enquiry.name}${
      enquiry.company ? ` (${enquiry.company})` : ""
    }`,
    html,
    text,
  });

  if (error) {
    // Resend's name + message describe OUR configuration (e.g. "validation_error: The
    // drylake.com.au domain is not verified"), never the enquirer's details, so they are
    // safe to log and are what an operator needs to fix delivery.
    throw new Error(`Enquiry delivery failed: ${error.name}: ${error.message}`);
  }
}
