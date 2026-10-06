import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  CircleSlash,
  CloudOff,
  Hourglass,
  PauseCircle,
  ReceiptText,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

import ClientStateCard from "./ClientStateCard";
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
  icon: ReactNode;
  tone: "neutral" | "signal" | "alert";
  back?: { href: string; label: string };
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
 *
 * Rendered inside the portal frame (app/client/layout.tsx), which hides the navigation
 * whenever the workspace is not ready.
 */
const COPY: Record<ClientAccessVariant, Copy> = {
  "no-organisation": {
    code: "Signed in",
    title: "No client workspace on this account.",
    body: "You are signed in, but this account is not a member of a Drylake client workspace. Drylake sends an invitation to your email when a workspace is ready for you: open the link in that email, or sign in with the address it was sent to. If you expected access already, start a conversation and we will sort it out.",
    icon: <UserRound size={20} />,
    tone: "neutral",
  },
  "access-pending": {
    code: "Access pending",
    title: "We are finishing your portal access.",
    body: "Your account is linked to a Drylake client workspace, but its access is not complete yet. Nothing is wrong on your side. Start a conversation if you were expecting to see your projects here.",
    icon: <Hourglass size={20} />,
    tone: "signal",
  },
  "billing-unavailable": {
    code: "Billing",
    title: "Billing is not available.",
    body: "We could not find an active Drylake client workspace for your organisation, so there are no invoices to show. Start a conversation if this looks wrong.",
    icon: <CircleSlash size={20} />,
    tone: "neutral",
    back: { href: "/client", label: "Overview" },
  },
  "invoice-unavailable": {
    code: "Billing",
    title: "Invoice unavailable.",
    body: "This invoice is not available to your organisation. Check the link, or return to billing to see your invoices.",
    icon: <ReceiptText size={20} />,
    tone: "neutral",
    back: { href: "/client/billing", label: "Billing" },
  },
  "client-inactive": {
    code: "Workspace paused",
    title: "Your workspace is paused.",
    body: "Drylake has paused this client workspace, so projects, documents and billing are not available right now. Nothing has been deleted. Start a conversation to resume access.",
    icon: <PauseCircle size={20} />,
    tone: "signal",
  },
  "client-archived": {
    code: "Workspace closed",
    title: "This workspace has been closed.",
    body: "Drylake has archived this client workspace, so it is no longer available in the portal. Start a conversation if you need a copy of your records or believe this is a mistake.",
    icon: <Archive size={20} />,
    tone: "neutral",
  },
  "lookup-failed": {
    code: "Temporarily unavailable",
    title: "We could not open your workspace.",
    body: "Something went wrong while checking your access. Please reload the page in a moment. If it keeps happening, start a conversation.",
    icon: <CloudOff size={20} />,
    tone: "alert",
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
    <ClientStateCard
      icon={copy.icon}
      eyebrow={copy.code}
      title={copy.title}
      tone={copy.tone}
      actions={
        <>
          <MessageDrylake variant="cta" organizationName={organizationName} />

          {copy.back ? (
            <Link href={copy.back.href} className="cp-button-secondary min-h-12 sm:min-w-[160px]">
              <ArrowLeft aria-hidden="true" size={15} />
              {copy.back.label}
            </Link>
          ) : (
            <Link href="/" className="cp-button-secondary min-h-12 sm:min-w-[160px]">
              Back to drylake.com.au
            </Link>
          )}
        </>
      }
    >
      <p>{copy.body}</p>
      <p className="text-neutral-500">
        We reply within {RESPONSE_TIME}. You can also reach us at{" "}
        <span className="font-medium text-neutral-800">{CONTACT_EMAIL}</span>.
      </p>
    </ClientStateCard>
  );
}
