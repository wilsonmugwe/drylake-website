/*
 * Which calendar provider is active. PURE (env passed in; unit-tested).
 *
 *   CONSULTATION_CALENDAR_PROVIDER=none       (default) no calendar: Drylake bookings only
 *   CONSULTATION_CALENDAR_PROVIDER=microsoft  Microsoft 365 via Graph; needs MS_GRAPH_TENANT_ID,
 *                                             MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET
 *
 * "microsoft" with missing credentials is a configuration error, not a quiet fallback to "none":
 * once Drylake has said calendars are checked, offering unchecked times would break that promise.
 */

import { createMicrosoftGraphProvider, readGraphConfig } from "./microsoft-graph.ts";
import type { CalendarProvider } from "./types.ts";

export type CalendarSetting = { mode: "none" } | { mode: "microsoft"; provider: CalendarProvider } | { mode: "misconfigured"; reason: string };

let cached: { key: string; setting: CalendarSetting } | null = null;

export function calendarSetting(env: Record<string, string | undefined>): CalendarSetting {
  const mode = (env.CONSULTATION_CALENDAR_PROVIDER ?? "none").trim().toLowerCase() || "none";
  if (mode === "none") return { mode: "none" };
  if (mode !== "microsoft") return { mode: "misconfigured", reason: `unknown CONSULTATION_CALENDAR_PROVIDER "${mode}"` };

  const config = readGraphConfig(env);
  if (!config) return { mode: "misconfigured", reason: "Microsoft Graph credentials missing" };

  // One provider per credential set per instance, so the access token is reused across requests.
  const key = `${config.tenantId}|${config.clientId}|${config.clientSecret}`;
  if (cached?.key !== key) cached = { key, setting: { mode: "microsoft", provider: createMicrosoftGraphProvider(config) } };
  return cached.setting;
}
