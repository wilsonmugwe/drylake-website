/*
 * Minimal RFC 9309 robots.txt evaluator, used only to TEST the shipped policy (and to print
 * the crawler matrix). PURE.
 *
 *   1. A crawler obeys the one group whose user-agent matches its product token
 *      (case-insensitive); if none matches, the "*" group; if there is no "*", everything is
 *      allowed.
 *   2. Within that group the longest matching rule wins; on a tie, Allow wins.
 *   Rules are path prefixes (this policy uses no wildcards, so none are implemented).
 */

import type { RobotsGroup } from "./crawlers.ts";

export function groupFor(groups: readonly RobotsGroup[], token: string): RobotsGroup | null {
  const lower = token.toLowerCase();

  return (
    groups.find((group) => group.userAgent.some((agent) => agent.toLowerCase() === lower)) ??
    groups.find((group) => group.userAgent.includes("*")) ??
    null
  );
}

export function isAllowed(groups: readonly RobotsGroup[], token: string, path: string): boolean {
  const group = groupFor(groups, token);

  if (!group) {
    return true;
  }

  let best: { length: number; allow: boolean } | null = null;

  for (const [rules, allow] of [
    [group.allow, true],
    [group.disallow, false],
  ] as const) {
    for (const rule of rules) {
      if (rule && path.startsWith(rule)) {
        const length = rule.length;

        if (!best || length > best.length || (length === best.length && allow)) {
          best = { length, allow };
        }
      }
    }
  }

  return best ? best.allow : true;
}
