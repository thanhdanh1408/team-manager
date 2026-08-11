"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { TaskComment } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  taskId: string;
}

export function TaskComments({ taskId }: Props) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: TaskComment[] }>(
        `/api/tasks/${taskId}/comments`
      );
      setComments(res.data);
    } catch {
      toast.error("Không tải được bình luận");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const c = await api.post<TaskComment>(`/api/tasks/${taskId}/comments`, {
        content: content.trim(),
      });
      setComments((prev) => [...prev, c]);
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800">Bình luận</h4>

      {loading ? (
        <p className="text-xs text-slate-400">Đang tải...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-400">Chưa có bình luận</p>
      ) : (
        <ul className="space-y-3 max-h-56 overflow-y-auto">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Avatar name={c.userName} size="sm" />
              <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    {c.userName}
                    <span className="ml-1 font-normal text-slate-400">
                      · {c.userRole === "admin" ? "Admin" : "TV"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2 items-end">
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết bình luận..."
            rows={2}
          />
        </div>
        <Button type="submit" size="sm" loading={sending} disabled={!content.trim()}>
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
}
