import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

import ClientShell from "./ClientShell";
import MessageDrylake from "./MessageDrylake";

export type ClientAccessVariant =
  | "no-organisation"
  | "access-pending"
  | "billing-unavailable"
  | "invoice-unavailable"
  | "client-inactive"
  | "client-archived"
  | "lookup-failed";

type Copy = {
  code: string;
  title: string;
  body: string;
  back?: { href: string; label: string };
  showNav: boolean;
};

/*
 * Access states only. A ready workspace with no projects, invoices, documents or updates
 * never renders here; those are empty states inside the normal portal.
 *
 * Copy never reveals why a record is missing (other tenant, hidden, draft or nonexistent):
 * the invoice state reads the same in every case, matching the loader's behaviour.
 *
 * The primary action is the native "Start a conversation" form (MessageDrylake), never a
 * mailto: link. The address is shown as plain text for anyone who prefers email.
 */
const COPY: Record<ClientAccessVariant, Copy> = {
  "no-organisation": {
    code: "Signed in",
    title: "No client workspace on this account.",
    body: "You are signed in, but this account is not a member of a Drylake client workspace. Drylake sends an invitation to your email when a workspace is ready for you: open the link in that email, or sign in with the address it was sent to. If you expected access already, start a conversation and we will sort it out.",
    showNav: false,
  },
  "access-pending": {
    code: "Access pending",
    title: "We are finishing your portal access.",
    body: "Your account is linked to a Drylake client workspace, but its access is not complete yet. Nothing is wrong on your side. Start a conversation if you were expecting to see your projects here.",
    showNav: false,
  },
  "billing-unavailable": {
    code: "Billing",
    title: "Billing is not available.",
    body: "We could not find an active Drylake client workspace for your organisation, so there are no invoices to show. Start a conversation if this looks wrong.",
    back: { href: "/client", label: "Overview" },
    showNav: false,
  },
  "invoice-unavailable": {
    code: "Billing",
    title: "Invoice unavailable.",
    body: "This invoice is not available to your organisation. Check the link, or return to billing to see your invoices.",
    back: { href: "/client/billing", label: "Billing" },
    showNav: true,
  },
  "client-inactive": {
    code: "Workspace paused",
    title: "Your workspace is paused.",
    body: "Drylake has paused this client workspace, so projects, documents and billing are not available right now. Nothing has been deleted. Start a conversation to resume access.",
    showNav: false,
  },
  "client-archived": {
    code: "Workspace closed",
    title: "This workspace has been closed.",
    body: "Drylake has archived this client workspace, so it is no longer available in the portal. Start a conversation if you need a copy of your records or believe this is a mistake.",
    showNav: false,
  },
  "lookup-failed": {
    code: "Temporarily unavailable",
    title: "We could not open your workspace.",
    body: "Something went wrong while checking your access. Please reload the page in a moment. If it keeps happening, start a conversation.",
    showNav: false,
  },
};

export default function ClientAccessState({
  variant,
  organizationName,
}: {
  variant: ClientAccessVariant;
  organizationName?: string | null;
}) {
  const copy = COPY[variant];

  return (
    <ClientShell
      organizationName={organizationName}
      showNav={copy.showNav}
      section="billing"
    >
      <div className="flex min-h-[60svh] flex-col justify-center py-14 sm:py-20">
        <div className="section-label flex items-center gap-3 text-white/55">
          <span
            aria-hidden="true"
            className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]"
          />
          {copy.code}
        </div>

        <h1 className="mt-5 max-w-[16ch] text-[clamp(2.6rem,10vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
          {copy.title}
        </h1>

        <p className="mt-6 max-w-[36rem] text-[0.95rem] leading-7 text-white/60">
          {copy.body}
        </p>

        <p className="mt-3 max-w-[36rem] text-sm leading-6 text-white/55">
          We reply within {RESPONSE_TIME}. You can also reach us at {CONTACT_EMAIL}.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
          <MessageDrylake variant="cta" organizationName={organizationName} />

          {copy.back ? (
            <Link href={copy.back.href} className="cp-button-outline sm:min-w-[180px]">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft aria-hidden="true" size={15} />
                {copy.back.label}
              </span>
            </Link>
          ) : (
            <Link href="/" className="cp-button-outline sm:min-w-[180px]">
              <span>Back to drylake.com.au</span>
            </Link>
          )}
        </div>
      </div>
    </ClientShell>
  );
}
