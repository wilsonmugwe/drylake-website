import "server-only";

import { collaborationFromAddress } from "@/lib/email/collaboration-sender";
import {
  type ProposalEmailInput,
  renderProposalAcknowledgement,
  renderProposalNotification,
} from "@/lib/email/collaboration-email";
import { getResendClient } from "@/lib/email/resend";
import { appBaseUrl } from "@/lib/invoices/invoice-url";
import { redactSensitive } from "@/lib/security/redact";
import { CONTACT_EMAIL } from "@/lib/site";

export type { ProposalEmailInput } from "@/lib/email/collaboration-email";

function from(): string {
  return collaborationFromAddress({
    COLLABORATION_EMAIL_FROM: process.env.COLLABORATION_EMAIL_FROM,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });
}

/*
 * Notifies the Drylake inbox (CONTACT_TO_EMAIL) of a new proposal. Reply goes to the submitter.
 * Contract: resolves when Resend accepted the message; throws otherwise (message redacted).
 */
export async function notifyProposal(proposal: ProposalEmailInput): Promise<void> {
  const to = process.env.CONTACT_TO_EMAIL;
  if (!to) throw new Error("Missing CONTACT_TO_EMAIL");

  const { subject, html, text } = renderProposalNotification(proposal, appBaseUrl(process.env));
  const { error } = await getResendClient().emails.send({
    from: from(),
    to,
    replyTo: proposal.email,
    subject,
    html,
    text,
  });

  if (error) throw new Error(`Proposal notification failed: ${error.name}: ${redactSensitive(error.message)}`);
}

/* Acknowledges the submitter. Replies go to the existing monitored inbox, not a new mailbox. */
export async function acknowledgeProposal(proposal: ProposalEmailInput): Promise<void> {
  const { subject, html, text } = renderProposalAcknowledgement(proposal, appBaseUrl(process.env));
  const { error } = await getResendClient().emails.send({
    from: from(),
    to: proposal.email,
    replyTo: CONTACT_EMAIL,
    subject,
    html,
    text,
  });

  if (error) throw new Error(`Proposal acknowledgement failed: ${error.name}: ${redactSensitive(error.message)}`);
}
