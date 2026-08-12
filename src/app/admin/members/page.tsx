"use client";

import { useState, FormEvent, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/hooks/useStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { User } from "@/types";
import { ApiError } from "@/lib/api-client";

const PAGE_SIZE = 10;


const emptyForm = {
  name: "",
  email: "",
  password: "",
  position: "",
  phone: "",
  isActive: true,
};

export default function MembersPage() {
  const {
    members,
    loading,
    addUser,
    updateUser,
    deleteUser,
    getAverageRating,
    getTasksByAssignee,
  } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          m.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.position.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [members, debouncedSearch]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  // Reset to page 1 when search changes or total pages decreases
  useEffect(() => {
    setPage((prev) => (prev > totalPages ? 1 : prev));
  }, [totalPages]);


  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      position: user.position,
      phone: user.phone,
      isActive: user.isActive,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Tên tối thiểu 2 ký tự";
    if (!form.email.trim()) e.email = "Bắt buộc";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email không hợp lệ";
    if (!editing) {
      if (!form.password) e.password = "Bắt buộc";
      else if (form.password.length < 8)
        e.password = "Mật khẩu tối thiểu 8 ký tự";
      else if (!/[A-Z]/.test(form.password)) e.password = "Cần ít nhất 1 chữ hoa";
      else if (!/[0-9]/.test(form.password)) e.password = "Cần ít nhất 1 số";
      else if (!/[^A-Za-z0-9]/.test(form.password))
        e.password = "Cần ít nhất 1 ký tự đặc biệt";
    } else if (form.password) {
      if (form.password.length < 8) e.password = "Mật khẩu tối thiểu 8 ký tự";
    }
    if (!form.position.trim()) e.position = "Bắt buộc";
    if (form.phone && !/^(0[3|5|7|8|9])[0-9]{8}$/.test(form.phone)) {
      e.phone = "SĐT không hợp lệ (0XXXXXXXXX)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateUser(editing.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          ...(form.password ? { password: form.password } : {}),
          position: form.position.trim(),
          phone: form.phone.trim(),
          isActive: form.isActive,
        });
        toast.success("Cập nhật thành viên thành công");
      } else {
        await addUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          position: form.position.trim(),
          phone: form.phone.trim(),
          role: "member",
          isActive: true,
        });
        toast.success("Thêm thành viên thành công");
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors);
      }
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await deleteUser(deleteId);
      toast.success("Đã xóa thành viên");
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Thành viên"
        description={`${members.length} thành viên trong team`}
        action={
          <Button onClick={openCreate} size="sm">
            <Plus size={16} />
            Thêm thành viên
          </Button>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Tìm theo tên, email, vị trí..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm thành viên"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <TableSkeleton rows={5} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Users}
            title="Không tìm thấy thành viên"
            description={
              search
                ? "Thử tìm với từ khóa khác"
                : "Thêm thành viên đầu tiên cho team"
            }
            action={
              !search ? (
                <Button onClick={openCreate} size="sm">
                  <Plus size={16} /> Thêm thành viên
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3 text-left font-medium text-slate-500">
                    Thành viên
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 hidden md:table-cell">
                    Vị trí
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 hidden lg:table-cell">
                    Task
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">
                    Đánh giá
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500">
                    Trạng thái
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((m) => {
                  const memberTasks = getTasksByAssignee(m.id);
                  const rating = getAverageRating(m.id);
                  return (

                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900">
                              {m.name}
                            </p>
                            <p className="text-xs text-slate-500">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 hidden md:table-cell">
                        {m.position}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 hidden lg:table-cell">
                        {memberTasks.length} task
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {rating > 0 ? (
                          <span className="text-amber-600 font-medium">
                            ★ {rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          className={
                            m.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        >
                          {m.isActive ? "Hoạt động" : "Ngừng HĐ"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
                            aria-label={`Sửa ${m.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(m.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-300"
                            aria-label={`Xóa ${m.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <Pagination
              page={pageSafe}
              totalPages={totalPages}
              total={filtered.length}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Sửa thành viên" : "Thêm thành viên"}
      >

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Họ tên"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="Nguyễn Văn A"
          />
          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            placeholder="email@team.vn"
          />
          <Input
            id="password"
            label={editing ? "Mật khẩu (để trống nếu không đổi)" : "Mật khẩu"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            placeholder="••••••••"
          />
          <Input
            id="position"
            label="Vị trí"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            error={errors.position}
            placeholder="Frontend Developer"
          />
          <Input
            id="phone"
            label="Số điện thoại"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
            placeholder="0901234567"
          />
          {editing && (
            <Select
              id="isActive"
              label="Trạng thái"
              value={form.isActive ? "true" : "false"}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.value === "true" })
              }
              options={[
                { value: "true", label: "Hoạt động" },
                { value: "false", label: "Ngừng hoạt động" },
              ]}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Đang lưu..."
                : editing
                  ? "Lưu thay đổi"
                  : "Thêm"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xác nhận xóa"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Bạn có chắc muốn xóa thành viên này? Các task được giao sẽ bị hủy
          gán. Hành động không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? "Đang xóa..." : "Xóa"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
