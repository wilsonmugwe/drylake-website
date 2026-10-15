/*
 * Microsoft 365 calendar provider over Microsoft Graph, app-only (client credentials).
 * PURE apart from the injected fetch: tests/consultation-m365.test.mjs drives it with a fake.
 *
 * Least privilege (docs/operations/consultations.md, "Microsoft 365 setup"): ONE Exchange Online
 * RBAC-for-Applications role, "Application Calendars.ReadWrite", scoped to the two consultation
 * mailboxes. That covers getSchedule, create, move and cancel; no OnlineMeetings permission is
 * needed because the Teams meeting is created through the event (isOnlineMeeting).
 *
 * Failure policy: every call has a timeout; 429/503/504 are retried once when Retry-After is
 * short; a 401 refreshes the token once. Anything else throws CalendarUnavailableError, which
 * callers turn into "fail safe" (no unverified times, a booking queued for retry). Tokens and
 * secrets never appear in an error message or a log.
 *
 * Facts relied on (learn.microsoft.com, read 2026-10-14): getSchedule takes up to 20 mailboxes
 * and a window under 62 days; POST /events returns onlineMeeting.joinUrl; invitations, updates
 * and cancellations go to attendees automatically; POST .../cancel is organizer-only and returns
 * 202; PATCHing an online meeting's body can strip the Teams link, so moves PATCH start/end only.
 * transactionId's duplicate-POST behaviour is undocumented, so every event also carries an
 * extended property with the booking id, and the sync worker looks it up before creating.
 */

import type { Representative } from "../representatives.ts";
import {
  type BusyInterval,
  type BusyMap,
  type CalendarEvent,
  type CalendarProvider,
  type ConsultationEventInput,
  CalendarEventMissingError,
  CalendarUnavailableError,
} from "./types.ts";

export type GraphConfig = { tenantId: string; clientId: string; clientSecret: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const GRAPH = "https://graph.microsoft.com/v1.0";
const TIMEOUT_MS = 8_000;
const MAX_RETRY_AFTER_S = 5;

/* Namespaced extended property carrying the Drylake booking id (stable GUID, never change it). */
export const BOOKING_PROPERTY_ID = "String {6f1d8a3e-2b7c-4e59-9a41-d7c3b0e5f812} Name DrylakeBookingId";

/* Statuses that leave a representative free. Tentative, busy, out of office and unknown do not. */
const FREE_STATUSES = new Set(["free", "workingelsewhere"]);

export function readGraphConfig(env: Record<string, string | undefined>): GraphConfig | null {
  const tenantId = env.MS_GRAPH_TENANT_ID?.trim();
  const clientId = env.MS_GRAPH_CLIENT_ID?.trim();
  const clientSecret = env.MS_GRAPH_CLIENT_SECRET?.trim();
  return tenantId && clientId && clientSecret ? { tenantId, clientId, clientSecret } : null;
}

/** Graph dateTime ("2026-10-19T01:30:00.0000000", UTC by our Prefer header) to epoch ms. */
export function parseGraphUtc(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!m) return null;
  const ms = m[2] ? m[2].slice(0, 4).padEnd(4, "0") : "";
  const t = Date.parse(`${m[1]}${ms}${m[3] ?? "Z"}`);
  return Number.isNaN(t) ? null : t;
}

const utc = (d: Date) => ({ dateTime: d.toISOString().replace("Z", ""), timeZone: "UTC" });

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Invitation text. Goes to the customer as well: no project description, no manage link. */
export function eventBody(input: ConsultationEventInput): string {
  const intro = `Free 30-minute consultation with Drylake. Booking reference ${escapeHtml(input.reference)}.`;
  const how =
    input.method === "PHONE"
      ? `This is a phone consultation. Drylake will call you on ${escapeHtml(input.customerPhone ?? "the number you gave us")} at the appointment time.`
      : "This is a Microsoft Teams video call. Join with the Teams link in this invitation.";
  const change = "To reschedule or cancel, use the Manage Booking button in your confirmation email from Drylake.";
  return `<p>${intro}</p><p>${how}</p><p>${change}</p>`;
}

