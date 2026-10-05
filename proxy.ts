import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPrivatePage(request)) {
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
      directives: {
        "frame-src": ["https://challenges.cloudflare.com"],
        "script-src": ["https://challenges.cloudflare.com"],
      },
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
