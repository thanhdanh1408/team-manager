"use client";

import {
  Users,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

import { TaskStatusChart } from "@/components/charts/TaskStatusChart";
import { TaskPriorityChart } from "@/components/charts/TaskPriorityChart";
import { TeamPerformanceChart } from "@/components/charts/TeamPerformanceChart";
import {
  formatRelative,
  statusLabel,
  statusColor,
  priorityLabel,
  priorityColor,
  formatDate,
} from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { stats, tasks, logs, getUser, members } = useStore();

  const recentTasks = [...tasks]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5);

  const recentLogs = logs.slice(0, 8);
  const rejectionTasks = tasks.filter((t) => t.status === "rejection_pending");
  const completionTasks = tasks.filter((t) => t.status === "completion_pending");

  // Chart data
  const statusChartData = useMemo(() => [
    { name: "Đang làm", value: tasks.filter(t => t.status === "in_progress").length, color: "#8b5cf6" },
    { name: "Chờ duyệt hoàn thành", value: tasks.filter(t => t.status === "completion_pending").length, color: "#6366f1" },
    { name: "Hoàn thành", value: tasks.filter(t => t.status === "completed").length, color: "#10b981" },
    { name: "Chờ duyệt hủy", value: tasks.filter(t => t.status === "rejection_pending").length, color: "#f59e0b" },
    { name: "Đã hủy", value: tasks.filter(t => t.status === "cancelled").length, color: "#ef4444" },
  ], [tasks]);

  const priorityChartData = useMemo(() => [
    { name: "Thấp", count: tasks.filter(t => t.priority === "low").length, color: "#64748b" },
    { name: "Trung bình", count: tasks.filter(t => t.priority === "medium").length, color: "#3b82f6" },
    { name: "Cao", count: tasks.filter(t => t.priority === "high").length, color: "#f59e0b" },
    { name: "Khẩn cấp", count: tasks.filter(t => t.priority === "urgent").length, color: "#ef4444" },
  ], [tasks]);

  const teamPerformanceData = useMemo(() => {
    return members
      .filter(m => m.isActive)
      .map(member => {
        const memberTasks = tasks.filter(t => t.assigneeId === member.id);
        return {
          name: member.name.split(" ").slice(-1)[0], // Last name only
          completed: memberTasks.filter(t => t.status === "completed").length,
          inProgress: memberTasks.filter(t => t.status === "in_progress").length,
          pending: memberTasks.filter(t => t.status === "completion_pending").length,
        };
      })
      .slice(0, 8); // Top 8 members
  }, [members, tasks]);

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user?.name?.split(" ").slice(-1)[0]}`}
        description="Tổng quan hoạt động team hôm nay"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Thành viên" value={stats.totalMembers ?? 0} icon={Users} color="blue" />
        <StatCard label="Tổng task" value={stats.totalTasks} icon={CheckSquare} color="slate" />
        <StatCard label="Đang làm" value={stats.inProgressTasks} icon={Clock} color="violet" />
        <StatCard label="Chờ duyệt" value={stats.completionPending} icon={CheckCircle2} color="violet" />
        <StatCard label="Chờ duyệt hủy" value={stats.rejectionPending} icon={XCircle} color="amber" />
        <StatCard label="Quá hạn" value={stats.overdueTasks ?? 0} icon={AlertTriangle} color="red" />
      </div>

      {completionTasks.length > 0 && (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-violet-800">
                Task chờ duyệt hoàn thành ({completionTasks.length})
              </h3>
              <p className="mt-1 text-xs text-violet-700">
                Thành viên đã nộp báo cáo và đang chờ Admin đánh giá.
              </p>
            </div>
            <Link href="/admin/tasks?status=completion_pending" className="text-xs font-medium text-violet-700 hover:underline">
              Xem và duyệt
            </Link>
          </div>
        </div>
      )}

      {/* Rejection alerts */}
      {rejectionTasks.length > 0 && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-orange-800">
              Yêu cầu từ chối task ({rejectionTasks.length})
            </h3>
            <Link
              href="/admin/tasks?status=rejection_pending"
              className="text-xs font-medium text-orange-700 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-2">
            {rejectionTasks.slice(0, 3).map((task) => {
              const assignee = task.assigneeId
                ? getUser(task.assigneeId)
                : null;
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg bg-white border border-orange-100 p-3"
                >
                  {assignee && <Avatar name={assignee.name} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {assignee?.name} — {task.rejectionReason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Phân bố trạng thái
          </h3>
          <TaskStatusChart data={statusChartData} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Mức độ ưu tiên
          </h3>
          <TaskPriorityChart data={priorityChartData} />
        </div>

        <div className="lg:col-span-2 xl:col-span-1 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Hiệu suất team
          </h3>
          <TeamPerformanceChart data={teamPerformanceData} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Công việc gần đây
            </h3>
            <Link
              href="/admin/tasks"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTasks.map((task) => {
              const assignee = task.assigneeId
                ? getUser(task.assigneeId)
                : null;
              return (
                <div key={task.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                      <Badge className={priorityColor[task.priority]}>
                        {priorityLabel[task.priority]}
                      </Badge>
                      <Badge className={statusColor[task.status]}>
                        {statusLabel[task.status]}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                      {assignee && (
                        <span className="flex items-center gap-1.5">
                          <Avatar name={assignee.name} size="sm" className="!h-5 !w-5 !text-[10px]" />
                          {assignee.name}
                        </span>
                      )}
                      <span>Hạn: {formatDate(task.dueDate)}</span>
                    </div>
                  </div>

                </div>
              );
            })}
            {recentTasks.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                Chưa có công việc nào
              </p>
            )}
          </div>
        </div>

        {/* Activity + Team */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Hoạt động gần đây
              </h3>
            </div>
            <div className="px-5 py-3 space-y-3 max-h-72 overflow-y-auto">
              {recentLogs.map((log) => {
                const u = getUser(log.userId);
                return (
                  <div key={log.id} className="flex gap-3">
                    <Avatar name={u?.name || "?"} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {log.detail}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatRelative(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Thành viên
              </h3>
            </div>
            <div className="px-5 py-3 space-y-3">
              {members.filter((m) => m.isActive).slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-slate-500">{m.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
