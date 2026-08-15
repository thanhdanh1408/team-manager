import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { AuthUser, Role } from "@/types";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_EXPIRY,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from "@/constants";

function requireSecret(name: string, value: string | undefined, fallback: string): Uint8Array {
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return new TextEncoder().encode(value || fallback);
}

const JWT_SECRET = requireSecret(
  "JWT_SECRET",
  process.env.JWT_SECRET,
  "team-manager-dev-secret-change-in-production-2026"
);

const REFRESH_SECRET = requireSecret(
  "JWT_REFRESH_SECRET",
  process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
  "team-manager-refresh-secret-change-in-production-2026"
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Short-lived access token (15m) */
export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/** Long-lived refresh token (7d) */
export async function createRefreshToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    role: user.role,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRY_DAYS}d`)
    .sign(REFRESH_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type && payload.type !== "access") return null;
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
      position: payload.position as string,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<{ id: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (payload.type !== "refresh") return null;
    return {
      id: payload.id as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
}

export async function setRefreshCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getAuthFromRequest(
  req: NextRequest
): Promise<AuthUser | null> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export function requireAdmin(user: AuthUser | null): AuthUser {
  const u = requireAuth(user);
  if (u.role !== "admin") {
    throw new AuthError("Forbidden - Admin only", 403);
  }
  return u;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
