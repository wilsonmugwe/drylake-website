import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import { getSwitchableWorkspaces } from "@/lib/auth/client-context";

/*
 * "Switch workspace", shown only to users with more than one ACTIVE client workspace.
 *
 * Streamed inside a Suspense boundary by the layout: it needs the Clerk Backend API, so
 * it must never hold up the page. It is UI only; access is always decided by
 * getClientWorkspace().
 */
export default async function WorkspaceSwitchLink() {
  const options = await getSwitchableWorkspaces();

  if (options.length < 2) {
    return null;
  }

  return (
    <Link
      href="/portal/workspaces"
      className="mt-3 flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white"
    >
      <ArrowLeftRight aria-hidden="true" size={13} />
      Switch workspace
      <span className="ml-auto text-white/35">{options.length}</span>
    </Link>
  );
}
