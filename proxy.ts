import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(
  async (auth, req) => {
    if (req.nextUrl.pathname.startsWith("/client")) {
      const authState = await auth();

      console.log("[CLERK DEBUG]", {
        pathname: req.nextUrl.pathname,
        userId: authState.userId,
        orgId: authState.orgId,
        sessionId: authState.sessionId,
      });
    }
  },
  {
    debug: true,

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