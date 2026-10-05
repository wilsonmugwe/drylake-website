import { redirect } from "next/navigation";

import { invitationLandingTarget } from "@/lib/clients/invitations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accept Invitation",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/*
 * Landing URL for Clerk client-portal invitations (the invitation's redirectUrl).
 *
 * Public on purpose (exempted in proxy.ts): the invitee is usually signed out. Clerk
 * appends __clerk_ticket and __clerk_status; we forward them to <SignUp> or <SignIn>,
 * which redeem the ticket and add the organisation membership. Afterwards both screens
 * land on /portal, which routes to /client, which activates the new workspace.
 * This page grants nothing itself.
 */
export default async function AcceptInvitationPage({ searchParams }: Props) {
  const params = await searchParams;

  redirect(
    invitationLandingTarget({
      ticket: first(params.__clerk_ticket),
      status: first(params.__clerk_status),
    })
  );
}
