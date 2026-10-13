/*
 * Small fixed-window rate limiter. PURE (unit-tested): in memory, per server instance.
 *
 * Honest about its reach: Vercel runs several instances, so this bounds a burst from one client
 * against one warm instance, not a distributed attack. It is one layer of three on the
 * consultation endpoints: Turnstile on the public booking form, this limiter, and the
 * database's own limits (two upcoming bookings per email, one booking per slot). A Vercel
 * Firewall rule on /api/consultations is recommended for the platform-wide limit (as on
 * /api/contact); see docs/operations/consultations.md.
 */

export type RateLimiter = {
  /** True when the call is allowed (and counted); false when the key is over its limit. */
  take(key: string, now?: number): boolean;
  reset(): void;
};

export function createRateLimiter(limit: number, windowMs: number, maxKeys = 5_000): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    take(key, now = Date.now()) {
      const current = windows.get(key);

      if (!current || now - current.start >= windowMs) {
        if (windows.size >= maxKeys) {
          // Drop the oldest entries (insertion order) so memory stays bounded.
          for (const k of windows.keys()) {
            windows.delete(k);
            if (windows.size < maxKeys) break;
          }
        }
        windows.delete(key);
        windows.set(key, { start: now, count: 1 });
        return true;
      }

      if (current.count >= limit) return false;
      current.count += 1;
      return true;
    },
    reset() {
      windows.clear();
    },
  };
}
