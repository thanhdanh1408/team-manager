import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ACCESS_COOKIE, CSRF_COOKIE, MESSAGES } from "@/constants";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "team-manager-dev-secret-change-in-production-2026"
);

async function getPayload(req: NextRequest) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type && payload.type !== "access") return null;
    return payload as { id: string; role: string };
  } catch {
    return null;
  }
}

function checkCsrf(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  // Origin / Referer same-host check
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  } else if (referer && host) {
    try {
      if (new URL(referer).host !== host) return false;
    } catch {
      return false;
    }
  }

  // Double-submit cookie
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get("x-csrf-token");
  if (!cookieToken) {
    // Allow first login/logout without CSRF cookie yet
    if (
      req.nextUrl.pathname === "/api/auth/login" ||
      req.nextUrl.pathname === "/api/auth/logout" ||
      req.nextUrl.pathname === "/api/auth/refresh"
    ) {
      return true;
    }
    return process.env.NODE_ENV !== "production";
  }
  return !!headerToken && headerToken === cookieToken;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF for API mutations
  if (pathname.startsWith("/api/") && !checkCsrf(req)) {
    return NextResponse.json({ error: MESSAGES.csrfInvalid }, { status: 403 });
  }

  const user = await getPayload(req);

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/member", req.url));
    }
  }

  // Protect member routes
  if (pathname.startsWith("/member")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (user.role !== "member") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // Redirect logged-in users away from login
  if (pathname === "/login" && user) {
    return NextResponse.redirect(
      new URL(user.role === "admin" ? "/admin" : "/member", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/member/:path*", "/login", "/api/:path*"],
};
