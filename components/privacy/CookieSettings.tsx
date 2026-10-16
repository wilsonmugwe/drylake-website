"use client";

import { useId, useSyncExternalStore } from "react";

import {
  PREFERENCES_CHANGED_EVENT,
  clearPreferences,
  globalPrivacyControl,
  hasChosen,
  readPreferences,
  savePreferences,
} from "@/lib/privacy/cookie-preferences";

/*
 * Cookie and analytics settings. The cookie audit found no optional cookies, so there is no
 * consent banner; this is the control that lets a visitor switch the one optional technology
 * (Vercel Web Analytics, cookieless) off, and see what is in use. The choice is one localStorage
 * item (lib/privacy/cookie-preferences.ts), read live by the analytics beforeSend gate.
 *
 * The snapshot is a primitive string ("analytics|chosen|gpc") so useSyncExternalStore compares it
 * by value; the server snapshot is the default so hydration matches the server HTML.
 */
const SERVER_SNAPSHOT = "1|0|0";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PREFERENCES_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PREFERENCES_CHANGED_EVENT, onChange);
  };
}

function getSnapshot() {
  const gpc = globalPrivacyControl();
  const analytics = readPreferences(undefined, { gpc }).analytics;
  return `${analytics ? 1 : 0}|${hasChosen() ? 1 : 0}|${gpc ? 1 : 0}`;
}

export default function CookieSettings() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const [analyticsFlag, chosenFlag] = snapshot.split("|");
  const analyticsOn = analyticsFlag === "1";
  const chosen = chosenFlag === "1";
  const statusId = useId();

  return (
    <div className="surface-ink rounded-2xl p-5 sm:p-7" data-testid="cookie-settings">
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">Your settings</h3>
      <p className="mt-1 text-sm leading-6 text-white/70">
        Changes apply straight away and are remembered in this browser only.
      </p>

      <ul className="mt-5 divide-y divide-white/12 border-y border-white/12">
        <li className="flex items-start justify-between gap-4 py-4">
          <div>
            <p className="font-medium text-white">Essential</p>
            <p className="mt-1 text-sm leading-6 text-white/70">Sign-in and form security. Always on.</p>
          </div>
          <span className="shrink-0 pt-0.5 text-sm font-medium text-white/80">Always on</span>
        </li>

        <li className="flex items-start justify-between gap-4 py-4">
          <div>
            <label htmlFor="analytics-switch" className="font-medium text-white">
              Analytics
            </label>
            <p id={statusId} className="mt-1 text-sm leading-6 text-white/70" role="status" aria-live="polite" data-testid="analytics-status">
              {analyticsOn
                ? "On. We count visits and enquiries in aggregate with Vercel Web Analytics, which does not use cookies."
                : chosen
                  ? "Off. No page views or events are sent from this browser."
                  : "Off, because your browser sent a Global Privacy Control signal. No page views or events are sent."}
            </p>
          </div>
          <input
            id="analytics-switch"
            type="checkbox"
            role="switch"
            checked={analyticsOn}
            aria-describedby={statusId}
            onChange={(event) => {
              savePreferences({ analytics: event.target.checked });
            }}
            className="relative h-11 w-[5.5rem] shrink-0 cursor-pointer appearance-none rounded-full border border-white/40 bg-white/10 transition-colors before:absolute before:left-[3px] before:top-[3px] before:h-9 before:w-9 before:rounded-full before:bg-white before:transition-transform checked:border-signal checked:bg-signal checked:before:translate-x-[2.75rem]"
          />
        </li>

        <li className="flex items-start justify-between gap-4 py-4">
          <div>
            <p className="font-medium text-white">Functional</p>
            <p className="mt-1 text-sm leading-6 text-white/70">
              Only remembers your choice above, and only after you change it.
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-sm font-medium text-white/80">{chosen ? "In use" : "Not used"}</span>
        </li>

        <li className="flex items-start justify-between gap-4 py-4">
          <div>
            <p className="font-medium text-white">Marketing</p>
            <p className="mt-1 text-sm leading-6 text-white/70">No advertising or cross-site tracking.</p>
          </div>
          <span className="shrink-0 pt-0.5 text-sm font-medium text-white/80">None in use</span>
        </li>
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => clearPreferences()}
          disabled={!chosen}
          className="inline-flex min-h-[44px] items-center rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset to default
        </button>
        <p className="text-sm leading-6 text-white/70">{chosen ? "Your saved choice is stored in this browser." : "Nothing is stored until you change a setting."}</p>
      </div>
    </div>
  );
}
