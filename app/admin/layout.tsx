import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ClerkScope from "@/components/auth/ClerkScope";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ProductEnvironment from "@/components/shell/ProductEnvironment";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";

export const metadata = {
  title: {
    default: "Admin | Drylake",
    template: "%s | Drylake Admin",
  },
  robots: {
    index: false,
    follow: false,
  },
};

/*
 * Admin frame. The redirects below are a convenience, not the security boundary: layouts do not
 * re-run on client-side navigation, so every admin page re-checks platform admin itself before it
 * creates the service-role (RLS-bypassing) Supabase client. proxy.ts also requires a session here.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  return (
    <ClerkScope>
      <div className="drylake-admin min-h-screen bg-[#f4f4f1] text-[#171716]">
        <AdminMobileNav />

        <div className="flex min-h-screen">
          <AdminSidebar />

          {/* The operational variant of the product environment: background only. */}
          <div className="relative isolate min-w-0 flex-1">
            <ProductEnvironment variant="admin" />
            <div className="relative z-[1]">{children}</div>
          </div>
        </div>
      </div>
    </ClerkScope>
  );
}