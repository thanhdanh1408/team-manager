/**
 * Common middleware utilities for API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "./rate-limit";
import { getCsrfCookie, validateCsrfHeader, validateRequestOrigin } from "./csrf";
import { jsonError } from "./api-helpers";
import { MESSAGES } from "@/constants";

/**
 * Apply rate limiting to the request
 */
export async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  
  if (!rl.allowed) {
    return jsonError(MESSAGES.rateLimited, 429);
  }
  
  return null;
}

/**
 * Apply CSRF protection to state-changing requests
 */
export async function applyCsrfProtection(req: NextRequest): Promise<NextResponse | null> {
  const method = req.method.toUpperCase();
  
  // Skip CSRF for safe methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }
  
  // Validate origin/referer
  if (!validateRequestOrigin(req)) {
    return jsonError("Invalid origin", 403);
  }
  
  // Validate CSRF token for POST/PUT/PATCH/DELETE
  const csrfCookie = await getCsrfCookie();
  if (!validateCsrfHeader(req, csrfCookie)) {
    return jsonError("CSRF token mismatch", 403);
  }
  
  return null;
}

/**
 * Combined middleware: rate limit + CSRF protection
 */
export async function applySecurityMiddleware(req: NextRequest): Promise<NextResponse | null> {
  // Rate limiting
  const rateLimitError = await applyRateLimit(req);
  if (rateLimitError) return rateLimitError;
  
  // CSRF protection
  const csrfError = await applyCsrfProtection(req);
  if (csrfError) return csrfError;
  
  return null;
}
