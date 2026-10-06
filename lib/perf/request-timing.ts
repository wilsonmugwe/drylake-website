import "server-only";

import { cache } from "react";

import {
  type PortalRoute,
  type ResolverPath,
  type TimingPhase,
  buildTimingPayload,
} from "@/lib/perf/portal-timing";

/*
 * Per-request timing for the client portal. cache() scopes the record to one server render,
 * so the layout, the page and the workspace resolver all write into the same record.
 * Outside a server render (route handlers) cache() does not memoise: timings are then
 * collected into a throwaway record and nothing is logged, which is the safe failure.
 */
type RequestTiming = {
  startedAt: number;
  path: ResolverPath;
  phases: Partial<Record<TimingPhase, number>>;
};

const currentTiming = cache(
  (): RequestTiming => ({ startedAt: performance.now(), path: "none", phases: {} })
);

/* Call first in a page so totalMs covers the whole server render. */
export function startRequestTiming(): void {
  currentTiming();
}

export function markResolverPath(path: ResolverPath): void {
  currentTiming().path = path;
}

export async function timed<T>(phase: TimingPhase, run: () => PromiseLike<T>): Promise<T> {
  const timing = currentTiming();
  const started = performance.now();

  try {
    return await run();
  } finally {
    timing.phases[phase] = (timing.phases[phase] ?? 0) + (performance.now() - started);
  }
}

/* One structured line per portal render. See lib/perf/portal-timing.ts for the contract. */
export function logRouteTiming(route: PortalRoute, state: string): void {
  const timing = currentTiming();
  const payload = buildTimingPayload({
    route,
    region: process.env.VERCEL_REGION,
    path: timing.path,
    state,
    phases: timing.phases,
    totalMs: performance.now() - timing.startedAt,
  });

  if (payload) {
    console.info("client.portal.timing", payload);
  }
}
