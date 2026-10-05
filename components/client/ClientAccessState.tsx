import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

import ClientShell from "./ClientShell";

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
 * Copy never reveals why a record is missing (other tenant, hidden, draft or nonexistent):
 * the invoice state reads the same in every case, matching the loader's behaviour.
 */
const COPY: Record<ClientAccessVariant, Copy> = {
  "no-organisation": {
    code: "Account active",
    title: "Your workspace is being set up.",
    body: "You are signed in, but your account does not have access to a client workspace yet. Drylake sends an invitation to your email when your workspace is ready: open the link in that email and sign in with the same address. If you expected access already, email us and we will sort it out.",
    showNav: false,
  },
  "access-pending": {
    code: "Access pending",
    title: "Portal access pending.",
    body: "Your organisation was recognised, but there is no active Drylake client workspace for it yet. Email us if you were expecting to see your projects here.",
    showNav: false,
  },
  "billing-unavailable": {
    code: "Billing",
    title: "Billing is not available.",
    body: "We could not find an active Drylake client workspace for your organisation, so there are no invoices to show. Email us if this looks wrong.",
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
    body: "Drylake has paused this client workspace, so projects, documents and billing are not available right now. Nothing has been deleted. Email us to resume access.",
    showNav: false,
  },
  "client-archived": {
    code: "Workspace closed",
    title: "This workspace has been closed.",
    body: "Drylake has archived this client workspace, so it is no longer available in the portal. Email us if you need a copy of your records or believe this is a mistake.",
    showNav: false,
  },
  "lookup-failed": {
    code: "Temporarily unavailable",
    title: "We could not open your workspace.",
    body: "Something went wrong while checking your access. Please reload the page in a moment. If it keeps happening, email us.",
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
          We reply within {RESPONSE_TIME}.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="button-light group flex min-h-[50px] items-center justify-between gap-4 bg-white px-5 text-sm font-semibold sm:w-fit sm:min-w-[240px] sm:px-6"
          >
            <span>Email {CONTACT_EMAIL}</span>
            <ArrowUpRight
              aria-hidden="true"
              size={16}
              className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>

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
