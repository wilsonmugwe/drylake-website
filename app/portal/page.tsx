import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PortalRouterPage() {
  const { userId } = await auth();

  // Not authenticated → sign in, then return here.
  if (!userId) {
    redirect("/sign-in?redirect_url=/portal");
  }

  // Check Drylake platform-admin authorization.
  const platformAdmin = await isPlatformAdmin();

  // Drylake administrators go to the administration workspace.
  if (platformAdmin) {
    redirect("/admin");
  }

  // Everyone else goes to the client portal.
  redirect("/client");
}