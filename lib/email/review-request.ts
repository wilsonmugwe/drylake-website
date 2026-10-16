import "server-only";

import {
  type ReviewRequestEmailInput,
  renderReviewRequestEmail,
} from "@/lib/email/review-request-email";
import { feedbackFromAddress } from "@/lib/email/review-request-sender";
import { getResendClient } from "@/lib/email/resend";
import { appBaseUrl } from "@/lib/invoices/invoice-url";
import { reviewPlatformUrl } from "@/lib/reviews/testimonials";
import { feedbackUrl, unsubscribeApiUrl, unsubscribePageUrl } from "@/lib/reviews/tokens";
import { redactSensitive } from "@/lib/security/redact";
import { CONTACT_EMAIL } from "@/lib/site";

/*
 * Sends one review request. Contract: resolves only when Resend accepted the message; throws
 * otherwise with provider text redacted (it can echo the recipient). The raw tokens exist only in
 * the arguments of this call and in the email: the database keeps their hashes.
 *
 * List-Unsubscribe (RFC 2369) with the one-click POST form (RFC 8058) is set in addition to the
 * visible link, so mail clients can offer their own unsubscribe button.
 */
export async function sendReviewRequest(params: {
  to: string;
  recipientName: string;
  engagementLabel: string;
  token: string;
  unsubscribeToken: string;
}): Promise<void> {
  const origin = appBaseUrl(process.env);
  const input: ReviewRequestEmailInput = {
    recipientName: params.recipientName,
    engagementLabel: params.engagementLabel,
    feedbackUrl: feedbackUrl(origin, params.token),
    unsubscribeUrl: unsubscribePageUrl(origin, params.unsubscribeToken),
    platform: reviewPlatformUrl(process.env.REVIEW_PLATFORM_URL),
  };
  const { subject, html, text } = renderReviewRequestEmail(input, origin);

  const { error } = await getResendClient().emails.send({
    from: feedbackFromAddress({ FEEDBACK_EMAIL_FROM: process.env.FEEDBACK_EMAIL_FROM, EMAIL_FROM: process.env.EMAIL_FROM }),
    to: params.to,
    replyTo: CONTACT_EMAIL,
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeApiUrl(origin, params.unsubscribeToken)}>, <mailto:${CONTACT_EMAIL}?subject=Unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) throw new Error(`Review request failed: ${error.name}: ${redactSensitive(error.message)}`);
}
