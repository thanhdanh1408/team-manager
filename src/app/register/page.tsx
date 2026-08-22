"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckSquare, KeyRound, MailCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api-client";
import type { AuthUser } from "@/types";

const initialForm = { name: "", email: "", password: "", confirmPassword: "", position: "", phone: "" };

export default function RegisterPage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(user.role === "admin" ? "/admin" : "/member");
  }, [user, loading, router]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Họ tên tối thiểu 2 ký tự";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Email không hợp lệ";
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) next.password = "Cần ít nhất 8 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Mật khẩu xác nhận không khớp";
    if (!form.position.trim()) next.position = "Chức vụ là bắt buộc";
    if (form.phone && !/^(0[35789])[0-9]{8}$/.test(form.phone)) next.phone = "Số điện thoại không hợp lệ";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const requestOtp = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post<{ requiresOtp: true; email: string }>("/api/auth/register", {
        name: form.name.trim(), email: form.email.trim(), password: form.password,
        position: form.position.trim(), phone: form.phone.trim(),
      });
      setOtpSent(true);
      setOtp("");
      toast.success("Mã OTP đã được gửi đến email của bạn");
    } catch (error) {
      if (error instanceof ApiError && error.errors) setErrors(error.errors);
      toast.error(error instanceof Error ? error.message : "Không thể gửi mã OTP");
    } finally { setSubmitting(false); }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) { toast.error("Mã OTP phải gồm 6 chữ số"); return; }
    setSubmitting(true);
    try {
      const result = await api.post<{ user: AuthUser }>("/api/auth/register/verify-otp", { email: form.email.trim(), code: otp });
      setUser(result.user);
      toast.success("Xác minh email và đăng ký thành công");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Xác minh OTP thất bại"); }
    finally { setSubmitting(false); }
  };

  if (loading || user) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" /></div>;

  return <div className="flex min-h-screen">
    <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><CheckSquare size={22} className="text-white" /></div><span className="text-lg font-semibold text-white">Team Manager</span></div>
      <div><h1 className="text-3xl font-semibold leading-tight text-white">Tham gia team<br />một cách an toàn</h1><p className="mt-4 max-w-md text-slate-400">Email phải được xác minh bằng mã OTP trước khi tài khoản được tạo.</p><div className="mt-8 space-y-3">{["Mã OTP hết hạn sau 10 phút", "Tối đa 5 lần nhập sai", "Không tạo tài khoản trước khi xác minh"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20"><Check size={12} className="text-emerald-400" /></span>{item}</div>)}</div></div>
      <p className="text-sm text-slate-500">© 2026 Team Manager</p>
    </div>
    <div className="flex flex-1 items-start justify-center overflow-y-auto p-6 sm:p-12"><div className="w-full max-w-sm py-4">
      <div className="mb-6 flex items-center gap-3 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900"><CheckSquare size={18} className="text-white" /></div><span className="font-semibold">Team Manager</span></div>
      {!otpSent ? <>
        <div className="mb-1 flex items-center gap-2"><UserPlus size={20} /><h2 className="text-2xl font-semibold text-slate-900">Đăng ký</h2></div>
        <p className="mb-7 text-sm text-slate-500">Tạo tài khoản thành viên mới</p>
        <form onSubmit={requestOtp} className="space-y-4" noValidate>
          <Input id="name" label="Họ tên *" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={errors.name} autoComplete="name" />
          <Input id="email" label="Email *" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={errors.email} autoComplete="email" />
          <Input id="password" label="Mật khẩu *" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} error={errors.password} autoComplete="new-password" />
          <Input id="confirm-password" label="Xác nhận mật khẩu *" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} error={errors.confirmPassword} autoComplete="new-password" />
          <Input id="position" label="Chức vụ *" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} error={errors.position} />
          <Input id="phone" label="Số điện thoại" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} error={errors.phone} autoComplete="tel" />
          <Button type="submit" className="w-full" size="lg" loading={submitting}><MailCheck size={16} /> Gửi mã xác minh</Button>
        </form>
      </> : <>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><KeyRound size={23} /></div>
        <h2 className="text-2xl font-semibold text-slate-900">Nhập mã OTP</h2>
        <p className="mt-2 text-sm text-slate-500">Mã 6 chữ số đã được gửi tới <strong className="text-slate-700">{form.email}</strong>.</p>
        <form onSubmit={verifyOtp} className="mt-7 space-y-4">
          <Input id="otp" label="Mã xác minh" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} className="text-center text-xl font-semibold tracking-[0.45em]" />
          <Button type="submit" className="w-full" size="lg" loading={submitting}>Xác minh và đăng ký</Button>
          <div className="flex justify-between text-sm"><button type="button" onClick={() => setOtpSent(false)} className="text-slate-500 hover:underline">Sửa thông tin</button><button type="button" onClick={() => void requestOtp()} disabled={submitting} className="font-medium text-slate-800 hover:underline disabled:opacity-50">Gửi lại mã</button></div>
        </form>
      </>}
      <p className="mt-6 text-center text-sm text-slate-500">Đã có tài khoản? <Link href="/login" className="font-medium text-slate-900 hover:underline">Đăng nhập</Link></p>
    </div></div>
  </div>;
}
