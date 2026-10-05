import "server-only";

import { getEmailFromAddress, getResendClient } from "@/lib/email/resend";

export interface ContactEnquiry {
  name: string;
  email: string;
  company: string;
  projectType: string;
  budget: string;
  message: string;
  receivedAt: string;
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
    ["Project type", enquiry.projectType || "Not provided"],
    ["Budget", enquiry.budget || "Not provided"],
    ["Received", enquiry.receivedAt],
  ];

  const html = `
    <h2>New website enquiry</h2>
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
    from: getEmailFromAddress(),
    to: getEnquiryInbox(),
    replyTo: enquiry.email,
    subject: `Website enquiry: ${enquiry.name}${enquiry.company ? ` (${enquiry.company})` : ""}`,
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
