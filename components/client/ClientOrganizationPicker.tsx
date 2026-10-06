"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { ArrowRight, Loader2 } from "lucide-react";

export type PickerOption = {
  clerkOrgId: string;
  name: string;
};

type Props = {
  options: PickerOption[];
  /* Activate the single option immediately (after accepting an invitation, typically). */
  autoActivate: boolean;
  returnTo: string;
};

/*
 * Makes a Clerk organisation the session's active org, then reloads the portal.
 *
 * The options come from the server, which built them from the user's Clerk memberships.
 * Clerk's setActive also refuses an org the user is not a member of, and the server
 * re-resolves access on the reload, so nothing here is trusted for authorization.
 * A full reload (not a client transition) makes the next server render read the new
 * session token, which is what RLS keys on.
 */
export default function ClientOrganizationPicker({ options, autoActivate, returnTo }: Props) {
  const { setActive, loaded } = useClerk();
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function activate(clerkOrgId: string) {
    setActivating(clerkOrgId);
    setError("");

    try {
      await setActive({ organization: clerkOrgId });
      window.location.assign(returnTo);
    } catch {
      setActivating(null);
      setError("We could not open this workspace. Try again, or email us if it keeps happening.");
    }
  }

  useEffect(() => {
    if (!autoActivate || !loaded || started.current || options.length !== 1) {
      return;
    }

    started.current = true;
    void activate(options[0].clerkOrgId);
    // activate is stable for this render; run once when Clerk has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoActivate, loaded, options]);

  return (
    <div className="pt-3">
      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {options.map((option) => (
          <li key={option.clerkOrgId}>
            <button
              type="button"
              disabled={!loaded || activating !== null}
              onClick={() => activate(option.clerkOrgId)}
              className="group flex min-h-[56px] w-full items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-5 text-left text-sm font-semibold text-neutral-950 transition hover:border-[#f26a2e]/50 hover:bg-[#fafaf8] disabled:cursor-wait disabled:opacity-70"
            >
              <span className="truncate">{option.name}</span>
              {activating === option.clerkOrgId ? (
                <Loader2 aria-hidden="true" size={16} className="shrink-0 animate-spin text-[#f26a2e]" />
              ) : (
                <ArrowRight
                  aria-hidden="true"
                  size={16}
                  className="shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-[#f26a2e]"
                />
              )}
            </button>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="mt-3 text-sm text-neutral-500">
        {activating ? "Opening your workspace..." : null}
      </p>
    </div>
  );
}
