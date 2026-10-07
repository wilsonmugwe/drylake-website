import ClerkScope from "@/components/auth/ClerkScope";

/* Clerk for the portal router and invitation acceptance (ClientInvitationCompleter). */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}
