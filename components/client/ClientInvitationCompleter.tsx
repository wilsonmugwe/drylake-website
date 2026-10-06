"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

type Props = {
  returnTo: string;
};

/*
 * Finishes onboarding for a user who signed in without redeeming their invitation link.
 *
 * The server already found a completable Drylake invitation for this account. This posts
 * to /api/client/invitations/complete (no input: the server re-derives everything from
 * the Clerk session), activates the confirmed organisation, then reloads so the next
 * server render reads the new session token. Nothing here is trusted for authorization.
 */
export default function ClientInvitationCompleter({ returnTo }: Props) {
  const { setActive, loaded } = useClerk();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!loaded || started.current) {
      return;
    }

    started.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/client/invitations/complete", {
          method: "POST",
          headers: { Accept: "application/json" },
        });
        const body: unknown = await response.json().catch(() => null);
        const ids =
          body && typeof body === "object" && Array.isArray((body as { clerkOrgIds?: unknown }).clerkOrgIds)
            ? ((body as { clerkOrgIds: unknown[] }).clerkOrgIds.filter(
                (id): id is string => typeof id === "string"
              ))
            : [];

        if (!response.ok || ids.length === 0) {
          setFailed(true);
          return;
        }

        // One workspace: open it. Several: the portal offers the choice on reload.
        if (ids.length === 1) {
          await setActive({ organization: ids[0] });
        }

        window.location.assign(returnTo);
      } catch {
        setFailed(true);
      }
    })();
  }, [loaded, returnTo, setActive]);

  return (
    <p aria-live="polite" className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-[#fafaf8] px-4 py-3 text-sm text-neutral-600">
      {failed ? (
        "We could not finish connecting your account. Reload the page, or start a conversation and we will sort it out."
      ) : (
        <>
          <Loader2 aria-hidden="true" size={16} className="animate-spin text-[#f26a2e]" />
          Connecting your account to your workspace...
        </>
      )}
    </p>
  );
}
