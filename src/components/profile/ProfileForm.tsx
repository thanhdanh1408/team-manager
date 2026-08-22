"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";
import type { AuthUser, User } from "@/types";

const initialForm = {
  name: "", phone: "", position: "", avatar: "", bio: "",
  department: "", location: "", dateOfBirth: "", password: "", confirm: "",
};

export function ProfileForm({ description }: { description: string }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    api.get<User>("/api/profile").then((profile) => setForm({
      ...initialForm,
      name: profile.name,
      phone: profile.phone || "",
      position: profile.position || "",
      avatar: profile.avatar || "",
      bio: profile.bio || "",
      department: profile.department || "",
      location: profile.location || "",
      dateOfBirth: profile.dateOfBirth || "",
    })).catch(() => toast.error("Không tải được hồ sơ"));
  }, [user]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", "avatar");
      const response = await fetch("/api/upload", { method: "POST", body, credentials: "include" });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Tải ảnh đại diện thất bại");
      setForm((previous) => ({ ...previous, avatar: result.url! }));
      toast.success("Đã tải ảnh, hãy bấm Lưu thay đổi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tải ảnh đại diện thất bại");
    } finally {
      setUploading(false);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.password && form.password !== form.confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setSaving(true);
    try {
      const response = await api.put<{ user: User; authUser: AuthUser }>("/api/profile", {
        name: form.name, phone: form.phone, position: form.position,
        avatar: form.avatar, bio: form.bio, department: form.department,
        location: form.location, dateOfBirth: form.dateOfBirth,
        password: form.password || undefined,
      });
      setUser(response.authUser);
      setForm((previous) => ({ ...previous, password: "", confirm: "" }));
      toast.success("Đã cập nhật hồ sơ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return <div>
    <PageHeader title="Hồ sơ" description={description} />
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <Avatar name={form.name || user?.name || "User"} src={form.avatar} size="lg" className="h-20 w-20" />
        <div>
          <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={uploadAvatar} />
          <Button type="button" variant="outline" onClick={() => avatarInput.current?.click()} disabled={uploading}>
            <Camera size={15} /> {uploading ? "Đang tải..." : "Chọn ảnh đại diện"}
          </Button>
          <p className="mt-1.5 text-xs text-slate-400">JPG, PNG, GIF hoặc WebP, tối đa 10 MB</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="name" label="Họ tên" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Input id="email" label="Email" value={user?.email || ""} disabled />
        <Input id="position" label="Chức vụ" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
        <Input id="department" label="Phòng ban" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} placeholder="Ví dụ: Kỹ thuật" />
        <Input id="phone" label="Số điện thoại" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <Input id="date-of-birth" label="Ngày sinh" type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
      </div>
      <Input id="location" label="Địa điểm" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Tỉnh/thành phố" />
      <Textarea id="bio" label="Giới thiệu bản thân" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={4} placeholder="Kỹ năng, kinh nghiệm và thông tin bạn muốn chia sẻ..." />
      <div className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Đổi mật khẩu (để trống nếu không đổi)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="new-password" label="Mật khẩu mới" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" />
          <Input id="confirm-password" label="Xác nhận mật khẩu" type="password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} autoComplete="new-password" />
        </div>
      </div>
      <Button type="submit" loading={saving}>Lưu thay đổi</Button>
    </form>
  </div>;
}
