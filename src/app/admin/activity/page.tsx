"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useStore } from "@/hooks/useStore";
import { formatRelative, formatDateTime } from "@/lib/utils";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const actionIcons: Record<string, string> = {
  login: "🔐",
  logout: "👋",
  create_task: "📋",
  accept_task: "✅",
  reject_task: "❌",
  complete_task: "🎉",
  update_progress: "📈",
  approve_rejection: "✔️",
  deny_rejection: "↩️",
  reassign_task: "🔄",
  evaluate: "⭐",
  create_user: "👤",
};

export default function ActivityPage() {
  const { logs, getUser, refresh } = useStore();

  return (
    <div>
      <PageHeader
        title="Hoạt động"
        description={`${logs.length} hoạt động gần đây`}
        action={
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            Làm mới
          </Button>
        }
      />

      {logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Activity}
            title="Chưa có hoạt động"
            description="Các thao tác trong hệ thống sẽ được ghi lại tại đây"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const u = getUser(log.userId);
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/50"
                >
                  <Avatar name={u?.name || "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="mr-1.5">
                        {actionIcons[log.action] || "📌"}
                      </span>
                      {log.detail}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{u?.name || "Hệ thống"}</span>
                      <span>·</span>
                      <span title={formatDateTime(log.createdAt)}>
                        {formatRelative(log.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
