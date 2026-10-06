import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { getClientWorkspace } from "@/lib/auth/client-context";
import type { PortalContext } from "@/lib/email/contact-enquiry";

/*
 * Server-verified context for a message sent from the client portal's "Start a
 * conversation" form. The form's own name/email/company fields are typed by the user and
 * are only a reply-to; these values come from the Clerk session and the authoritative
 * workspace resolution, so the Drylake inbox can tell a verified client from a visitor.
 *
 * Never throws: a failed lookup only drops the context, it never blocks the message.
 */
export async function getPortalContext(): Promise<PortalContext | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const [user, workspace] = await Promise.all([currentUser(), getClientWorkspace()]);

    return {
      accountEmail: user?.primaryEmailAddress?.emailAddress ?? null,
      workspaceName: workspace.state === "ready" ? workspace.organization.name : null,
      workspaceState: workspace.state,
    };
  } catch (error) {
    console.error("Portal contact context unavailable:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return null;
  }
}
