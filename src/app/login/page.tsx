"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.role === "admin" ? "/admin" : "/member");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setError(result.error || "Đăng nhập thất bại");
        toast.error(result.error || "Đăng nhập thất bại");
        return;
      }
      toast.success("Đăng nhập thành công");
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = (role: "admin" | "member") => {
    if (role === "admin") {
      setEmail("admin@team.vn");
      setPassword("Admin@123");
    } else {
      setEmail("mai@team.vn");
      setPassword("Member@123");
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
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <CheckSquare size={22} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Team Manager</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white leading-tight">
            Quản lý team
            <br />
            hiệu quả hơn
          </h1>
          <p className="mt-4 text-slate-400 text-base max-w-md leading-relaxed">
            Theo dõi công việc, đánh giá thành viên và cập nhật tiến độ realtime
            — tất cả trong một nền tảng.
          </p>
        </div>
        <p className="text-sm text-slate-500">© 2026 Team Manager</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <CheckSquare size={18} className="text-white" />
            </div>
            <span className="text-base font-semibold text-slate-900">
              Team Manager
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">Đăng nhập</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Nhập thông tin tài khoản để tiếp tục
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="email@team.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-required="true"
            />

            <div className="relative">
              <Input
                id="password"
                label="Mật khẩu"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 rounded"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              size="lg"
            >
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="font-medium text-slate-900 hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </form>

          {process.env.NODE_ENV !== "production" && (
            <div className="mt-8">
              <p className="text-xs text-slate-400 text-center mb-3">
                Tài khoản demo — bấm để điền sẵn
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickLogin("admin")}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <p className="text-xs font-medium text-slate-900">Admin</p>
                  <p className="text-xs text-slate-500 mt-0.5">admin@team.vn</p>
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin("member")}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <p className="text-xs font-medium text-slate-900">Thành viên</p>
                  <p className="text-xs text-slate-500 mt-0.5">mai@team.vn</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
