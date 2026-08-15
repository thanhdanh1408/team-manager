"use client";

import { useState, useMemo, useEffect } from "react";
import { X, ClipboardList, Search, CheckCircle, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Task, TaskReport } from "@/types";
import { TaskThread } from "@/components/tasks/TaskThread";
import { formatDate, priorityLabel, priorityColor, statusLabel, statusColor, isOverdue, cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export default function MemberTasksPage() {
  const { user } = useAuth();
  const { loading, getTasksByAssignee, rejectTask, completeTask, submitReport, getReports } = useStore();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [reportTask, setReportTask] = useState<Task | null>(null);
  const [reportContent, setReportContent] = useState("");
  const [reportError, setReportError] = useState("");
  const [viewReportsTask, setViewReportsTask] = useState<Task | null>(null);
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const myTasks = useMemo(() => (user ? getTasksByAssignee(user.id) : []), [user, getTasksByAssignee]);

  const filtered = useMemo(() => {
    return myTasks.filter((t) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch = t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [myTasks, debouncedSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => { setPage((prev) => (prev > totalPages ? 1 : prev)); }, [totalPages]);
  if (!user) return null;

  const handleReject = async () => {
    if (!rejectReason.trim()) { setRejectError("Vui long nhap ly do"); return; }
    if (!rejectTaskId) return;
    setSubmitting(true);
    try {
      await rejectTask(rejectTaskId, rejectReason.trim());
      toast.success("Da gui yeu cau huy task");
      setRejectTaskId(null); setRejectReason(""); setRejectError("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Khong the gui yeu cau"); }
    finally { setSubmitting(false); }
  };

  const handleComplete = async (taskId: string) => {
    setSubmitting(true);
    try { await completeTask(taskId); toast.success("Task da hoan thanh!"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Khong the hoan thanh task"); }
    finally { setSubmitting(false); }
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) { setReportError("Vui long nhap noi dung bao cao"); return; }
    if (!reportTask) return;
    setSubmitting(true);
    try {
      await submitReport(reportTask.id, reportContent.trim());
      toast.success("Da nop bao cao thanh cong");
      setReportTask(null); setReportContent(""); setReportError("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Khong the nop bao cao"); }
    finally { setSubmitting(false); }
  };

  const handleViewReports = async (task: Task) => {
    setViewReportsTask(task); setReportsLoading(true);
    try { const data = await getReports(task.id); setReports(data); }
    catch { setReports([]); }
    finally { setReportsLoading(false); }
  };

  const STATUS_OPTIONS = [
    { value: "all", label: "Tat ca" },
    { value: "in_progress", label: "Dang lam" },
    { value: "rejection_pending", label: "Cho duyet huy" },
    { value: "completed", label: "Hoan thanh" },
    { value: "cancelled", label: "Da huy" },
  ];
  return (
    <div>
      <PageHeader title="Cong viec cua toi" description={`${myTasks.length} cong viec duoc giao`} />
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tim kiem cong viec..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button key={s.value} type="button" onClick={() => { setStatusFilter(s.value); setPage(1); }} className={cn("rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer", statusFilter === s.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>{s.label}</button>
          ))}
        </div>
      </div>
      {loading ? <TableSkeleton /> : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Khong co cong viec" description="Chua co task nao duoc giao." />
      ) : (
        <div className="space-y-3">
          {paginated.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <div key={task.id} className={cn("rounded-xl border bg-white p-4 hover:shadow-sm", overdue && "border-red-200 bg-red-50/30")}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <button type="button" onClick={() => setDetailTask(task)} className="text-sm font-semibold text-slate-900 hover:underline cursor-pointer">{task.title}</button>
                      <Badge className={priorityColor[task.priority]}>{priorityLabel[task.priority]}</Badge>
                      <Badge className={statusColor[task.status]}>{statusLabel[task.status]}</Badge>
                      {overdue && <Badge className="bg-red-50 text-red-700 border-red-200">Qua han</Badge>}
                    </div>
                    {task.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>}
                    <p className="text-xs text-slate-400">Han: {formatDate(task.dueDate)}</p>
                    {task.rejectionReason && <p className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">Ly do huy: {task.rejectionReason}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {task.status === "in_progress" && (
                      <>
                        <Button size="sm" onClick={() => { setReportTask(task); setReportContent(""); setReportError(""); }} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0"><FileText size={13} /> Nop bao cao</Button>
                        <Button size="sm" onClick={() => handleComplete(task.id)} disabled={submitting} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"><CheckCircle size={13} /> Hoan thanh</Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectTaskId(task.id); setRejectReason(""); setRejectError(""); }} className="flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"><X size={13} /> Yeu cau huy</Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleViewReports(task)} className="flex items-center gap-1.5"><Eye size={13} /> Bao cao</Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Pagination page={pageSafe} totalPages={totalPages} total={filtered.length} onChange={setPage} />
        </div>
      )}
      {/* Modals */}
      <Modal open={!!detailTask} onClose={() => setDetailTask(null)} title={detailTask?.title || ""} size="lg">
        {detailTask && <TaskThread taskId={detailTask.id} />}
      </Modal>
      <Modal open={!!rejectTaskId} onClose={() => setRejectTaskId(null)} title="Yeu cau huy task" size="sm">
        <p className="text-sm text-slate-600 mb-4">Nhap ly do yeu cau huy. Admin se xem xet va quyet dinh.</p>
        <Textarea id="reason" label="Ly do yeu cau huy" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} error={rejectError} rows={3} placeholder="Vi du: Dang ban task khac..." />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setRejectTaskId(null)}>Huy</Button>
          <Button variant="danger" onClick={handleReject} disabled={submitting}>{submitting ? "Dang gui..." : "Gui yeu cau"}</Button>
        </div>
      </Modal>
      <Modal open={!!reportTask} onClose={() => setReportTask(null)} title={`Nop bao cao: ${reportTask?.title}`} size="md">
        <p className="text-sm text-slate-600 mb-4">Mo ta tien do, ket qua dat duoc va cac van de gap phai.</p>
        <Textarea id="report-content" label="Noi dung bao cao" value={reportContent} onChange={(e) => setReportContent(e.target.value)} error={reportError} rows={6} placeholder="Bao cao tien do:..." />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setReportTask(null)}>Huy</Button>
          <Button onClick={handleSubmitReport} disabled={submitting}>{submitting ? "Dang nop..." : "Nop bao cao"}</Button>
        </div>
      </Modal>
      <Modal open={!!viewReportsTask} onClose={() => { setViewReportsTask(null); setReports([]); }} title={`Bao cao: ${viewReportsTask?.title}`} size="md">
        {reportsLoading ? (
          <div className="py-8 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" /></div>
        ) : reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chua co bao cao nao</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {reports.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">Bao cao #{i + 1}</span>
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
