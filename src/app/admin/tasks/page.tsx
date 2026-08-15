"use client";

import { useState, FormEvent, useMemo, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckSquare,
  Check,
  X,
  Download,
  FileDown,
  Star,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Task, TaskPriority, TaskReport } from "@/types";
import { ApiError } from "@/lib/api-client";
import { exportTasksPDF, exportTasksCSV } from "@/lib/export";
import { TaskThread } from "@/components/tasks/TaskThread";
import {
  formatDate,
  priorityLabel,
  priorityColor,
  statusLabel,
  statusColor,
  isOverdue,
  cn,
} from "@/lib/utils";

const PAGE_SIZE = 8;

const emptyForm = {
  title: "",
  description: "",
  assigneeId: "",
  priority: "medium" as TaskPriority,
  dueDate: "",
};

function TasksContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const {
    tasks,
    members,
    loading,
    getUser,
    addTask,
    updateTask,
    deleteTask,
    approveRejection,
    denyRejection,
    getReports,
  } = useStore();

  const initialStatus = searchParams.get("status") || "all";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [evalTaskId, setEvalTaskId] = useState<string | null>(null);
  const [viewReportsTask, setViewReportsTask] = useState<Task | null>(null);
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "all");
  }, [searchParams]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch =
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned"
          ? !t.assigneeId
          : t.assigneeId === assigneeFilter);
      const matchPriority =
        priorityFilter === "all" || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchAssignee && matchPriority;
    });
  }, [tasks, debouncedSearch, statusFilter, assigneeFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  // Reset to page 1 when filters change or total pages decreases
  useEffect(() => {
    setPage((prev) => (prev > totalPages ? 1 : prev));
  }, [totalPages]);

  const openCreate = () => {
    setEditing(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    setForm({
      ...emptyForm,
      dueDate: tomorrow.toISOString().slice(0, 10),
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId || "",
      priority: task.priority,
      dueDate: task.dueDate.slice(0, 10),
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Bắt buộc";
    if (!form.dueDate) e.dueDate = "Bắt buộc";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateTask(editing.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          assigneeId: form.assigneeId || null,
          priority: form.priority,
          dueDate: new Date(form.dueDate).toISOString(),
        });
        toast.success("Cập nhật task thành công");
      } else {
        await addTask({
          title: form.title.trim(),
          description: form.description.trim(),
          assigneeId: form.assigneeId || null,
          priority: form.priority,
          dueDate: new Date(form.dueDate).toISOString(),
        });
        toast.success("Tạo task thành công");
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await deleteTask(deleteId);
      toast.success("Đã xóa task");
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveRejection(id);
      toast.success("Đã duyệt hủy task");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thất bại");
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await denyRejection(id);
      toast.success("Đã từ chối yêu cầu hủy — task trở lại chờ xác nhận");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thất bại");
    }
  };

  const handleViewReports = async (task: Task) => {
    setViewReportsTask(task);
    setReportsLoading(true);
    try { const data = await getReports(task.id); setTaskReports(data); }
    catch { setTaskReports([]); }
    finally { setReportsLoading(false); }
  };

  const handleExportPDF = async () => {
    try {
      await exportTasksPDF({
        tasks: filtered,
        getUser,
        period: {},
      });
      toast.success("Đã xuất báo cáo PDF");
    } catch {
      toast.error("Xuất PDF thất bại");
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportTasksCSV(filtered, getUser);
      toast.success("Đã xuất file CSV");
    } catch {
      toast.error("Xuất CSV thất bại");
    }
  };

  const statusTabs: { value: string; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "pending", label: "Chờ phản hồi" },
    { value: "in_progress", label: "Đang làm" },
    { value: "completed", label: "Hoàn thành" },
    { value: "rejection_pending", label: "Chờ duyệt hủy" },
    { value: "cancelled", label: "Đã hủy" },
  ];

  return (
    <div>
      <PageHeader
        title="Công việc"
        description={`${tasks.length} task · ${filtered.length} khớp bộ lọc`}
        action={
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="secondary" size="sm">
              <FileDown size={14} />
              PDF
            </Button>
            <Button onClick={handleExportCSV} variant="secondary" size="sm">
              <Download size={14} />
              CSV
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus size={16} />
              Tạo task
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Tìm task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm task"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <Select
            id="filter-assignee"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="sm:w-48"
            options={[
              { value: "all", label: "Tất cả người nhận" },
              { value: "unassigned", label: "Chưa giao" },
              ...members
                .filter((m) => m.isActive)
                .map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <Select
            id="filter-priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="sm:w-40"
            options={[
              { value: "all", label: "Mọi ưu tiên" },
              { value: "urgent", label: "Khẩn cấp" },
              { value: "high", label: "Cao" },
              { value: "medium", label: "Trung bình" },
              { value: "low", label: "Thấp" },
            ]}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                statusFilter === tab.value
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <TableSkeleton rows={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={CheckSquare}
            title="Không có task nào"
            description={
              search ||
              statusFilter !== "all" ||
              assigneeFilter !== "all" ||
              priorityFilter !== "all"
                ? "Thử đổi bộ lọc"
                : "Tạo task đầu tiên cho team"
            }
            action={
              !search &&
              statusFilter === "all" &&
              assigneeFilter === "all" &&
              priorityFilter === "all" ? (
                <Button onClick={openCreate} size="sm">
                  <Plus size={16} /> Tạo task
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((task) => {
            const assignee = task.assigneeId
              ? getUser(task.assigneeId)
              : null;
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <button
                        type="button"
                        onClick={() => setDetailTask(task)}
                        className="text-sm font-semibold text-slate-900 hover:underline text-left cursor-pointer"
                      >
                        {task.title}
                      </button>
                      <Badge className={priorityColor[task.priority]}>
                        {priorityLabel[task.priority]}
                      </Badge>
                      <Badge className={statusColor[task.status]}>
                        {statusLabel[task.status]}
                      </Badge>
                      {overdue && (
                        <Badge className="bg-red-50 text-red-700 border-red-200">
                          Quá hạn
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      {assignee ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar
                            name={assignee.name}
                            size="sm"
                            className="!h-5 !w-5 !text-[10px]"
                          />
                          {assignee.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa giao</span>
                      )}
                      <span>Hạn: {formatDate(task.dueDate)}</span>
                      {task.status === "in_progress" && (
                        <div className="w-28">
                          <ProgressBar value={task.progress} size="sm" />
                        </div>
                      )}
                    </div>

                    {task.status === "rejection_pending" && (
                      <div className="mt-3 rounded-lg bg-orange-50 border border-orange-100 p-3">
                        <p className="text-xs text-orange-800 mb-2">
                          <span className="font-medium">Lý do từ chối:</span>{" "}
                          {task.rejectionReason}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApprove(task.id)}
                          >
                            <Check size={14} /> Duyệt hủy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeny(task.id)}
                          >
                            <X size={14} /> Từ chối yêu cầu
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleViewReports(task)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                      title="Xem báo cáo"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                      title="Sửa"
                      aria-label={`Sửa ${task.title}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(task.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      title="Xóa"
                      aria-label={`Xóa ${task.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Pagination
              page={pageSafe}
              totalPages={totalPages}
              total={filtered.length}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Sửa task" : "Tạo task mới"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="title"
            label="Tiêu đề"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            error={errors.title}
            placeholder="Tên công việc"
          />
          <Textarea
            id="description"
            label="Mô tả"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
            placeholder="Chi tiết công việc..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="assignee"
              label="Giao cho"
              value={form.assigneeId}
              onChange={(e) =>
                setForm({ ...form, assigneeId: e.target.value })
              }
              options={[
                { value: "", label: "— Chưa giao —" },
                ...members
                  .filter((m) => m.isActive)
                  .map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.position})`,
                  })),
              ]}
            />
            <Select
              id="priority"
              label="Độ ưu tiên"
              value={form.priority}
              onChange={(e) =>
                setForm({
                  ...form,
                  priority: e.target.value as TaskPriority,
                })
              }
              options={[
                { value: "low", label: "Thấp" },
                { value: "medium", label: "Trung bình" },
                { value: "high", label: "Cao" },
                { value: "urgent", label: "Khẩn cấp" },
              ]}
            />
          </div>
          <Input
            id="dueDate"
            label="Hạn hoàn thành"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            error={errors.dueDate}
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
              {submitting
                ? "Đang lưu..."
                : editing
                  ? "Lưu thay đổi"
                  : "Tạo task"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal — xl with side-by-side layout */}
      <Modal
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        title={detailTask?.title || "Chi tiết task"}
        size="xl"
      >
        {detailTask && (
          <div className="flex gap-5 min-h-0" style={{ height: "60vh" }}>
            {/* Left: task info */}
            <div className="w-72 shrink-0 space-y-4 overflow-y-auto pr-3 border-r border-slate-100">
              <div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={priorityColor[detailTask.priority]}>
                    {priorityLabel[detailTask.priority]}
                  </Badge>
                  <Badge className={statusColor[detailTask.status]}>
                    {statusLabel[detailTask.status]}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {detailTask.description || "Không có mô tả"}
              </p>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Người nhận</p>
                  {detailTask.assigneeId ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={getUser(detailTask.assigneeId)?.name || "?"}
                        size="sm"
                      />
                      <span className="text-slate-900">
                        {getUser(detailTask.assigneeId)?.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Chưa giao</span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Hạn</p>
                  <p className="text-slate-900">{formatDate(detailTask.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tiến độ</p>
                  <ProgressBar value={detailTask.progress} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ngày tạo</p>
                  <p className="text-slate-900">{formatDate(detailTask.createdAt)}</p>
                </div>
              </div>
              {detailTask.rejectionReason && (
                <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                  <p className="text-xs font-medium text-orange-800 mb-1">Lý do từ chối</p>
                  <p className="text-sm text-orange-700">{detailTask.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Right: thread chat */}
            <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-slate-100">
              <TaskThread
                taskId={detailTask.id}
                taskTitle={detailTask.title}
                canEvaluate={detailTask.assigneeId !== null}
                onEvaluate={() => setEvalTaskId(detailTask.id)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Eval quick modal */}
      {evalTaskId && (() => {
        const t = tasks.find(x => x.id === evalTaskId);
        return (
          <Modal
            open={!!evalTaskId}
            onClose={() => setEvalTaskId(null)}
            title="Đánh giá thành viên"
            size="sm"
          >
            <EvalQuickForm
              taskId={evalTaskId}
              assigneeId={t?.assigneeId || ""}
              onDone={() => setEvalTaskId(null)}
            />
          </Modal>
        );
      })()}

      {/* Delete confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xác nhận xóa"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Bạn có chắc muốn xóa task này? Hành động không thể hoàn tác.
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

      {/* View Reports Modal */}
      <Modal
        open={!!viewReportsTask}
        onClose={() => { setViewReportsTask(null); setTaskReports([]); }}
        title={`Báo cáo: ${viewReportsTask?.title}`}
        size="md"
      >
        {reportsLoading ? (
          <div className="py-8 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          </div>
        ) : taskReports.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Thành viên chưa nộp báo cáo nào</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {taskReports.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">Báo cáo #{i + 1}</span>
                  <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}


// ─── EvalQuickForm ─────────────────────────────────────────────────────────
function EvalQuickForm({
  taskId,
  assigneeId,
  onDone,
}: {
  taskId: string;
  assigneeId: string;
  onDone: () => void;
}) {
  const { addEvaluation, members } = useStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const member = members.find((m) => m.id === assigneeId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) { setError("Nhập nhận xét"); return; }
    setLoading(true);
    try {
      await addEvaluation({ memberId: assigneeId, taskId, rating, comment: comment.trim() });
      toast.success("Đã thêm đánh giá");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {member && (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <Avatar name={member.name} size="sm" />
          <div>
            <p className="text-sm font-medium text-slate-900">{member.name}</p>
            <p className="text-xs text-slate-500">{member.position}</p>
          </div>
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Điểm đánh giá</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)} className="p-1 cursor-pointer">
              <Star size={24} className={cn(s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300")} />
            </button>
          ))}
          <span className="ml-2 text-sm text-slate-600">{rating}/5</span>
        </div>
      </div>
      <Textarea
        id="eval-comment"
        label="Nhận xét"
        value={comment}
        onChange={(e) => { setComment(e.target.value); setError(""); }}
        error={error}
        rows={3}
        placeholder="Nhận xét về hiệu suất làm việc..."
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone}>Hủy</Button>
        <Button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Lưu đánh giá"}</Button>
      </div>
    </form>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}

