"use client";

import {
  useState,
  useEffect,
  useRef,
  FormEvent,
  useCallback,
} from "react";
import { Send, Trash2, Crown, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { formatRelative, cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface TeamMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userPosition: string;
  content: string;
  createdAt: string;
}

const POLL_MS = 4000;

/** Deterministic skeleton bar widths (kept pure — no Math.random during render). */
const SKELETON_WIDTHS = [55, 72, 48, 66, 40];

export function TeamChatPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get<{ data: TeamMessage[] }>(
        "/api/chat?pageSize=100"
      );
      if (mounted.current) setMessages(res.data);
    } catch {
      // silent
    } finally {
      if (mounted.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchMessages();
    const id = setInterval(() => fetchMessages(true), POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await api.post("/api/chat", { content: trimmed });
      setContent("");
      await fetchMessages(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi thất bại");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/chat?id=${id}`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as FormEvent);
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce<
    { date: string; msgs: TeamMessage[] }[]
  >((acc, msg) => {
    const dateStr = new Date(msg.createdAt).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const last = acc[acc.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateStr, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Team Chat</h2>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-xs text-slate-500">Trực tuyến</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {loading ? (
          <div className="space-y-4">
            {SKELETON_WIDTHS.map((width, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
                  <div
                    className="h-8 rounded-xl bg-slate-100 animate-pulse"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
              <Users size={24} className="text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Chưa có tin nhắn nào
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Hãy là người đầu tiên bắt chuyện với team!
              </p>
            </div>
          </div>
        ) : (
          groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400 bg-white px-2 shrink-0">
                  {date}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <div className="space-y-2">
                {msgs.map((msg, idx) => {
                  const isMe = msg.userId === user?.id;
                  const isAdmin = msg.userRole === "admin";
                  const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                  const showAvatar =
                    !prevMsg || prevMsg.userId !== msg.userId;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2.5 items-end group",
                        isMe && "flex-row-reverse"
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn("shrink-0 w-9", !showAvatar && "invisible")}>
                        {showAvatar && (
                          <div className="relative">
                            <Avatar name={msg.userName} size="sm" />
                            {isAdmin && (
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 border-2 border-white">
                                <Crown size={8} className="text-white" />
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        className={cn(
                          "max-w-[72%] space-y-0.5",
                          isMe && "items-end"
                        )}
                      >
                        {showAvatar && (
                          <div
                            className={cn(
                              "flex items-center gap-1.5 mb-1",
                              isMe && "flex-row-reverse"
                            )}
                          >
                            <span className="text-xs font-semibold text-slate-700">
                              {isMe ? "Bạn" : msg.userName}
                            </span>
                            {isAdmin && (
                              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-100">
                                Leader
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {msg.userPosition}
                            </span>
                          </div>
                        )}
                        <div className="flex items-end gap-1.5 group">
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
                              isMe
                                ? "rounded-br-sm bg-gradient-to-br from-slate-700 to-slate-900 text-white"
                                : "rounded-bl-sm bg-slate-100 text-slate-800",
                              isMe && "order-2",
                              !isMe && "order-1"
                            )}
                          >
                            {msg.content}
                          </div>

                          {/* Delete button - own messages or admin */}
                          {(isMe || user?.role === "admin") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(msg.id)}
                              className={cn(
                                "opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 cursor-pointer",
                                isMe ? "order-1" : "order-2"
                              )}
                              aria-label="Xóa tin nhắn"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-[10px] text-slate-400 px-1",
                            isMe && "text-right"
                          )}
                        >
                          {formatRelative(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-100 px-4 py-3.5 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin với team... (Enter gửi, Shift+Enter xuống dòng)"
              rows={1}
              style={{ resize: "none" }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
          <Button
            type="submit"
            disabled={sending || !content.trim()}
            className="shrink-0 h-11 w-11 p-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 border-none"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
