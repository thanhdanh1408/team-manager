"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { Send, Star, Crown } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TaskComment } from "@/types";
import { api } from "@/lib/api-client";
import { formatRelative, cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface TaskThreadProps {
  taskId: string;
  taskTitle: string;
  /** Admin-only: show inline eval button */
  canEvaluate?: boolean;
  onEvaluate?: () => void;
}

const POLL_MS = 4000;

export function TaskThread({
  taskId,
  taskTitle,
  canEvaluate,
  onEvaluate,
}: TaskThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);

  const fetchComments = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingComments(true);
      try {
        const res = await api.get<{ data: TaskComment[] }>(
          `/api/tasks/${taskId}/comments`
        );
        if (mounted.current) setComments(res.data);
      } catch {
        // silent
      } finally {
        if (mounted.current && !silent) setLoadingComments(false);
      }
    },
    [taskId]
  );

  useEffect(() => {
    mounted.current = true;
    fetchComments();
    const id = setInterval(() => fetchComments(true), POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [fetchComments]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await api.post(`/api/tasks/${taskId}/comments`, { content: trimmed });
      setContent("");
      await fetchComments(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi thất bại");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as FormEvent);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-600">Thread</span>
          <span className="text-xs text-slate-400 truncate max-w-[200px]">
            #{taskTitle}
          </span>
        </div>
        {canEvaluate && onEvaluate && (
          <button
            type="button"
            onClick={onEvaluate}
            className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Star size={13} className="fill-amber-500 text-amber-500" />
            Đánh giá
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loadingComments ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <p className="text-xs text-slate-400">Chưa có tin nhắn nào</p>
            <p className="text-xs text-slate-300 mt-0.5">
              Bắt đầu cuộc trò chuyện!
            </p>
          </div>
        ) : (
          comments.map((c) => {
            const isMe = c.userId === user?.id;
            const isAdmin = c.userRole === "admin";
            return (
              <div
                key={c.id}
                className={cn(
                  "flex gap-2.5 items-start",
                  isMe && "flex-row-reverse"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar name={c.userName} size="sm" />
                  {isAdmin && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400">
                      <Crown size={9} className="text-white" />
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[75%] space-y-0.5",
                    isMe && "items-end"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5",
                      isMe && "flex-row-reverse"
                    )}
                  >
                    <span className="text-xs font-medium text-slate-700">
                      {isMe ? "Bạn" : c.userName}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded px-1 py-0.5 border border-amber-100">
                        Leader
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {formatRelative(c.createdAt)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words",
                      isMe
                        ? "rounded-tr-sm bg-slate-800 text-white"
                        : "rounded-tl-sm bg-slate-100 text-slate-800"
                    )}
                  >
                    {c.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-100 px-4 py-3 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin... (Enter để gửi, Shift+Enter xuống dòng)"
              rows={1}
              style={{ resize: "none" }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 transition-colors"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={sending || !content.trim()}
            className="shrink-0 h-10 w-10 p-0 rounded-xl flex items-center justify-center"
          >
            <Send size={16} />
          </Button>
        </form>
        <p className="text-[10px] text-slate-300 mt-1 text-center">
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </div>
  );
}
