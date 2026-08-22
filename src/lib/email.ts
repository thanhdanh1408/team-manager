import nodemailer from "nodemailer";

export async function sendRegistrationOtp(to: string, name: string, code: string) {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    throw new Error("Chưa cấu hình GMAIL_USER và GMAIL_APP_PASSWORD trên máy chủ");
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });
  await transporter.sendMail({
    from: `Team Manager <${user}>`,
    to,
    subject: "Mã xác minh đăng ký Team Manager",
    text: `Xin chào ${name}, mã OTP của bạn là ${code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="margin:0 0 16px">Xác minh tài khoản Team Manager</h2><p>Xin chào ${escapeHtml(name)},</p><p>Mã OTP đăng ký của bạn là:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f1f5f9;padding:16px;text-align:center;border-radius:10px">${code}</div><p style="color:#64748b;font-size:13px">Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p></div>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}
