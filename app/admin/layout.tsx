import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AdminSidebar from "@/components/admin/AdminSidebar";
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
    <div className="admin-shell">
      <AdminMobileNav />

      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}