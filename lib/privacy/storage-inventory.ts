/*
 * Every cookie and browser-storage item the site and its sign-in service use, by category.
 * Rendered on the Security and Privacy page and summarised in the Privacy Policy; the evidence is
 * docs/privacy/2026-10-16-cookie-audit.md (a real browser against a production build and against
 * the live site, 2026-10-16). Update the audit and this list together.
 *
 * Findings: public pages set NO cookies and store NOTHING. Cookies appear only when someone opens
 * the sign-in screen (Clerk, and Cloudflare protecting Clerk's service). Nothing is used for
 * marketing or advertising.
 */

import { PREFERENCES_STORAGE_KEY } from "./cookie-preferences.ts";

export const COOKIE_CATEGORIES = [
  {
    id: "essential",
    label: "Essential",
    summary: "Needed to sign in and keep forms and accounts secure. These cannot be switched off.",
  },
  {
    id: "analytics",
    label: "Analytics",
    summary: "Counts visits and enquiries in aggregate so we can see which pages help. You can switch this off.",
  },
  {
    id: "functional",
    label: "Functional",
    summary: "Remembers a choice you make on this site.",
  },
  {
    id: "marketing",
    label: "Marketing",
    summary: "Advertising or cross-site tracking. We use none.",
  },
] as const;

export type CookieCategory = (typeof COOKIE_CATEGORIES)[number]["id"];

export type StorageEntry = {
  /** Cookie or storage key. "(none)" for a technology that stores nothing. */
  name: string;
  category: CookieCategory;
  provider: string;
  /** cookie, localStorage, or none (a technology that sets nothing in your browser). */
  kind: "cookie" | "localStorage" | "none";
  purpose: string;
  duration: string;
  /** Where it appears. */
  where: string;
};

export const STORAGE_INVENTORY: readonly StorageEntry[] = [
  {
    name: "__client",
    category: "essential",
    provider: "Clerk",
    kind: "cookie",
    purpose: "Keeps your sign-in session with the sign-in service.",
    duration: "Up to about 13 months",
    where: "Sign-in screen and Drylake Workspace only",
  },
  {
    name: "__client_uat",
    category: "essential",
    provider: "Clerk",
    kind: "cookie",
    purpose: "Tells the site whether you are signed in (also a copy with a site-specific suffix).",
    duration: "Up to about 13 months",
    where: "Sign-in screen and Drylake Workspace only",
  },
  {
    name: "__session",
    category: "essential",
    provider: "Clerk",
    kind: "cookie",
    purpose: "A short-lived token that proves you are signed in on each request.",
    duration: "Short-lived, renewed while you are signed in",
    where: "Drylake Workspace only, after you sign in",
  },
  {
    name: "__clerk_environment",
    category: "essential",
    provider: "Clerk",
    kind: "localStorage",
    purpose: "Caches the sign-in screen's settings so it loads faster.",
    duration: "Until you clear site data",
    where: "Sign-in screen",
  },
  {
    name: "__cf_bm, _cfuvid",
    category: "essential",
    provider: "Cloudflare",
    kind: "cookie",
    purpose: "Protect the sign-in service from automated abuse.",
    duration: "30 minutes, and the browser session",
    where: "Sign-in screen only (set by the sign-in service, not by drylake.com.au pages)",
  },
  {
    name: "Turnstile form check",
    category: "essential",
    provider: "Cloudflare",
    kind: "none",
    purpose: "Confirms a contact or booking form is filled in by a person. No cookie or storage item was set in our test.",
    duration: "Not stored",
    where: "Contact form and the confirm step of consultation booking",
  },
  {
    name: "Vercel Web Analytics",
    category: "analytics",
    provider: "Vercel",
    kind: "none",
    purpose: "Counts page views and a few anonymous events such as a booking being started. Vercel describes it as cookieless.",
    duration: "Not stored in your browser",
    where: "Public pages, unless you switch it off",
  },
  {
    name: PREFERENCES_STORAGE_KEY,
    category: "functional",
    provider: "Drylake",
    kind: "localStorage",
    purpose: "Remembers your analytics choice. Written only after you change the setting; holds no personal information.",
    duration: "Until you reset it or clear site data",
    where: "This browser only. Never sent to us",
  },
];

export function inventoryFor(category: CookieCategory): StorageEntry[] {
  return STORAGE_INVENTORY.filter((entry) => entry.category === category);
}
