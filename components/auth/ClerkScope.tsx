import { ClerkProvider } from "@clerk/nextjs";

import { SIGN_OUT_REDIRECT_URL } from "@/lib/navigation/site-nav";

/*
 * Clerk's browser SDK, for the routes that need it and no others.
 *
 * Why not the root layout (2026-10-07): wrapping every route in <ClerkProvider> made every
 * marketing page download and hydrate Clerk (~340 KB of script) for a header link. Production
 * mobile Lighthouse sat at 71-75 with LCP ~6 s. Public pages now carry no Clerk client code;
 * only the signed-in areas (admin, client, portal) and the auth screens mount this.
 *
 * Server-side protection is unchanged: proxy.ts (clerkMiddleware) still guards /admin,
 * /client and /portal, and auth() works in server code without this provider.
 */
export default function ClerkScope({ children }: { children: React.ReactNode }) {
  return <ClerkProvider afterSignOutUrl={SIGN_OUT_REDIRECT_URL}>{children}</ClerkProvider>;
}
