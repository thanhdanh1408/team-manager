"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";
import type { User, AuthUser } from "@/types";

export default function MemberProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    position: "",
    password: "",
    confirm: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<User>("/api/profile")
      .then((u) =>
        setForm((f) => ({
          ...f,
          name: u.name,
          phone: u.phone || "",
          position: u.position || "",
        }))
      )
      .catch(() => toast.error("Không tải được hồ sơ"));
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<{ user: User; authUser: AuthUser }>(
        "/api/profile",
        {
          name: form.name,
          phone: form.phone,
          position: form.position,
          password: form.password || undefined,
        }
      );
      setUser(res.authUser);
      setForm((f) => ({ ...f, password: "", confirm: "" }));
      toast.success("Đã cập nhật hồ sơ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Hồ sơ"
        description="Cập nhật thông tin tài khoản của bạn"
      />
      <form
        onSubmit={onSubmit}
        className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <Input
          label="Họ tên"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input label="Email" value={user?.email || ""} disabled />
        <Input
          label="Chức vụ"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
        />
        <Input
          label="Số điện thoại"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            Đổi mật khẩu (để trống nếu không đổi)
          </p>
          <div className="space-y-3">
            <Input
              label="Mật khẩu mới"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
            <Input
              label="Xác nhận mật khẩu"
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button type="submit" loading={saving}>
          Lưu thay đổi
        </Button>
      </form>
    </div>
  );
}
