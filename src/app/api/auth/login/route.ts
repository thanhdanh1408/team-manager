import { NextRequest } from "next/server";
import {
  createRefreshToken,
  createToken,
  setAuthCookie,
  setRefreshCookie,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { getClientIp, rateLimitLogin } from "@/lib/rate-limit";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { MESSAGES } from "@/constants";
import { logger } from "@/lib/logger";
import {
  getDocuments,
  createDocument,
  COLLECTIONS,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimitLogin(ip);
    if (!rl.allowed) {
      return jsonError(MESSAGES.rateLimited, 429);
    }

    const body = await req.json();
    const data = loginSchema.parse(body);

    const users = await getDocuments<{
      name: string;
      email: string;
      passwordHash: string;
      role: string;
      position: string;
      isActive: boolean;
      avatar?: string;
    }>(COLLECTIONS.USERS, [
      { field: "email", op: "==", value: data.email.toLowerCase() },
    ]);

    const user = users[0] ?? null;

    if (!user || !user.isActive) {
      return jsonError(MESSAGES.loginFailed, 401);
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      logger.warn("Login failed", { email: data.email, ip });
      return jsonError(MESSAGES.loginFailed, 401);
    }

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "member",
      position: user.position,
      avatar: user.avatar,
    };

    const accessToken = await createToken(authUser);
    const refreshToken = await createRefreshToken(authUser);
    await setAuthCookie(accessToken);
    await setRefreshCookie(refreshToken);
    await setCsrfCookie(generateCsrfToken());

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: user.id,
      action: "login",
      detail: `${user.name} đăng nhập hệ thống`,
    });

    const res = jsonOk({ user: authUser });
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

