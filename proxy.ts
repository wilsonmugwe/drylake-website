import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  MARKDOWN_FETCH_HEADER,
  isMarkdownPath,
  shouldServeMarkdown,
} from "./lib/discovery/markdown-negotiation";
import { CSP_DIRECTIVES } from "./lib/security/csp";
import { isCrossSiteMutation } from "./lib/security/same-origin";

/*
 * First layer of route protection: any signed-out request for a private PAGE is sent to
 * sign-in with its full path (nested routes and query kept) as the return URL.
 *
 * This layer only answers "who is this user?". Authorization ("may this user see this?")
 * is enforced server-side in every page and API route: requirePlatformAdmin() for admin,
 * organisation-scoped queries for client data. API routes are not redirected here; they
 * return their own 401/403 JSON.
 */
const isPrivatePage = createRouteMatcher([
  "/admin(.*)",
  "/client(.*)",
  "/portal(.*)",
]);

/*
 * Invitation landing: the invitee is usually signed out and the URL carries Clerk's
 * one-time ticket. Redirecting it to sign-in here would drop the ticket, so it stays
 * public. The page only forwards the ticket to <SignIn>/<SignUp>; it reads no data.
 */
const isPublicPortalPage = createRouteMatcher(["/portal/accept-invitation"]);

export default clerkMiddleware(
  async (auth, request) => {
    // CSRF defence in depth: refuse state-changing API calls a browser says came from
    // another origin, before any handler runs (rules and exemptions in same-origin.ts).
    if (
      isCrossSiteMutation({
        method: request.method,
        pathname: request.nextUrl.pathname,
        requestOrigin: request.nextUrl.origin,
        origin: request.headers.get("origin"),
        secFetchSite: request.headers.get("sec-fetch-site"),
      })
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403, headers: { "Cache-Control": "private, no-store, max-age=0" } }
      );
    }

    // Markdown for agents: a PUBLIC page requested with Accept: text/markdown is rewritten to
    // the Markdown route (rules in lib/discovery/markdown-negotiation.ts). Private pages are never in the
    // public list, so they always fall through to the checks below.
    if (
      shouldServeMarkdown({
        method: request.method,
        pathname: request.nextUrl.pathname,
        accept: request.headers.get("accept"),
        internalFetch: request.headers.has(MARKDOWN_FETCH_HEADER),
      })
    ) {
      const target = new URL("/api/markdown", request.url);

      target.searchParams.set("path", request.nextUrl.pathname);

      return NextResponse.rewrite(target);
    }

    // The HTML copy of a public page also varies by Accept, so a cache never hands a browser the
    // Markdown copy or an agent the HTML one. Set here because Next overwrites a Vary header
    // configured in next.config.ts on prerendered pages. Public pages are never private, so
    // returning early skips nothing.
    if (isMarkdownPath(request.nextUrl.pathname)) {
      const response = NextResponse.next();

      response.headers.set("Vary", "Accept");

      return response;
    }

    if (!isPrivatePage(request) || isPublicPortalPage(request)) {
      return;
    }

    const { userId } = await auth();

    if (userId) {
      return;
    }

    const { pathname, search } = request.nextUrl;
    const signIn = new URL("/sign-in", request.url);

    signIn.searchParams.set("redirect_url", `${pathname}${search}`);

    return NextResponse.redirect(signIn);
  },
  {
    jwtKey: process.env.CLERK_JWT_KEY,

    contentSecurityPolicy: {
      directives: CSP_DIRECTIVES,
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
