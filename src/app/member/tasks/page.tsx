"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, X, ClipboardList, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Task } from "@/types";
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

export default function MemberTasksPage() {
  const { user } = useAuth();
  const {
    loading,
    getTasksByAssignee,
    acceptTask,
    rejectTask,
    updateProgress,
  } = useStore();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [progressTask, setProgressTask] = useState<Task | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const myTasks = useMemo(
    () => (user ? getTasksByAssignee(user.id) : []),
    [user, getTasksByAssignee]
  );

  const filtered = useMemo(() => {
    return myTasks.filter((t) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch =
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [myTasks, debouncedSearch, statusFilter]);

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

  if (!user) return null;


  const handleAccept = async (taskId: string) => {
    setSubmitting(true);
    try {
      await acceptTask(taskId);
      toast.success("Đã đồng ý nhận task");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể nhận task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("Vui lòng nhập lý do từ chối");
      return;
    }
    if (!rejectTaskId) return;
    setSubmitting(true);
    try {
      await rejectTask(rejectTaskId, rejectReason.trim());
      toast.success("Đã gửi yêu cầu từ chối — chờ Admin duyệt");
      setRejectTaskId(null);
      setRejectReason("");
      setRejectError("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const openProgress = (task: Task) => {
    setProgressTask(task);
    setProgressValue(task.progress);
  };

  const handleProgressSave = async () => {
    if (!progressTask) return;
    setSubmitting(true);
    try {
      await updateProgress(progressTask.id, progressValue);
      toast.success(
        progressValue === 100
          ? "Task đã hoàn thành!"
          : `Đã cập nhật tiến độ ${progressValue}%`
      );
      setProgressTask(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTabs = [
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
        title="Công việc của tôi"
        description={`${myTasks.length} task được giao · ${filtered.length} hiển thị`}
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
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
          <TableSkeleton rows={5} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={ClipboardList}
            title="Không có task nào"
            description={
              search || statusFilter !== "all"
                ? "Thử đổi bộ lọc"
                : "Bạn chưa được giao task nào"
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
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

                <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                  {task.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3 flex-wrap">
                  <span>Hạn: {formatDate(task.dueDate)}</span>
                  {task.status === "in_progress" && (
                    <div className="w-32">
                      <ProgressBar value={task.progress} size="sm" />
                    </div>
                  )}
                  {task.status === "completed" && task.completedAt && (
                    <span>Hoàn thành: {formatDate(task.completedAt)}</span>
                  )}
                </div>

                {task.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={submitting}
                      onClick={() => handleAccept(task.id)}
                    >
                      <Check size={14} /> Đồng ý
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => {
                        setRejectTaskId(task.id);
                        setRejectReason("");
                        setRejectError("");
                      }}
                    >
                      <X size={14} /> Từ chối
                    </Button>
                  </div>
                )}

                {task.status === "in_progress" && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openProgress(task)}
                    >
                      Cập nhật tiến độ
                    </Button>
                  </div>
                )}

                {task.status === "rejection_pending" && (
                  <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 mt-1">
                    <p className="text-xs text-orange-800">
                      <span className="font-medium">
                        Đang chờ Admin duyệt hủy.
                      </span>{" "}
                      Lý do: {task.rejectionReason}
                    </p>
                  </div>
                )}
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

      {/* Task detail + Thread modal */}
      <Modal
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        title={detailTask?.title || "Chi tiết task"}
        size="xl"
      >
        {detailTask && (
          <div className="flex gap-5 min-h-0" style={{ height: "60vh" }}>
            {/* Left: task info */}
            <div className="w-64 shrink-0 space-y-4 overflow-y-auto pr-3 border-r border-slate-100">
              <div className="flex gap-2 flex-wrap">
                <Badge className={priorityColor[detailTask.priority]}>{priorityLabel[detailTask.priority]}</Badge>
                <Badge className={statusColor[detailTask.status]}>{statusLabel[detailTask.status]}</Badge>
                {isOverdue(detailTask.dueDate, detailTask.status) && (
                  <Badge className="bg-red-50 text-red-700 border-red-200">Quá hạn</Badge>
                )}
              </div>
              {detailTask.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{detailTask.description}</p>
              )}
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Hạn hoàn thành</p>
                  <p className="text-slate-900">{formatDate(detailTask.dueDate)}</p>
                </div>
                {detailTask.status === "in_progress" && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Tiến độ</p>
                    <ProgressBar value={detailTask.progress} size="sm" />
                    <button
                      type="button"
                      onClick={() => { setDetailTask(null); openProgress(detailTask); }}
                      className="mt-2 text-xs text-violet-600 hover:underline cursor-pointer"
                    >
                      Cập nhật tiến độ →
                    </button>
                  </div>
                )}
              </div>
              {detailTask.status === "rejection_pending" && (
                <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                  <p className="text-xs font-medium text-orange-800 mb-1">Chờ Admin duyệt hủy</p>
                  <p className="text-xs text-orange-700">{detailTask.rejectionReason}</p>
                </div>
              )}
            </div>
            {/* Right: thread */}
            <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-slate-100">
              <TaskThread
                taskId={detailTask.id}
                taskTitle={detailTask.title}
              />
            </div>
          </div>
        )}
      </Modal>


      <Modal
        open={!!rejectTaskId}
        onClose={() => setRejectTaskId(null)}
        title="Từ chối task"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-4">
          Vui lòng nhập lý do từ chối. Yêu cầu sẽ được gửi lên Admin để duyệt.
        </p>
        <Textarea
          id="reason"
          label="Lý do từ chối"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          error={rejectError}
          rows={3}
          placeholder="Tôi đang bận task khác / Không đủ kỹ năng / ..."
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setRejectTaskId(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            disabled={submitting}
          >
            {submitting ? "Đang gửi..." : "Gửi yêu cầu từ chối"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!progressTask}
        onClose={() => setProgressTask(null)}
        title="Cập nhật tiến độ"
        size="sm"
      >
        {progressTask && (
          <div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              {progressTask.title}
            </p>
            <p className="text-xs text-slate-500 mb-5">
              Kéo thanh trượt để cập nhật. Đặt 100% sẽ đánh dấu hoàn thành.
            </p>

            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-600">Tiến độ</span>
              <span className="text-lg font-semibold text-slate-900">
                {progressValue}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progressValue}
              onChange={(e) => setProgressValue(Number(e.target.value))}
              className="w-full mb-3"
              aria-label="Thanh tiến độ"
            />
            <ProgressBar value={progressValue} showLabel={false} />

            <div className="flex gap-2 mt-3">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setProgressValue(v)}
                  className={cn(
                    "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    progressValue === v
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {v}%
                </button>
              ))}
            </div>

            {progressValue === 100 && (
              <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                Task sẽ được đánh dấu hoàn thành khi lưu.
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setProgressTask(null)}>
                Hủy
              </Button>
              <Button onClick={handleProgressSave} disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu tiến độ"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
