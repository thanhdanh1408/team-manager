"use client";

import { useState, FormEvent, useMemo, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Star,
  ClipboardList,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { User } from "@/types";
import { ApiError } from "@/lib/api-client";
import {
  formatDate,
  priorityLabel,
  priorityColor,
  statusLabel,
  statusColor,
  cn,
} from "@/lib/utils";

const PAGE_SIZE = 10;

const emptyForm = {
  name: "",
  email: "",
  password: "",
  position: "",
  phone: "",
  isActive: true,
};

type MemberTab = "tasks" | "evaluations";

export default function MembersPage() {
  const { user: currentUser } = useAuth();
  const {
    members,
    tasks,
    loading,
    addUser,
    updateUser,
    deleteUser,
    getAverageRating,
    getTasksByAssignee,
    getEvaluationsByMember,
    addEvaluation,
    deleteEvaluation,
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

  // Member detail state
  const [detailMember, setDetailMember] = useState<User | null>(null);
  const [memberTab, setMemberTab] = useState<MemberTab>("tasks");

  // Evaluation form
  const [evalForm, setEvalForm] = useState({
    taskId: "",
    rating: 5,
    comment: "",
  });
  const [evalErrors, setEvalErrors] = useState<Record<string, string>>({});
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [evalDeleteId, setEvalDeleteId] = useState<string | null>(null);

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

  useEffect(() => {
    setPage((prev) => (prev > totalPages ? 1 : prev));
  }, [totalPages]);

  // Sync detailMember when members list updates
  useEffect(() => {
    if (detailMember) {
      const updated = members.find((m) => m.id === detailMember.id);
      if (updated) setDetailMember(updated);
    }
  }, [members, detailMember]);

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

  // Evaluation handlers
  const memberTasks = useMemo(
    () =>
      detailMember
        ? tasks.filter(
            (t) =>
              t.assigneeId === detailMember.id &&
              (t.status === "completed" || t.status === "in_progress")
          )
        : [],
    [detailMember, tasks]
  );

  const memberEvals = useMemo(
    () =>
      detailMember ? getEvaluationsByMember(detailMember.id) : [],
    [detailMember, getEvaluationsByMember]
  );

  const handleAddEval = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!evalForm.comment.trim()) errs.comment = "Nhập nhận xét";
    setEvalErrors(errs);
    if (Object.keys(errs).length > 0 || !detailMember || !currentUser) return;

    setEvalSubmitting(true);
    try {
      await addEvaluation({
        memberId: detailMember.id,
        taskId: evalForm.taskId || undefined,
        rating: evalForm.rating,
        comment: evalForm.comment.trim(),
      });
      toast.success("Đã thêm đánh giá");
      setEvalForm({ taskId: "", rating: 5, comment: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thêm đánh giá thất bại");
    } finally {
      setEvalSubmitting(false);
    }
  };

  const handleDeleteEval = async () => {
    if (!evalDeleteId) return;
    setEvalSubmitting(true);
    try {
      await deleteEvaluation(evalDeleteId);
      toast.success("Đã xóa đánh giá");
      setEvalDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setEvalSubmitting(false);
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
                        <button
                          type="button"
                          onClick={() => {
                            setDetailMember(m);
                            setMemberTab("tasks");
                          }}
                          className="flex items-center gap-3 text-left group cursor-pointer"
                        >
                          <Avatar name={m.name} size="sm" />
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-slate-700">
                              {m.name}
                            </p>
                            <p className="text-xs text-slate-500">{m.email}</p>
                          </div>
                          <ChevronRight
                            size={14}
                            className="text-slate-300 group-hover:text-slate-500 transition-colors"
                          />
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 hidden md:table-cell">
                        {m.position}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 hidden lg:table-cell">
                        <div className="flex gap-2">
                          <span className="text-slate-700">
                            {memberTasks.length} task
                          </span>
                          <span className="text-emerald-600 text-xs">
                            ({memberTasks.filter((t) => t.status === "completed").length} xong)
                          </span>
                        </div>
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

      {/* ─── Member Detail Modal ─── */}
      <Modal
        open={!!detailMember}
        onClose={() => setDetailMember(null)}
        title={detailMember?.name || "Chi tiết thành viên"}
        size="lg"
      >
        {detailMember && (
          <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-100">
              <Avatar name={detailMember.name} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  {detailMember.name}
                </h3>
                <p className="text-sm text-slate-500">{detailMember.position}</p>
                <p className="text-xs text-slate-400">{detailMember.email}</p>
              </div>
              <div className="text-right shrink-0">
                {getAverageRating(detailMember.id) > 0 ? (
                  <div>
                    <p className="text-2xl font-bold text-amber-500">
                      ★ {getAverageRating(detailMember.id).toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {getEvaluationsByMember(detailMember.id).length} đánh giá
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Chưa đánh giá</p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-slate-100 pb-0">
              <button
                type="button"
                onClick={() => setMemberTab("tasks")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
                  memberTab === "tasks"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <ClipboardList size={15} />
                Công việc
                <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {getTasksByAssignee(detailMember.id).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMemberTab("evaluations")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
                  memberTab === "evaluations"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <Star size={15} />
                Đánh giá
                <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {getEvaluationsByMember(detailMember.id).length}
                </span>
              </button>
            </div>

            {/* Tab: Tasks */}
            {memberTab === "tasks" && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {getTasksByAssignee(detailMember.id).length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Chưa có task nào được giao
                  </p>
                ) : (
                  getTasksByAssignee(detailMember.id).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium text-slate-900 flex-1 min-w-0 truncate">
                          {task.title}
                        </p>
                        <Badge className={priorityColor[task.priority]}>
                          {priorityLabel[task.priority]}
                        </Badge>
                        <Badge className={statusColor[task.status]}>
                          {statusLabel[task.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Hạn: {formatDate(task.dueDate)}</span>
                        {task.status === "in_progress" && (
                          <div className="flex items-center gap-2 flex-1">
                            <ProgressBar value={task.progress} size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Evaluations */}
            {memberTab === "evaluations" && (
              <div className="space-y-4">
                {/* Add evaluation form */}
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">
                    Thêm đánh giá mới
                  </h4>
                  <form onSubmit={handleAddEval} className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Task liên quan (tuỳ chọn)
                      </label>
                      <select
                        value={evalForm.taskId}
                        onChange={(e) =>
                          setEvalForm({ ...evalForm, taskId: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="">— Không chọn —</option>
                        {memberTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Điểm đánh giá
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEvalForm({ ...evalForm, rating: s })}
                            className="p-1 cursor-pointer"
                            aria-label={`${s} sao`}
                          >
                            <Star
                              size={22}
                              className={
                                s <= evalForm.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300 hover:text-amber-300"
                              }
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-slate-600">
                          {evalForm.rating}/5
                        </span>
                      </div>
                    </div>
                    <div>
                      <Textarea
                        id="eval-comment"
                        label="Nhận xét"
                        value={evalForm.comment}
                        onChange={(e) =>
                          setEvalForm({ ...evalForm, comment: e.target.value })
                        }
                        error={evalErrors.comment}
                        rows={2}
                        placeholder="Nhận xét về hiệu suất làm việc..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={evalSubmitting}>
                        {evalSubmitting ? "Đang lưu..." : "Lưu đánh giá"}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* List evaluations */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {memberEvals.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">
                      Chưa có đánh giá nào
                    </p>
                  ) : (
                    memberEvals.map((ev) => {
                      const linkedTask = ev.taskId
                        ? tasks.find((t) => t.id === ev.taskId)
                        : null;
                      return (
                        <div
                          key={ev.id}
                          className="rounded-lg border border-slate-100 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    size={13}
                                    className={
                                      s <= ev.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-200"
                                    }
                                  />
                                ))}
                                <span className="text-xs text-slate-500 ml-1">
                                  {formatDate(ev.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {ev.comment}
                              </p>
                              {linkedTask && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Task: {linkedTask.title}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setEvalDeleteId(ev.id)}
                              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 cursor-pointer shrink-0"
                              aria-label="Xóa đánh giá"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
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

      {/* Delete member confirm */}
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

      {/* Delete eval confirm */}
      <Modal
        open={!!evalDeleteId}
        onClose={() => setEvalDeleteId(null)}
        title="Xóa đánh giá"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Xóa đánh giá này? Hành động không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEvalDeleteId(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteEval}
            disabled={evalSubmitting}
          >
            {evalSubmitting ? "Đang xóa..." : "Xóa"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
