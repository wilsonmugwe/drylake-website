/*
 * Stateless chat session tokens, plus the in-memory limiters the assistant needs. PURE apart from
 * node:crypto (unit-tested).
 *
 * A session is created only after a verified Turnstile token. The token is "<sid>.<expiryMs>.<sig>"
 * with an HMAC-SHA256 signature, so the server needs no database to recognise one. Nothing about
 * the conversation is stored: the token carries no content, only identity and expiry.
 *
 * Honest limits: Vercel runs several instances, so the turn counter, daily cap and circuit
 * breaker below are per instance. They bound a burst against a warm instance; the platform-wide
 * defences are Turnstile at session start, the per-IP limiter, a Vercel Firewall rule on
 * /api/assistant, and an AWS Budgets alert (docs/operations/chat-assistant.md).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type SessionCheck = { ok: true; sid: string } | { ok: false };

const b64 = (buffer: Buffer) => buffer.toString("base64url");

function sign(secret: string, payload: string): string {
  return b64(createHmac("sha256", secret).update(payload).digest());
}

export function createSession(secret: string, ttlMs: number, now = Date.now()): { token: string; sid: string } {
  const sid = b64(randomBytes(12));
  const payload = `${sid}.${now + ttlMs}`;
  return { token: `${payload}.${sign(secret, payload)}`, sid };
}

export function verifySession(secret: string, token: unknown, now = Date.now()): SessionCheck {
  if (typeof token !== "string" || token.length > 200) return { ok: false };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };

  const [sid, expiry, signature] = parts;
  const expected = Buffer.from(sign(secret, `${sid}.${expiry}`));
  const given = Buffer.from(signature);

  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false };
  if (!Number.isFinite(Number(expiry)) || Number(expiry) < now) return { ok: false };
  return { ok: true, sid };
}

/* Counts turns per session id; bounded memory. take() is false once `max` turns are used. */
export function createTurnCounter(max: number, maxKeys = 5_000) {
  const turns = new Map<string, number>();
  return {
    take(sid: string): boolean {
      const used = turns.get(sid) ?? 0;
      if (used >= max) return false;
      if (!turns.has(sid) && turns.size >= maxKeys) turns.delete(turns.keys().next().value as string);
      turns.set(sid, used + 1);
      return true;
    },
    remaining(sid: string): number {
      return Math.max(0, max - (turns.get(sid) ?? 0));
    },
    reset() {
      turns.clear();
    },
  };
}

/* Global requests per Perth calendar day (per instance). cap <= 0 closes the assistant. */
export function createDailyCap(cap: number) {
  let day = "";
  let count = 0;
  const today = (now: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth" }).format(new Date(now));
  return {
    take(now = Date.now()): boolean {
      const d = today(now);
      if (d !== day) {
        day = d;
        count = 0;
      }
      if (count >= cap) return false;
      count += 1;
      return true;
    },
    reset() {
      day = "";
      count = 0;
    },
  };
}

/* Opens after `threshold` consecutive provider failures; half-opens after `openMs`. */
export function createBreaker(threshold = 4, openMs = 60_000) {
  let failures = 0;
  let openedAt = 0;
  return {
    allow(now = Date.now()): boolean {
      return failures < threshold || now - openedAt >= openMs;
    },
    success() {
      failures = 0;
    },
    failure(now = Date.now()) {
      failures += 1;
      if (failures >= threshold) openedAt = now;
    },
    reset() {
      failures = 0;
      openedAt = 0;
    },
  };
}
