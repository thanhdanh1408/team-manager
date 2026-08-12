"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Eye, EyeOff, UserPlus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { AuthUser } from "@/types";
import { cn } from "@/lib/utils";

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "Ít nhất 8 ký tự", test: (v) => v.length >= 8 },
  { label: "Ít nhất 1 chữ hoa (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { label: "Ít nhất 1 chữ số (0-9)", test: (v) => /[0-9]/.test(v) },
  { label: "Ít nhất 1 ký tự đặc biệt", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function RegisterPage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    position: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.role === "admin" ? "/admin" : "/member");
    }
  }, [user, loading, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Họ tên tối thiểu 2 ký tự";
    if (!form.email.trim()) e.email = "Email là bắt buộc";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email không hợp lệ";
    if (!form.password) e.password = "Mật khẩu là bắt buộc";
    else if (!PASSWORD_RULES.every((r) => r.test(form.password)))
      e.password = "Mật khẩu chưa đủ yêu cầu";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Mật khẩu xác nhận không khớp";
    if (!form.position.trim()) e.position = "Chức vụ là bắt buộc";
    if (form.phone && !/^(0[3|5|7|8|9])[0-9]{8}$/.test(form.phone))
      e.phone = "SĐT không hợp lệ (0XXXXXXXXX)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ user: AuthUser }>("/api/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        position: form.position.trim(),
        phone: form.phone.trim(),
      });
      setUser(res.user);
      toast.success("Đăng ký thành công! Chào mừng bạn 🎉");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors);
      }
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
          role="status"
          aria-label="Đang tải"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <CheckSquare size={22} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Team Manager</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white leading-tight">
            Tham gia team
            <br />
            ngay hôm nay
          </h1>
          <p className="mt-4 text-slate-400 text-base max-w-md leading-relaxed">
            Tạo tài khoản miễn phí để bắt đầu theo dõi công việc, cập nhật
            tiến độ và kết nối với team của bạn.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "Theo dõi task và tiến độ realtime",
              "Nhận thông báo khi được giao việc",
              "Xem đánh giá hiệu suất cá nhân",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-emerald-400" />
                </div>
                <span className="text-sm text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-500">© 2026 Team Manager</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-start justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-sm py-4">
          {/* Mobile logo */}
          <div className="mb-6 lg:hidden flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <CheckSquare size={18} className="text-white" />
            </div>
            <span className="text-base font-semibold text-slate-900">
              Team Manager
            </span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={20} className="text-slate-700" />
            <h2 className="text-2xl font-semibold text-slate-900">Đăng ký</h2>
          </div>
          <p className="text-sm text-slate-500 mb-8">
            Tạo tài khoản thành viên mới
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="name"
              label="Họ tên *"
              placeholder="Nguyễn Văn A"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              autoComplete="name"
              aria-required="true"
            />

            <Input
              id="email"
              label="Email *"
              type="email"
              placeholder="email@team.vn"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              autoComplete="email"
              aria-required="true"
            />

            {/* Password field */}
            <div>
              <div className="relative">
                <Input
                  id="password"
                  label="Mật khẩu *"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  error={errors.password}
                  autoComplete="new-password"
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength indicators */}
              {form.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <div
                        key={rule.label}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0",
                            ok
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {ok ? <Check size={10} /> : <X size={10} />}
                        </div>
                        <span
                          className={cn(
                            "text-xs",
                            ok ? "text-emerald-700" : "text-slate-500"
                          )}
                        >
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="relative">
              <Input
                id="confirmPassword"
                label="Xác nhận mật khẩu *"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                error={errors.confirmPassword}
                autoComplete="new-password"
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Input
              id="position"
              label="Chức vụ *"
              placeholder="Frontend Developer"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              error={errors.position}
              aria-required="true"
            />

            <Input
              id="phone"
              label="Số điện thoại"
              type="tel"
              placeholder="0901234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.phone}
              autoComplete="tel"
            />

            {/* General error */}
            {errors.form && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
              >
                {errors.form}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              size="lg"
            >
              {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="font-medium text-slate-900 hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
