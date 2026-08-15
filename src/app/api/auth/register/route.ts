import { NextRequest } from "next/server";
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
    // Đăng ký chỉ cho phép role = "member"
    const data = userCreateSchema.parse({ ...body, role: "member" });

    const existing = await getDocuments(COLLECTIONS.USERS, [
      { field: "email", op: "==", value: data.email.toLowerCase() },
    ]);
    if (existing.length > 0) {
      return jsonError("Email này đã được đăng ký", 409);
    }

    const passwordHash = await hashPassword(data.password);
    const user = await createDocument(COLLECTIONS.USERS, {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: "member",
      position: data.position.trim(),
      phone: data.phone || "",
      isActive: true,
      avatar: null,
    });

    // Tự đăng nhập sau khi đăng ký
    const authUser = {
      id: user.id,
      name: user.name as string,
      email: user.email as string,
      role: "member" as "admin" | "member",
      position: user.position as string,
    };

    const accessToken = await createToken(authUser);
    const refreshToken = await createRefreshToken(authUser);
    await setAuthCookie(accessToken);
    await setRefreshCookie(refreshToken);
    await setCsrfCookie(generateCsrfToken());

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: user.id,
      action: "register",
      detail: `${user.name} đăng ký tài khoản`,
    });

    const res = jsonOk({ user: authUser, profile: toUserDto(user as Parameters<typeof toUserDto>[0]) }, 201);
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

