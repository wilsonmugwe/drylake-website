"use client";

import SiteLink from "@/components/navigation/SiteLink";
import { CLIENT_LOGIN } from "@/lib/navigation/site-nav";

/*
 * The existing-client utility link. A plain link with no Clerk hook: public pages carry no
 * Clerk client code (components/auth/ClerkScope.tsx). It points at /portal, which is right
 * whether or not the visitor is signed in: proxy.ts sends a signed-out request to
 * /sign-in?redirect_url=/portal, and /portal routes a signed-in one to /admin or /client.
 * The label stays Client Login in both states, so the header never shifts.
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
  return (
    <SiteLink href={CLIENT_LOGIN.href} onNavigate={onNavigate} className={className}>
      {children ? children(CLIENT_LOGIN.label) : CLIENT_LOGIN.label}
    </SiteLink>
  );
}
