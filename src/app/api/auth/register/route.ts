import { createHash, randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { getClientIp, rateLimitLogin } from "@/lib/rate-limit";
import { COLLECTIONS, getDocument, getDocuments, setDocument } from "@/lib/db";
import { sendRegistrationOtp } from "@/lib/email";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;

function digest(value: string) {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!pepper && process.env.NODE_ENV === "production") throw new Error("Chưa cấu hình OTP_PEPPER");
  return createHash("sha256").update(`${value}:${pepper || "dev-otp-pepper"}`).digest("hex");
}

type PendingRegistration = { resendAt: string };

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimitLogin(getClientIp(req));
    if (!rl.allowed) return jsonError("Bạn thao tác quá nhanh, vui lòng thử lại sau", 429);
    const data = userCreateSchema.parse({ ...(await req.json()), role: "member" });
    const email = data.email.toLowerCase().trim();
    const existing = await getDocuments(COLLECTIONS.USERS, [{ field: "email", op: "==", value: email }]);
    if (existing.length) return jsonError("Email này đã được đăng ký", 409);

    const pendingId = digest(email);
    const current = await getDocument<PendingRegistration>(COLLECTIONS.PENDING_REGISTRATIONS, pendingId);
    if (current && new Date(current.resendAt).getTime() > Date.now()) {
      const seconds = Math.ceil((new Date(current.resendAt).getTime() - Date.now()) / 1000);
      return jsonError(`Vui lòng chờ ${seconds} giây trước khi gửi lại mã`, 429);
    }

    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    await setDocument(COLLECTIONS.PENDING_REGISTRATIONS, pendingId, {
      email,
      name: data.name.trim(),
      passwordHash: await hashPassword(data.password),
      position: data.position.trim(),
      phone: data.phone || "",
      codeHash: digest(`${email}:${code}`),
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      resendAt: new Date(Date.now() + OTP_RESEND_MS).toISOString(),
      attempts: 0,
    });
    await sendRegistrationOtp(email, data.name.trim(), code);
    return jsonOk({ requiresOtp: true, email, expiresInSeconds: OTP_TTL_MS / 1000 });
  } catch (error) { return handleApiError(error); }
}
