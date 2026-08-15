"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/hooks/useStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatRelative, formatDateTime, cn } from "@/lib/utils";
import { Activity, Search, Download, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { ActivityLog } from "@/types";

const PAGE_SIZE = 20;

const actionIcons: Record<string, string> = {
  login: "🔐",
  logout: "👋",
  create_task: "📋",
  accept_task: "✅",
  reject_task: "❌",
  complete_task: "🎉",
  update_progress: "📈",
  request_completion: "📤",
  approve_completion: "✅",
  deny_completion: "↩️",
  approve_rejection: "✔️",
  deny_rejection: "↩️",
  reassign_task: "🔄",
  evaluate: "⭐",
  create_user: "👤",
  comment_task: "💬",
};

const actionLabels: Record<string, string> = {
  login: "Đăng nhập",
  logout: "Đăng xuất",
  create_task: "Tạo task",
  accept_task: "Nhận task",
  reject_task: "Từ chối task",
  complete_task: "Hoàn thành",
  update_progress: "Cập nhật tiến độ",
  request_completion: "Gửi duyệt hoàn thành",
  approve_completion: "Duyệt hoàn thành",
  deny_completion: "Yêu cầu làm tiếp",
  approve_rejection: "Duyệt hủy",
  deny_rejection: "Từ chối hủy",
  reassign_task: "Giao lại task",
  evaluate: "Đánh giá",
  create_user: "Tạo user",
  comment_task: "Bình luận",
};

const actionColors: Record<string, string> = {
  login: "bg-blue-50 text-blue-700 border-blue-200",
  logout: "bg-slate-50 text-slate-600 border-slate-200",
  create_task: "bg-indigo-50 text-indigo-700 border-indigo-200",
  accept_task: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reject_task: "bg-red-50 text-red-700 border-red-200",
  complete_task: "bg-green-50 text-green-700 border-green-200",
  update_progress: "bg-violet-50 text-violet-700 border-violet-200",
  request_completion: "bg-violet-50 text-violet-700 border-violet-200",
  approve_completion: "bg-emerald-50 text-emerald-700 border-emerald-200",
  deny_completion: "bg-amber-50 text-amber-700 border-amber-200",
  approve_rejection: "bg-amber-50 text-amber-700 border-amber-200",
  deny_rejection: "bg-orange-50 text-orange-700 border-orange-200",
  reassign_task: "bg-sky-50 text-sky-700 border-sky-200",
  evaluate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  create_user: "bg-purple-50 text-purple-700 border-purple-200",
  comment_task: "bg-teal-50 text-teal-700 border-teal-200",
};

export default function ActivityPage() {
  const { getUser, refresh } = useStore();

  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoadingLogs(true);
    try {
      const res = await api.get<{ data: ActivityLog[]; pagination: { total: number; totalPages: number } }>(
        `/api/logs?pageSize=500`
      );
      setAllLogs(res.data);
      setTotalLogs(res.pagination.total);
    } catch {
      // silently fail
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs(true);
    await refresh();
    setRefreshing(false);
  };

  // Filter locally
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return allLogs.filter((log) => {
      const matchSearch =
        !q ||
        log.detail.toLowerCase().includes(q) ||
        (getUser(log.userId)?.name || "").toLowerCase().includes(q);
      const matchAction = actionFilter === "all" || log.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [allLogs, debouncedSearch, actionFilter, getUser]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter]);

  // Unique action types present in the logs
  const actionTypes = useMemo(() => {
    const types = [...new Set(allLogs.map((l) => l.action))].sort();
    return types;
  }, [allLogs]);

  const handleExportCSV = () => {
    const headers = ["Thời gian", "Người dùng", "Hành động", "Chi tiết"];
    const rows = filtered.map((log) => {
      const u = getUser(log.userId);
      return [
        formatDateTime(log.createdAt),
        u?.name || "Hệ thống",
        actionLabels[log.action] || log.action,
        log.detail,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Nhật ký hệ thống"
        description={`${totalLogs} bản ghi tổng · ${filtered.length} khớp bộ lọc`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download size={14} />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Làm mới
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Tìm theo nội dung, tên người dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm log"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActionFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer",
              actionFilter === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            Tất cả
          </button>
          {actionTypes.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setActionFilter(action)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer",
                actionFilter === action
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {actionIcons[action] || "📌"} {actionLabels[action] || action}
            </button>
          ))}
        </div>
      </div>

      {loadingLogs ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Activity}
            title="Không tìm thấy log"
            description={
              search || actionFilter !== "all"
                ? "Thử thay đổi bộ lọc"
                : "Các thao tác trong hệ thống sẽ được ghi lại tại đây"
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="divide-y divide-slate-100">
              {paginated.map((log) => {
                const u = getUser(log.userId);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                  >
                    <Avatar name={u?.name || "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border",
                            actionColors[log.action] ||
                              "bg-slate-50 text-slate-600 border-slate-200"
                          )}
                        >
                          {actionIcons[log.action] || "📌"}
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span className="text-xs text-slate-400">
                          {u?.name || "Hệ thống"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{log.detail}</p>
                      <p
                        className="text-xs text-slate-400 mt-0.5"
                        title={formatDateTime(log.createdAt)}
                      >
                        {formatRelative(log.createdAt)} ·{" "}
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-3">
            <Pagination
              page={pageSafe}
              totalPages={totalPages}
              total={filtered.length}
              onChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
