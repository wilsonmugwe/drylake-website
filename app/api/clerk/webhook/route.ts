import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { type NextRequest, NextResponse } from "next/server";

import { CLIENT_INVITATION_EXPIRY_DAYS } from "@/lib/clients/invitations";
import {
  buildInvitationEmail,
  clerkFrontendApiHost,
  type ContactRow,
  emailEventDecision,
  readClerkEmailEvent,
  safeEmailEventShape,
} from "@/lib/email/client-invitation-email";
import { senderAddress } from "@/lib/email/contact-enquiry-sender";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend";
import { appBaseUrl } from "@/lib/invoices/invoice-url";
import { CONTACT_EMAIL } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Clerk webhook: delivers the branded client-workspace invitation email.
 *
 * Setup (Clerk Dashboard, production instance): add an endpoint for
 * https://drylake.com.au/api/clerk/webhook subscribed to `email.created`, put its signing
 * secret in CLERK_WEBHOOK_SIGNING_SECRET, THEN switch "Delivered by Clerk" off for the
 * "Organization invitation" email template. In that order: until the toggle is off, Clerk
 * keeps sending its own email and this route ignores the event (delivered_by_clerk: true),
 * so a client never receives two invitations.
 *
 * Response policy (Clerk retries non-2xx with backoff via Svix):
 *   2xx  sent, or not ours (another template, or Clerk delivered it).
 *   400  bad or missing signature.
 *   500  missing secret or a transient send failure: retried. Resend's idempotency key
 *        (the Clerk email id) stops a retry from sending a second copy.
 * Never log the payload, the recipient address or the accept link: ids and codes only.
 */

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

/* Best-effort personalisation; a lookup failure only costs the greeting, never the email. */
async function contactsFor(email: string): Promise<ContactRow[]> {
  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("organizations")
      .select("name, billing_contact_name")
      .eq("billing_email", email)
      .limit(5);

    if (error) {
      console.error("Invitation personalisation lookup failed:", { code: error.code });
      return [];
    }

    return (data ?? []) as ContactRow[];
  } catch (error) {
    console.error("Invitation personalisation lookup failed:", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return [];
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET");
    return json({ error: "Webhook not configured" }, 500);
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    event = await verifyWebhook(request);
  } catch {
    return json({ error: "Invalid signature" }, 400);
  }

  // Svix delivery id: lets a log line be matched to the attempt in Clerk's webhook log.
  const deliveryId = request.headers.get("svix-id");

  if (event.type !== "email.created") {
    console.info("Clerk webhook skipped.", { deliveryId, eventType: event.type, reason: "not_email_created" });
    return json({ received: true, handled: false, reason: "not_email_created" });
  }

  const email = readClerkEmailEvent(event.data);
  const decision = emailEventDecision(email);
  const shape = safeEmailEventShape(event.data);

  if (!decision.handle || !email?.toEmailAddress) {
    const reason = decision.handle ? "no_recipient" : decision.reason;

    // Names and flags only (safeEmailEventShape): never the address, link, ticket or body.
    console.info("Clerk webhook skipped.", {
      deliveryId,
      eventType: event.type,
      reason,
      clerkEmailId: email?.id ?? null,
      ...shape,
    });

    return json({ received: true, handled: false, reason });
  }

  const plan = buildInvitationEmail({
    event: email,
    contacts: await contactsFor(email.toEmailAddress),
    appBaseUrl: appBaseUrl(process.env),
    clerkHost: clerkFrontendApiHost(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    defaultExpiryDays: CLIENT_INVITATION_EXPIRY_DAYS,
    year: new Date().getFullYear(),
  });

  if (plan.kind === "undeliverable") {
    // Retrying cannot fix a payload with no link; the admin can resend from the client page.
    console.error("CRITICAL: client invitation email could not be built.", {
      deliveryId,
      clerkEmailId: email.id,
      reason: plan.reason,
      ...shape,
    });
    return json({ received: true, handled: false, reason: "undeliverable" });
  }

  if (plan.kind === "clerk-original") {
    console.error("Client invitation sent with Clerk's original body: accept link not trusted.", {
      clerkEmailId: email.id,
    });
  }

  try {
    const fromAddress = senderAddress(getEmailFromAddress());
    const { error } = await getResendClient().emails.send(
      {
        from: fromAddress ? `Drylake <${fromAddress}>` : getEmailFromAddress(),
        to: [email.toEmailAddress],
        // The sender address has no mailbox; replies go to the monitored inbox.
        replyTo: CONTACT_EMAIL,
        subject: plan.email.subject,
        html: plan.email.html,
        ...(plan.email.text ? { text: plan.email.text } : {}),
      },
      { idempotencyKey: `clerk-email/${email.id}` }
    );

    if (error) {
      console.error("Client invitation email rejected by Resend:", {
        clerkEmailId: email.id,
        name: error.name,
      });
      return json({ error: "Send failed" }, 500);
    }
  } catch (error) {
    console.error("Client invitation email send failed:", {
      clerkEmailId: email.id,
      name: error instanceof Error ? error.name : "Unknown",
    });
    return json({ error: "Send failed" }, 500);
  }

  console.info("Client invitation email sent.", { clerkEmailId: email.id, kind: plan.kind });

  return json({ received: true, handled: true });
}
