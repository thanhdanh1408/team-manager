"use client";

import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/Badge";

import {
  formatDate,
  priorityLabel,
  priorityColor,
  isOverdue,
} from "@/lib/utils";

import Link from "next/link";

export default function MemberDashboard() {
  const { user } = useAuth();
  const { getTasksByAssignee, getEvaluationsByMember, getAverageRating } =
    useStore();

  if (!user) return null;

  const myTasks = getTasksByAssignee(user.id);
  const pending = myTasks.filter((t) => t.status === "pending");
  const inProgress = myTasks.filter((t) => t.status === "in_progress");
  const completed = myTasks.filter((t) => t.status === "completed");
  const avgRating = getAverageRating(user.id);
  const recentEvals = getEvaluationsByMember(user.id).slice(0, 3);

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user.name.split(" ").slice(-1)[0]}`}
        description="Tổng quan công việc của bạn"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Chờ phản hồi" value={pending.length} icon={AlertCircle} color="amber" />
        <StatCard label="Đang làm" value={inProgress.length} icon={Clock} color="blue" />
        <StatCard label="Hoàn thành" value={completed.length} icon={CheckCircle2} color="emerald" />
        <StatCard
          label="Đánh giá TB"
          value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
          icon={Star}
          color="violet"
        />
      </div>

      {/* Pending tasks alert */}
      {pending.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-amber-800">
              Task mới chờ phản hồi ({pending.length})
            </h3>
            <Link
              href="/member/tasks"
              className="text-xs font-medium text-amber-700 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="rounded-lg bg-white border border-amber-100 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hạn: {formatDate(task.dueDate)} ·{" "}
                    {priorityLabel[task.priority]}
                  </p>
                </div>
                <Link href="/member/tasks">
                  <span className="text-xs font-medium text-amber-700 whitespace-nowrap hover:underline">
                    Phản hồi →
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* In progress */}
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Đang thực hiện
            </h3>
            <Link
              href="/member/tasks"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {inProgress.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                Không có task đang làm
              </p>
            ) : (
              inProgress.map((task) => (
                <div key={task.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <p className="text-sm font-medium text-slate-900">
                      {task.title}
                    </p>
                    <Badge className={priorityColor[task.priority]}>
                      {priorityLabel[task.priority]}
                    </Badge>
                    {isOverdue(task.dueDate, task.status) && (
                      <Badge className="bg-red-50 text-red-700 border-red-200">
                        Quá hạn
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500">
                      Hạn: {formatDate(task.dueDate)}
                    </span>
                    <span className="text-xs font-medium text-violet-600">
                      {task.progress}% hoàn thành
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent evaluations */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Đánh giá gần đây
            </h3>
          </div>
          <div className="px-5 py-3 space-y-3">
            {recentEvals.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Chưa có đánh giá
              </p>
            ) : (
              recentEvals.map((ev) => (
                <div key={ev.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={
                          s <= ev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ev.comment}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(ev.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
