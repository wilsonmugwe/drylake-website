import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  jwtKey: process.env.CLERK_JWT_KEY,

  contentSecurityPolicy: {
    directives: {
      "frame-src": ["https://challenges.cloudflare.com"],
      "script-src": ["https://challenges.cloudflare.com"],
    },
  },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};