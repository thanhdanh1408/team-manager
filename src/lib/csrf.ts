/**
 * Double-submit CSRF token helpers.
 * Token is set in a readable cookie; mutating requests must send matching header.
 */

import { cookies } from "next/headers";
import { CSRF_COOKIE } from "@/constants";

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function setCsrfCookie(token: string) {
  const store = await cookies();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by JS for header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getCsrfCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value;
}

/** Validate Origin/Referer + optional CSRF header for state-changing methods */
export function validateRequestOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const referer = req.headers.get("referer");

  // Same-origin check via Origin
  if (origin && host) {
    try {
      const o = new URL(origin);
      if (o.host === host) return true;
      return false;
    } catch {
      return false;
    }
  }

  // Fallback: Referer
  if (referer && host) {
    try {
      const r = new URL(referer);
      return r.host === host;
    } catch {
      return false;
    }
  }

  // No origin/referer (e.g. same-site form from some browsers) — allow in dev
  if (process.env.NODE_ENV !== "production") return true;

  // In production without Origin, require CSRF header match
  return false;
}

export function validateCsrfHeader(req: Request, cookieToken?: string): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }
  if (!cookieToken) return false;
  const header = req.headers.get("x-csrf-token");
  return !!header && header === cookieToken;
}