export function eventPayload(input: ConsultationEventInput): Record<string, unknown> {
  const teams = input.method === "TEAMS";
  return {
    subject: `Free consultation with Drylake (${input.reference})`,
    body: { contentType: "HTML", content: eventBody(input) },
    start: utc(input.start),
    end: utc(input.end),
    attendees: [{ type: "required", emailAddress: { address: input.customerEmail, name: input.customerName } }],
    ...(teams
      ? { isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness" }
      : { location: { displayName: `Phone call to ${input.customerPhone ?? "customer"}` } }),
    allowNewTimeProposals: false,
    showAs: "busy",
    transactionId: input.transactionId,
    singleValueExtendedProperties: [{ id: BOOKING_PROPERTY_ID, value: input.bookingId }],
  };
}

type TokenCache = { token: string; expiresAt: number } | null;

export function createMicrosoftGraphProvider(
  config: GraphConfig,
  deps: { fetch?: FetchLike; now?: () => number; sleep?: (ms: number) => Promise<void> } = {}
): CalendarProvider {
  const doFetch: FetchLike = deps.fetch ?? ((input, init) => fetch(input, init));
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let cache: TokenCache = null;

  async function token(force = false): Promise<string> {
    if (!force && cache && cache.expiresAt > now()) return cache.token;
    let response: Response;
    try {
      response = await doFetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new CalendarUnavailableError("Microsoft sign-in unreachable");
    }
    const body = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string } | null;
    if (!response.ok || !body?.access_token) {
      throw new CalendarUnavailableError(`Microsoft sign-in refused (${response.status} ${body?.error ?? ""})`.trim());
    }
    // Refresh five minutes early; client-credential tokens have no refresh token.
    cache = { token: body.access_token, expiresAt: now() + Math.max(60, (body.expires_in ?? 3599) - 300) * 1000 };
    return cache.token;
  }

  async function graph(method: string, path: string, body?: unknown, attempt = 0, refreshed = false): Promise<Response> {
    const auth = await token(refreshed);
    let response: Response;
    try {
      response = await doFetch(`${GRAPH}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${auth}`,
          "Content-Type": "application/json",
          Prefer: 'outlook.timezone="UTC"',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new CalendarUnavailableError(`Microsoft Graph unreachable (${method} ${path.split("?")[0]})`);
    }

    if (response.status === 401 && !refreshed) return graph(method, path, body, attempt, true);

    if ([429, 503, 504].includes(response.status) && attempt === 0) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "2");
      if (Number.isFinite(retryAfter) && retryAfter <= MAX_RETRY_AFTER_S) {
        await sleep(Math.max(0, retryAfter) * 1000);
        return graph(method, path, body, 1, refreshed);
      }
    }
    return response;
  }

  async function graphError(response: Response, what: string): Promise<CalendarUnavailableError> {
    const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
    return new CalendarUnavailableError(`${what} failed (${response.status} ${body?.error?.code ?? ""})`.trim());
  }

  const mailbox = (r: Representative) => `/users/${encodeURIComponent(r.email)}`;

  function toEvent(raw: Record<string, unknown>): CalendarEvent {
    const online = raw.onlineMeeting as { joinUrl?: unknown } | null | undefined;
    const start = raw.start as { dateTime?: unknown } | undefined;
    return {
      id: String(raw.id),
      joinUrl: typeof online?.joinUrl === "string" ? online.joinUrl : null,
      start: parseGraphUtc(start?.dateTime),
    };
  }

  return {
    name: "microsoft",

    async getBusy(representatives, from, to) {
      const busy: BusyMap = new Map();
      if (representatives.length === 0) return busy;
      const response = await graph("POST", `${mailbox(representatives[0])}/calendar/getSchedule`, {
        schedules: representatives.map((r) => r.email),
        startTime: utc(from),
        endTime: utc(to),
        availabilityViewInterval: 30,
      });
      if (!response.ok) throw await graphError(response, "Free/busy lookup");

      const body = (await response.json().catch(() => null)) as { value?: Array<Record<string, unknown>> } | null;
      for (const schedule of body?.value ?? []) {
        const id = typeof schedule.scheduleId === "string" ? schedule.scheduleId.toLowerCase() : "";
        // A per-mailbox error (out of scope, no licence, unknown address) leaves that person unknown.
        if (!id || schedule.error) continue;
        const items = Array.isArray(schedule.scheduleItems) ? (schedule.scheduleItems as Array<Record<string, unknown>>) : [];
        const intervals: BusyInterval[] = [];
        for (const item of items) {
          const status = String(item.status ?? "unknown").toLowerCase();
          if (FREE_STATUSES.has(status)) continue;
          const start = parseGraphUtc((item.start as { dateTime?: unknown } | undefined)?.dateTime);
          const end = parseGraphUtc((item.end as { dateTime?: unknown } | undefined)?.dateTime);
          if (start === null || end === null) continue;
          intervals.push({ start, end });
        }
        busy.set(id, intervals);
      }
      return busy;
    },

    async findEvents(representative, bookingId) {
      // bookingId is always the database UUID (never user input); refuse anything else outright.
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw new CalendarUnavailableError("Event lookup refused: malformed booking id");
      const filter = `singleValueExtendedProperties/Any(ep: ep/id eq '${BOOKING_PROPERTY_ID}' and ep/value eq '${bookingId}')`;
      const response = await graph(
        "GET",
        `${mailbox(representative)}/events?$filter=${encodeURIComponent(filter)}&$select=id,start,onlineMeeting,isCancelled&$top=10`
      );
      if (!response.ok) throw await graphError(response, "Event lookup");
      const body = (await response.json().catch(() => null)) as { value?: Array<Record<string, unknown>> } | null;
      return (body?.value ?? []).filter((e) => e.isCancelled !== true).map(toEvent);
    },

    async getEvent(representative, eventId) {
      const response = await graph("GET", `${mailbox(representative)}/events/${encodeURIComponent(eventId)}?$select=id,start,onlineMeeting,isCancelled`);
      if (response.status === 404) return null;
      if (!response.ok) throw await graphError(response, "Event read");
      const raw = (await response.json()) as Record<string, unknown>;
      return raw.isCancelled === true ? null : toEvent(raw);
    },

    async createEvent(representative, input) {
      const response = await graph("POST", `${mailbox(representative)}/events`, eventPayload(input));
      if (!response.ok) throw await graphError(response, "Event creation");
      const created = toEvent((await response.json()) as Record<string, unknown>);
      if (input.method === "TEAMS" && !created.joinUrl) {
        // Teams provisioning can lag the create; one read picks the link up when it is ready.
        const again = await graph("GET", `${mailbox(representative)}/events/${encodeURIComponent(created.id)}?$select=id,start,onlineMeeting`);
        if (again.ok) return toEvent((await again.json()) as Record<string, unknown>);
      }
      return created;
    },

    async moveEvent(representative, eventId, start, end) {
      const response = await graph("PATCH", `${mailbox(representative)}/events/${encodeURIComponent(eventId)}`, {
        start: utc(start),
        end: utc(end),
      });
      if (response.status === 404) throw new CalendarEventMissingError();
      if (!response.ok) throw await graphError(response, "Event move");
    },

    async cancelEvent(representative, eventId, comment) {
      const response = await graph("POST", `${mailbox(representative)}/events/${encodeURIComponent(eventId)}/cancel`, { comment });
      if (response.ok || response.status === 404) return;
      throw await graphError(response, "Event cancellation");
    },
  };
}
