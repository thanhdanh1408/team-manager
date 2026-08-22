import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createRefreshToken, createToken, setAuthCookie, setRefreshCookie } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { COLLECTIONS, createDocument, deleteDocument, getDocument, getDocuments, updateDocument } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Mã OTP phải gồm 6 chữ số"),
});

type PendingRegistration = {
  email: string; name: string; passwordHash: string; position: string; phone: string;
  codeHash: string; expiresAt: string; attempts: number;
};

function digest(value: string) {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!pepper && process.env.NODE_ENV === "production") throw new Error("Chưa cấu hình OTP_PEPPER");
  return createHash("sha256").update(`${value}:${pepper || "dev-otp-pepper"}`).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const email = data.email.toLowerCase().trim();
    const id = digest(email);
    const pending = await getDocument<PendingRegistration>(COLLECTIONS.PENDING_REGISTRATIONS, id);
    if (!pending) return jsonError("Yêu cầu đăng ký không tồn tại hoặc đã hết hạn", 404);
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      await deleteDocument(COLLECTIONS.PENDING_REGISTRATIONS, id);
      return jsonError("Mã OTP đã hết hạn, vui lòng gửi mã mới", 410);
    }
    if (pending.attempts >= 5) return jsonError("Bạn đã nhập sai quá nhiều lần, vui lòng gửi mã mới", 429);
    if (pending.codeHash !== digest(`${email}:${data.code}`)) {
      await updateDocument(COLLECTIONS.PENDING_REGISTRATIONS, id, { attempts: pending.attempts + 1 });
      return jsonError("Mã OTP không đúng", 400);
    }
    const existing = await getDocuments(COLLECTIONS.USERS, [{ field: "email", op: "==", value: email }]);
    if (existing.length) {
      await deleteDocument(COLLECTIONS.PENDING_REGISTRATIONS, id);
      return jsonError("Email này đã được đăng ký", 409);
    }
    const user = await createDocument(COLLECTIONS.USERS, {
      name: pending.name, email, passwordHash: pending.passwordHash, role: "member",
      position: pending.position, phone: pending.phone, isActive: true, avatar: null,
      emailVerified: true, authProvider: "password",
    });
    await deleteDocument(COLLECTIONS.PENDING_REGISTRATIONS, id);
    const authUser = { id: user.id, name: pending.name, email, role: "member" as const, position: pending.position };
    await setAuthCookie(await createToken(authUser));
    await setRefreshCookie(await createRefreshToken(authUser));
    await setCsrfCookie(generateCsrfToken());
    await createDocument(COLLECTIONS.ACTIVITY_LOGS, { userId: user.id, action: "register", detail: `${pending.name} xác minh email và đăng ký tài khoản` });
    return jsonOk({ user: authUser }, 201);
  } catch (error) { return handleApiError(error); }
}
