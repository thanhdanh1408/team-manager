"use client";

import { Star } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/context/AuthContext";
import { formatDate, cn } from "@/lib/utils";

export default function MemberEvaluationsPage() {
  const { user } = useAuth();
  const { getEvaluationsByMember, getAverageRating, getUser, tasks } =
    useStore();

  if (!user) return null;

  const evals = getEvaluationsByMember(user.id);
  const avg = getAverageRating(user.id);

  return (
    <div>
      <PageHeader
        title="Đánh giá của tôi"
        description={
          avg > 0
            ? `Điểm trung bình: ${avg.toFixed(1)}/5 · ${evals.length} đánh giá`
            : "Chưa có đánh giá nào"
        }
      />

      {avg > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-5">
          <div className="text-center">
            <p className="text-3xl font-semibold text-slate-900">
              {avg.toFixed(1)}
            </p>
            <div className="flex items-center gap-0.5 mt-1 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={
                    s <= Math.round(avg)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Trung bình</p>
          </div>
          <div className="flex-1 border-l border-slate-200 pl-5">
            <p className="text-sm text-slate-600">
              Dựa trên <span className="font-semibold">{evals.length}</span>{" "}
              đánh giá từ quản lý.
            </p>
            <div className="mt-3 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = evals.filter((e) => e.rating === star).length;
                const pct = evals.length > 0 ? (count / evals.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-slate-500">{star}</span>
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-4 text-slate-400 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {evals.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Star}
            title="Chưa có đánh giá"
            description="Khi admin đánh giá công việc của bạn, kết quả sẽ hiện tại đây"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {evals.map((ev) => {
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
                  <Avatar name={evaluator?.name || "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {evaluator?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(ev.createdAt)}
                        </p>
                      </div>
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
        </div>
      )}
    </div>
  );
}
