import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
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

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimitLogin(ip);
    if (!rl.allowed) {
      return jsonError(MESSAGES.rateLimited, 429);
    }

    const body = await req.json();
    const data = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

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
    };

    const accessToken = await createToken(authUser);
    const refreshToken = await createRefreshToken(authUser);
    await setAuthCookie(accessToken);
    await setRefreshCookie(refreshToken);
    await setCsrfCookie(generateCsrfToken());

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "login",
        detail: `${user.name} đăng nhập hệ thống`,
      },
    });

    // In-app notification for admin logins is optional; skip noise
    const res = jsonOk({ user: authUser });
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}


