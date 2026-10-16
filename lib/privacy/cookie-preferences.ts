/*
 * Visitor privacy preferences (privacy workstream, 2026-10-16). PURE: no React, no Next.
 *
 * Why this exists: the cookie audit (docs/privacy/2026-10-16-cookie-audit.md) found that the
 * public site sets NO cookies and writes NOTHING to browser storage. The only optional
 * technology is Vercel Web Analytics, which is cookieless. Australian law has no general cookie
 * consent rule, so a blocking banner would cost conversion and create a consent obligation for
 * nothing. Instead a visitor can switch analytics off, on the Security and Privacy page, and the
 * choice is remembered here.
 *
 * Storage: ONE localStorage item, written only when the visitor makes a choice (never on a plain
 * visit). It is first party, never sent to a server and holds no personal information. It is
 * listed in lib/privacy/storage-inventory.ts so the policy and the page disclose it.
 *
 * Default: analytics ON, because it is cookieless and carries no personal information, except
 * when the browser sends a Global Privacy Control signal and the visitor has not chosen: then OFF.
 *
 * Every function takes the storage as an argument (default: the browser's localStorage) so tests
 * need no DOM, and every function tolerates blocked storage (private mode, disabled site data).
 */

export const PREFERENCES_STORAGE_KEY = "drylake-privacy-preferences";
export const PREFERENCES_CHANGED_EVENT = "drylake:privacy-preferences-changed";
const VERSION = 1;

export type PrivacyPreferences = { analytics: boolean };
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ReadOptions = { gpc?: boolean };

export const DEFAULT_PREFERENCES: PrivacyPreferences = { analytics: true };

/* The browser's localStorage, or null on the server or when access is blocked. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/* True when the browser sends a Global Privacy Control signal (navigator.globalPrivacyControl). */
export function globalPrivacyControl(): boolean {
  try {
    return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  } catch {
    return false;
  }
}

function defaults({ gpc = false }: ReadOptions = {}): PrivacyPreferences {
  return gpc ? { analytics: false } : { ...DEFAULT_PREFERENCES };
}

/** The stored value as preferences. Anything missing, corrupt or from another version is "no choice made". */
export function parsePreferences(raw: string | null, options: ReadOptions = {}): PrivacyPreferences {
  if (!raw) return defaults(options);
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (record.v === VERSION && typeof record.analytics === "boolean") return { analytics: record.analytics };
    }
  } catch {
    // Corrupt value: fall through to the default.
  }
  return defaults(options);
}

export function serialisePreferences(preferences: PrivacyPreferences): string {
  return JSON.stringify({ v: VERSION, analytics: preferences.analytics });
}

/** True once the visitor has saved a choice (as opposed to seeing the default). */
export function hasChosen(storage: StorageLike | null = browserStorage()): boolean {
  try {
    const raw = storage?.getItem(PREFERENCES_STORAGE_KEY) ?? null;
    return raw !== null && isValid(raw);
  } catch {
    return false;
  }
}

function isValid(raw: string): boolean {
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    return typeof value === "object" && value !== null && value.v === VERSION && typeof value.analytics === "boolean";
  } catch {
    return false;
  }
}

export function readPreferences(storage: StorageLike | null = browserStorage(), options: ReadOptions = {}): PrivacyPreferences {
  try {
    return parsePreferences(storage?.getItem(PREFERENCES_STORAGE_KEY) ?? null, options);
  } catch {
    return defaults(options);
  }
}

/** Saves the choice. Returns false (and stores nothing) when storage is unavailable. */
export function savePreferences(preferences: PrivacyPreferences, storage: StorageLike | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(PREFERENCES_STORAGE_KEY, serialisePreferences(preferences));
    notifyChanged(storage);
    return true;
  } catch {
    return false;
  }
}

/** Forgets the choice and removes the stored item, returning to the default. */
export function clearPreferences(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.removeItem(PREFERENCES_STORAGE_KEY);
    notifyChanged(storage);
  } catch {
    // Nothing stored that could be removed.
  }
}

/** Tells same-page listeners (the settings control) that the choice changed. Not fired for test storages. */
function notifyChanged(storage: StorageLike | null): void {
  try {
    if (typeof window !== "undefined" && storage === window.localStorage) {
      window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT));
    }
  } catch {
    // Listeners are a convenience; the stored value is the source of truth.
  }
}

/**
 * May analytics events leave the browser? Read live on every event, so switching it off takes
 * effect immediately. Outside a browser (no storage) the default applies.
 */
export function isAnalyticsAllowed(storage: StorageLike | null = browserStorage()): boolean {
  return readPreferences(storage, { gpc: globalPrivacyControl() }).analytics;
}
