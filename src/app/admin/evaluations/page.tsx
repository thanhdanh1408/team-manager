"use client";

import { useState, FormEvent, useMemo, useEffect } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { formatDate, cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export default function EvaluationsPage() {
  const { user } = useAuth();
  const {
    evaluations,
    members,
    tasks,
    loading,
    getUser,
    addEvaluation,
    deleteEvaluation,
    getAverageRating,
  } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    taskId: "",
    rating: 5,
    comment: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const sorted = useMemo(
    () =>
      [...evaluations].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [evaluations]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  // Reset to page 1 when evaluations count changes
  useEffect(() => {
    setPage((prev) => (prev > totalPages ? 1 : prev));
  }, [totalPages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.memberId) errs.memberId = "Chọn thành viên";
    if (!form.comment.trim()) errs.comment = "Nhập nhận xét";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !user) return;

    setSubmitting(true);
    try {
      await addEvaluation({
        memberId: form.memberId,
        taskId: form.taskId || undefined,
        rating: form.rating,
        comment: form.comment.trim(),
      });
      toast.success("Đã thêm đánh giá");
      setModalOpen(false);
      setForm({ memberId: "", taskId: "", rating: 5, comment: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thêm đánh giá thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await deleteEvaluation(deleteId);
      toast.success("Đã xóa đánh giá");
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const memberTasks = form.memberId
    ? tasks.filter(
        (t) =>
          t.assigneeId === form.memberId &&
          (t.status === "completed" || t.status === "in_progress")
      )
    : [];

  return (
    <div>
      <PageHeader
        title="Đánh giá"
        description={`${evaluations.length} đánh giá đã ghi nhận`}
        action={
          <Button
            onClick={() => {
              setForm({ memberId: "", taskId: "", rating: 5, comment: "" });
              setErrors({});
              setModalOpen(true);
            }}
            size="sm"
          >
            <Plus size={16} />
            Thêm đánh giá
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {members
          .filter((m) => m.isActive)
          .map((m) => {
            const avg = getAverageRating(m.id);
            return (
              <div
                key={m.id}
                className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3"
              >
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {m.name}
                  </p>
                  <p className="text-xs text-slate-500">{m.position}</p>
                  <p className="text-sm mt-0.5">
                    {avg > 0 ? (
                      <span className="text-amber-600 font-semibold">
                        ★ {avg.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        Chưa đánh giá
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <TableSkeleton rows={4} />
        </div>
      ) : evaluations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Star}
            title="Chưa có đánh giá nào"
            description="Thêm đánh giá cho thành viên trong team"
            action={
              <Button onClick={() => setModalOpen(true)} size="sm">
                <Plus size={16} /> Thêm đánh giá
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((ev) => {
            const member = getUser(ev.memberId);
            const evaluator = getUser(ev.evaluatorId);
            const task = ev.taskId
              ? tasks.find((t) => t.id === ev.taskId)
              : null;
            return (
              <div
                key={ev.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={member?.name || "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {member?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Đánh giá bởi {evaluator?.name} ·{" "}
                          {formatDate(ev.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              className={cn(
                                s <= ev.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-200"
                              )}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteId(ev.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          aria-label="Xóa đánh giá"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {ev.comment}
                    </p>
                    {task && (
                      <p className="mt-1.5 text-xs text-slate-400">
                        Task: {task.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Pagination
              page={pageSafe}
              totalPages={totalPages}
              total={sorted.length}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thêm đánh giá"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            id="member"
            label="Thành viên"
            value={form.memberId}
            onChange={(e) =>
              setForm({ ...form, memberId: e.target.value, taskId: "" })
            }
            error={errors.memberId}
            options={[
              { value: "", label: "— Chọn thành viên —" },
              ...members
                .filter((m) => m.isActive)
                .map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <Select
            id="task"
            label="Task liên quan (tuỳ chọn)"
            value={form.taskId}
            onChange={(e) => setForm({ ...form, taskId: e.target.value })}
            options={[
              { value: "", label: "— Không chọn —" },
              ...memberTasks.map((t) => ({ value: t.id, label: t.title })),
            ]}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Điểm đánh giá
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, rating: s })}
                  className="p-1 cursor-pointer"
                  aria-label={`${s} sao`}
                >
                  <Star
                    size={24}
                    className={cn(
                      s <= form.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 hover:text-amber-300"
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-slate-600">
                {form.rating}/5
              </span>
            </div>
          </div>
          <Textarea
            id="comment"
            label="Nhận xét"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            error={errors.comment}
            rows={3}
            placeholder="Nhận xét về hiệu suất làm việc..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu đánh giá"}
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
          Xóa đánh giá này? Hành động không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? "Đang xóa..." : "Xóa"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
