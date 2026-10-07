"use client";

import { useAuth } from "@clerk/nextjs";

import SiteLink from "@/components/navigation/SiteLink";
import { CLIENT_LOGIN, PORTAL_PATH } from "@/lib/navigation/site-nav";

/*
 * The existing-client utility link. Always rendered as Client Login (so the header never
 * shifts while Clerk loads), and switched to Client Portal once Clerk confirms a session.
 * Clerk's <Show> rendered nothing until it loaded, which made the header jump.
 */
export default function ClientAccessLink({
  className,
  onNavigate,
  children,
}: {
  className?: string;
  onNavigate?: () => void;
  children?: (label: string) => React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = isLoaded && isSignedIn;
  const label = signedIn ? "Client Portal" : CLIENT_LOGIN.label;

  return (
    <SiteLink href={signedIn ? PORTAL_PATH : CLIENT_LOGIN.href} onNavigate={onNavigate} className={className}>
      {children ? children(label) : label}
    </SiteLink>
  );
}
