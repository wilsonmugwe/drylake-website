"use client";

import { CLIENT_LOGIN } from "@/lib/navigation/site-nav";

/*
 * The existing-client utility link. A plain link with no Clerk hook: public pages carry no
 * Clerk client code (components/auth/ClerkScope.tsx). It points at /portal, which is right
 * whether or not the visitor is signed in: proxy.ts sends a signed-out request to
 * /sign-in?redirect_url=/portal, and /portal routes a signed-in one to /admin or /client.
 * The label stays Client Login in both states, so the header never shifts.
 *
 * Deliberately a DOCUMENT navigation (<a>), not next/link (PR 5, 2026-10-07). Public pages no
 * longer run Clerk's browser SDK, so nothing refreshes the 60 s Clerk session token while a
 * signed-in client reads the marketing site. A next/link click sends an RSC fetch
 * (sec-fetch-dest: empty), which Clerk's middleware may not handshake: an expired token there
 * reads as signed out and proxy.ts bounces to /sign-in, which then downloads Clerk JS, refreshes
 * the session and navigates back to /portal (/portal -> /sign-in -> /portal -> /client).
 * A document request lets clerkMiddleware refresh the token with one handshake redirect and
 * land on /portal directly. Measured on production: see docs/performance/2026-10-07-auth-navigation.md.
 * It also stops every public page from prefetching /portal through the proxy.
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
    <a href={CLIENT_LOGIN.href} onClick={() => onNavigate?.()} className={className}>
      {children ? children(CLIENT_LOGIN.label) : CLIENT_LOGIN.label}
    </a>
  );
}
