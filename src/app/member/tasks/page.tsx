"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X, ClipboardList, Search, CheckCircle, FileText, Eye, Paperclip } from "lucide-react";
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
import { MessageAttachment, Task, TaskReport } from "@/types";
import { TaskThread } from "@/components/tasks/TaskThread";
import { formatDate, priorityLabel, priorityColor, statusLabel, statusColor, isOverdue, cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export default function MemberTasksPage() {
  const { user } = useAuth();
  const { loading, getTasksByAssignee, rejectTask, requestCompletion, submitReport, getReports, uploadFile } = useStore();

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
  const [reportAttachments, setReportAttachments] = useState<MessageAttachment[]>([]);
  const [uploadingReport, setUploadingReport] = useState(false);
  const reportFileRef = useRef<HTMLInputElement>(null);
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
    if (!rejectReason.trim()) { setRejectError("Vui lòng nhập lý do"); return; }
    if (!rejectTaskId) return;
    setSubmitting(true);
    try {
      await rejectTask(rejectTaskId, rejectReason.trim());
      toast.success("Đã gửi yêu cầu hủy task");
      setRejectTaskId(null); setRejectReason(""); setRejectError("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Không thể gửi yêu cầu"); }
    finally { setSubmitting(false); }
  };

  const handleRequestCompletion = async (taskId: string) => {
    setSubmitting(true);
    try { await requestCompletion(taskId); toast.success("Đã gửi task để Admin duyệt hoàn thành"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Không thể gửi duyệt task"); }
    finally { setSubmitting(false); }
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) { setReportError("Vui lòng nhập nội dung báo cáo"); return; }
    if (!reportTask) return;
    setSubmitting(true);
    try {
      await submitReport(reportTask.id, reportContent.trim(), reportAttachments);
      toast.success("Đã nộp báo cáo thành công");
      setReportTask(null); setReportContent(""); setReportError(""); setReportAttachments([]);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Không thể nộp báo cáo"); }
    finally { setSubmitting(false); }
  };

  const handleReportFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadingReport(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadFile(file, "report")));
      setReportAttachments((previous) => [...previous, ...uploaded].slice(0, 10));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải tệp báo cáo");
    } finally {
      setUploadingReport(false);
      if (reportFileRef.current) reportFileRef.current.value = "";
    }
  };

  const handleViewReports = async (task: Task) => {
    setViewReportsTask(task); setReportsLoading(true);
    try { const data = await getReports(task.id); setReports(data); }
    catch { setReports([]); }
    finally { setReportsLoading(false); }
  };

  const STATUS_OPTIONS = [
    { value: "all", label: "Tất cả" },
    { value: "in_progress", label: "Đang làm" },
    { value: "completion_pending", label: "Chờ duyệt hoàn thành" },
    { value: "rejection_pending", label: "Chờ duyệt hủy" },
    { value: "completed", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
  ];
  return (
    <div>
      <PageHeader title="Công việc của tôi" description={`${myTasks.length} công việc được giao`} />
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm công việc..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button key={s.value} type="button" onClick={() => { setStatusFilter(s.value); setPage(1); }} className={cn("rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer", statusFilter === s.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>{s.label}</button>
          ))}
        </div>
      </div>
      {loading ? <TableSkeleton /> : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Không có công việc" description="Chưa có task nào được giao." />
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
                      {overdue && <Badge className="bg-red-50 text-red-700 border-red-200">Quá hạn</Badge>}
                    </div>
                    {task.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>}
                    <p className="text-xs text-slate-400">Hạn: {formatDate(task.dueDate)}</p>
                    {task.rejectionReason && <p className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">Lý do hủy: {task.rejectionReason}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {task.status === "in_progress" && (
                      <>
                        <Button size="sm" onClick={() => { setReportTask(task); setReportContent(""); setReportError(""); }} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0"><FileText size={13} /> Nộp báo cáo</Button>
                        <Button size="sm" onClick={() => handleRequestCompletion(task.id)} disabled={submitting} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"><CheckCircle size={13} /> Gửi duyệt hoàn thành</Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectTaskId(task.id); setRejectReason(""); setRejectError(""); }} className="flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"><X size={13} /> Yêu cầu hủy</Button>
                      </>
                    )}
                    {task.status === "completion_pending" && (
                      <Button size="sm" variant="outline" onClick={() => { setRejectTaskId(task.id); setRejectReason(""); setRejectError(""); }} className="flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"><X size={13} /> Yêu cầu hủy</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleViewReports(task)} className="flex items-center gap-1.5"><Eye size={13} /> Báo cáo</Button>
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
      <Modal open={!!rejectTaskId} onClose={() => setRejectTaskId(null)} title="Yêu cầu hủy task" size="sm">
        <p className="text-sm text-slate-600 mb-4">Nhập lý do yêu cầu hủy. Admin sẽ xem xét và quyết định.</p>
        <Textarea id="reason" label="Lý do yêu cầu hủy" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} error={rejectError} rows={3} placeholder="Ví dụ: Đang bận task khác..." />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setRejectTaskId(null)}>Hủy</Button>
          <Button variant="danger" onClick={handleReject} disabled={submitting}>{submitting ? "Đang gửi..." : "Gửi yêu cầu"}</Button>
        </div>
      </Modal>
      <Modal open={!!reportTask} onClose={() => { setReportTask(null); setReportAttachments([]); }} title={`Nộp báo cáo: ${reportTask?.title}`} size="md">
        <p className="text-sm text-slate-600 mb-4">Mô tả kết quả đạt được, công việc đã thực hiện và các vấn đề gặp phải.</p>
        <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">Sau khi nộp báo cáo, chọn “Gửi duyệt hoàn thành” để Admin xem xét.</p>
        <Textarea id="report-content" label="Nội dung báo cáo" value={reportContent} onChange={(e) => setReportContent(e.target.value)} error={reportError} rows={6} placeholder="Nhập nội dung báo cáo..." />
        <div className="mt-4">
          <input ref={reportFileRef} type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleReportFiles} />
          <Button type="button" variant="outline" onClick={() => reportFileRef.current?.click()} disabled={uploadingReport || reportAttachments.length >= 10}>
            <Paperclip size={14} /> {uploadingReport ? "Đang tải tệp..." : "Thêm tệp báo cáo"}
          </Button>
          {reportAttachments.length > 0 && <div className="mt-2 space-y-1">
            {reportAttachments.map((attachment, index) => <div key={`${attachment.url}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <Paperclip size={12} /><span className="min-w-0 flex-1 truncate">{attachment.name}</span>
              <button type="button" onClick={() => setReportAttachments((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
            </div>)}
          </div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setReportTask(null)}>Hủy</Button>
          <Button onClick={handleSubmitReport} disabled={submitting}>{submitting ? "Đang nộp..." : "Nộp báo cáo"}</Button>
        </div>
      </Modal>
      <Modal open={!!viewReportsTask} onClose={() => { setViewReportsTask(null); setReports([]); }} title={`Báo cáo: ${viewReportsTask?.title}`} size="md">
        {reportsLoading ? (
          <div className="py-8 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" /></div>
        ) : reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có báo cáo nào</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {reports.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">Báo cáo #{i + 1}</span>
                  <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.content}</p>
                {r.attachments?.length > 0 && <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                  {r.attachments.map((attachment, attachmentIndex) => <a key={`${attachment.url}-${attachmentIndex}`} href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline"><Paperclip size={12} />{attachment.name}</a>)}
                </div>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
