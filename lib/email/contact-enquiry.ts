import "server-only";

import { enquiryFromAddress } from "@/lib/email/contact-enquiry-sender";
import { type ContactEnquiry, renderEnquiryEmail } from "@/lib/email/contact-enquiry-email";
import { getResendClient } from "@/lib/email/resend";
import { appBaseUrl } from "@/lib/invoices/invoice-url";

export type { ContactEnquiry, PortalContext } from "@/lib/email/contact-enquiry-email";

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
 * Throws when the recipient, sender or Resend key is not configured, or Resend rejects.
 */
export async function deliverContactEnquiry(enquiry: ContactEnquiry): Promise<void> {
  const { subject, html, text } = renderEnquiryEmail(enquiry, appBaseUrl(process.env));

  const { error } = await getResendClient().emails.send({
    // Own display name on the shared verified sender: never labelled as billing mail.
    from: enquiryFromAddress({ CONTACT_EMAIL_FROM: process.env.CONTACT_EMAIL_FROM, EMAIL_FROM: process.env.EMAIL_FROM }),
    to: getEnquiryInbox(),
    replyTo: enquiry.email,
    subject,
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
