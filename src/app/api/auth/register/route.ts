import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  createRefreshToken,
  createToken,
  setAuthCookie,
  setRefreshCookie,
  hashPassword,
} from "@/lib/auth";
import { userCreateSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk, toUserDto } from "@/lib/api-helpers";
import { getClientIp, rateLimitLogin } from "@/lib/rate-limit";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { MESSAGES } from "@/constants";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimitLogin(ip);
    if (!rl.allowed) {
      return jsonError(MESSAGES.rateLimited, 429);
    }

    const body = await req.json();
    // Đăng ký chỉ cho phép role = "member"
    const data = userCreateSchema.parse({ ...body, role: "member" });

    const exists = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) {
      return jsonError("Email này đã được đăng ký", 409);
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: "member",
        position: data.position.trim(),
        phone: data.phone || "",
        isActive: true,
      },
    });

    // Tự đăng nhập sau khi đăng ký
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
        action: "register",
        detail: `${user.name} đăng ký tài khoản`,
      },
    });

    const res = jsonOk({ user: authUser, profile: toUserDto(user) }, 201);
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
