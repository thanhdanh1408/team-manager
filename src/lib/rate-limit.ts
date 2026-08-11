/**
 * Simple in-memory rate limiter (per-process).
 * Suitable for single-instance / SQLite deployments.
 */

import {
  RATE_LIMIT_LOGIN_MAX,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "@/constants";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getBucket(key: string, max: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  const remaining = Math.max(0, max - b.count);
  return {
    allowed: b.count <= max,
    remaining,
    resetAt: b.resetAt,
  };
}

/** General API rate limit by IP */
export function rateLimit(ip: string) {
  return getBucket(`api:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
}

/** Stricter limit for login attempts */
export function rateLimitLogin(ip: string) {
  return getBucket(`login:${ip}`, RATE_LIMIT_LOGIN_MAX, RATE_LIMIT_WINDOW_MS);
}

/** Extract client IP from request headers */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

// Periodic cleanup to avoid unbounded growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }, 5 * 60_000).unref?.();
}
