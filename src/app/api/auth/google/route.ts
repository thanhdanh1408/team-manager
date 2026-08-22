import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createRefreshToken, createToken, hashPassword, setAuthCookie, setRefreshCookie } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { COLLECTIONS, createDocument, getDocuments, updateDocument } from "@/lib/db";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const schema = z.object({ credential: z.string().min(100) });

export async function POST(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return jsonError("Chưa cấu hình Google Client ID", 503);
    const { credential } = schema.parse(await req.json());
    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      audience: clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    const name = typeof payload.name === "string" ? payload.name : email.split("@")[0];
    const googleSub = typeof payload.sub === "string" ? payload.sub : "";
    const avatar = typeof payload.picture === "string" ? payload.picture : undefined;
    if (!email || payload.email_verified !== true || !googleSub) return jsonError("Tài khoản Google chưa xác minh email", 401);

    const users = await getDocuments<{ name: string; email: string; role: string; position: string; avatar?: string; isActive: boolean }>(COLLECTIONS.USERS, [{ field: "email", op: "==", value: email }]);
    let user = users[0];
    if (user && !user.isActive) return jsonError("Tài khoản đã bị vô hiệu hóa", 403);
    if (user) {
      await updateDocument(COLLECTIONS.USERS, user.id, { googleSub, emailVerified: true, avatar: user.avatar || avatar, authProvider: "google" });
    } else {
      user = await createDocument(COLLECTIONS.USERS, {
        name, email, passwordHash: await hashPassword(crypto.randomUUID()), role: "member",
        position: "Chưa cập nhật", phone: "", avatar: avatar || null, isActive: true,
        emailVerified: true, authProvider: "google", googleSub,
      }) as typeof user;
    }
    const authUser = { id: user.id, name: user.name, email: user.email, role: user.role as "admin" | "member", position: user.position, avatar: user.avatar || avatar };
    await setAuthCookie(await createToken(authUser));
    await setRefreshCookie(await createRefreshToken(authUser));
    await setCsrfCookie(generateCsrfToken());
    await createDocument(COLLECTIONS.ACTIVITY_LOGS, { userId: user.id, action: "login_google", detail: `${user.name} đăng nhập bằng Google` });
    return jsonOk({ user: authUser });
  } catch (error) {
    if (error instanceof Error && ["JWTExpired", "JWSSignatureVerificationFailed", "JWTClaimValidationFailed"].includes(error.name)) return jsonError("Google ID token không hợp lệ", 401);
    return handleApiError(error);
  }
}
