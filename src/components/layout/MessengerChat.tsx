"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Plus, Users, MessageCircle, Image, Paperclip, X,
  ChevronLeft, Search, User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/hooks/useStore";
import { Conversation, Message, User } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type EnrichedMessage = Message & { userName: string; userAvatar?: string };
type EnrichedConversation = Conversation & {
  members: { id: string; name: string; avatar?: string }[];
  displayName: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: EnrichedMessage; isMine: boolean }) {
  return (
    <div className={cn("flex gap-2 mb-3", isMine ? "flex-row-reverse" : "flex-row")}>
      {!isMine && (
        <div className="shrink-0 mt-auto">
          <Avatar name={msg.userName} size="sm" />
        </div>
      )}
      <div className={cn("max-w-[70%]", isMine ? "items-end" : "items-start")} style={{ display: "flex", flexDirection: "column" }}>
        {!isMine && (
          <span className="text-xs text-slate-500 mb-1 ml-1">{msg.userName}</span>
        )}
        {msg.content && (
          <div className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
            isMine
              ? "bg-slate-900 text-white rounded-tr-sm"
              : "bg-white border border-slate-200 text-slate-900 rounded-tl-sm"
          )}>
            {msg.content}
          </div>
        )}
        {msg.attachments?.map((att, i) => (
          att.type === "image" ? (
            <div key={i} className="mt-1.5 rounded-xl overflow-hidden max-w-xs border border-slate-200">
              <img src={att.url} alt={att.name} className="max-w-full object-cover" style={{ maxHeight: 240 }} />
            </div>
          ) : (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-1.5 flex items-center gap-2 rounded-xl px-3 py-2 text-sm border transition-colors hover:opacity-80",
                isMine ? "bg-slate-700 text-white border-slate-600" : "bg-white text-slate-700 border-slate-200"
              )}
            >
              <Paperclip size={14} />
              <span className="truncate max-w-[160px]">{att.name}</span>
              <span className="text-xs opacity-60">{formatBytes(att.size)}</span>
            </a>
          )
        ))}
        <span className={cn("text-[10px] mt-0.5 text-slate-400", isMine ? "text-right" : "text-left")}>
          {formatTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}
// Conversation List Item
function ConvItem({ conv, active, onClick }: { conv: EnrichedConversation; active: boolean; onClick: () => void }) {
  const isGroup = conv.type === "group";
  return (
    <button type="button" onClick={onClick} className={cn("w-full flex items-center gap-3 px-4 py-3 transition-colors text-left cursor-pointer", active ? "bg-slate-100" : "hover:bg-slate-50")}>
      <div className="relative shrink-0">
        {isGroup ? (
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center"><Users size={18} className="text-slate-600" /></div>
        ) : (
          <Avatar name={conv.displayName} size="md" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate">{conv.displayName}</p>
        {conv.lastMessage && <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>}
      </div>
      {conv.lastMessageAt && <span className="text-[10px] text-slate-400 shrink-0">{formatTime(conv.lastMessageAt)}</span>}
    </button>
  );
}
// Chat Window
function ChatWindow({
  conv, currentUserId, getMessages, sendMessage, uploadFile,
}: {
  conv: EnrichedConversation;
  currentUserId: string;
  getMessages: (id: string, page?: number) => Promise<{ data: EnrichedMessage[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>;
  sendMessage: (id: string, content: string, attachments?: Message["attachments"]) => Promise<EnrichedMessage>;
  uploadFile: (file: File) => Promise<{ url: string; name: string; type: "image" | "file"; size: number }>;
}) {
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Message["attachments"]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (p = 1, prepend = false) => {
    try {
      const res = await getMessages(conv.id, p);
      setMessages(prev => prepend ? [...res.data, ...prev] : res.data);
      setHasMore(p < res.pagination.totalPages);
      setPage(p);
    } catch { /* noop */ }
  }, [conv.id, getMessages]);

  useEffect(() => { setMessages([]); loadMessages(1); }, [conv.id, loadMessages]);

  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMore]);

  const handleSend = async () => {
    if (!input.trim() && pendingAttachments.length === 0) return;
    setSending(true);
    try {
      const msg = await sendMessage(conv.id, input.trim(), pendingAttachments);
      setMessages(prev => [...prev, msg]);
      setInput(""); setPendingAttachments([]);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gui tin nhan that bai"); }
    finally { setSending(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(uploadFile));
      setPendingAttachments(prev => [...prev, ...results]);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload that bai"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const prevScrollH = scrollRef.current?.scrollHeight || 0;
    await loadMessages(page + 1, true);
    setLoadingMore(false);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollH;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-3 bg-white">
        {conv.type === "group" ? <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center"><Users size={16} className="text-slate-600" /></div> : <Avatar name={conv.displayName} size="sm" />}
        <div>
          <p className="text-sm font-semibold text-slate-900">{conv.displayName}</p>
          <p className="text-xs text-slate-400">{conv.members.length} thanh vien</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
        {hasMore && <div className="flex justify-center mb-3"><button type="button" onClick={handleLoadMore} disabled={loadingMore} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">{loadingMore ? "Dang tai..." : "Tai tin nhan cu hon"}</button></div>}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} isMine={msg.userId === currentUserId} />)}
        <div ref={bottomRef} />
      </div>
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 flex-wrap">
          {pendingAttachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {att.type === "image" ? <Image size={11} /> : <Paperclip size={11} />}
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button type="button" onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-slate-400 hover:text-red-500 cursor-pointer"><X size={11} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-slate-200 px-4 py-3 bg-white flex items-end gap-2">
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleFileChange} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="shrink-0 text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100" title="Dinh kem file/anh">
          {uploading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /> : <Paperclip size={18} />}
        </button>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder="Nhan Enter de gui, Shift+Enter xuong dong..." rows={1} className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white max-h-32 overflow-y-auto" style={{ minHeight: 40 }} />
        <button type="button" onClick={handleSend} disabled={sending || (!input.trim() && pendingAttachments.length === 0)} className="shrink-0 rounded-xl bg-slate-900 p-2 text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer transition-colors">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
// New Conversation Modal
function NewConvModal({
  onClose, onCreate, members, currentUserId,
}: {
  onClose: () => void;
  onCreate: (type: "direct" | "group", memberIds: string[], name?: string) => Promise<void>;
  members: User[];
  currentUserId: string;
}) {
  const [type, setType] = useState<"direct" | "group">("direct");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = members.filter(m => m.id !== currentUserId && (m.name.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())));

  const toggle = (id: string) => {
    if (type === "direct") { setSelected([id]); return; }
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (selected.length === 0) { toast.error("Chon it nhat 1 thanh vien"); return; }
    if (type === "group" && !groupName.trim()) { toast.error("Nhap ten nhom"); return; }
    setCreating(true);
    try { await onCreate(type, selected, type === "group" ? groupName.trim() : undefined); onClose(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "That bai"); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["direct", "group"] as const).map(t => (
          <button key={t} type="button" onClick={() => { setType(t); setSelected([]); }} className={cn("flex-1 rounded-lg border py-2 text-sm font-medium cursor-pointer transition-colors", type === t ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
            {t === "direct" ? "Nhan tin rieng" : "Tao nhom"}
          </button>
        ))}
      </div>
      {type === "group" && (
        <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ten nhom..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
      )}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tim thanh vien..." className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400" />
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1">
        {filtered.map(m => (
          <button key={m.id} type="button" onClick={() => toggle(m.id)} className={cn("w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors", selected.includes(m.id) ? "bg-slate-900 text-white" : "hover:bg-slate-50")}>
            <Avatar name={m.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{m.name}</p>
              <p className="text-xs opacity-60 truncate">{m.position}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Huy</Button>
        <Button onClick={handleCreate} disabled={creating}>{creating ? "Dang tao..." : "Tao"}</Button>
      </div>
    </div>
  );
}

// Main MessengerChat export
export function MessengerChat() {
  const { user } = useAuth();
  const store = useStore();
  const { users, getConversations, createConversation, getMessages, sendMessage, uploadFile } = store;

  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [convSearch, setConvSearch] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const loadConversations = useCallback(async () => {
    try { const data = await getConversations(); setConversations(data as EnrichedConversation[]); }
    catch { /* noop */ }
    finally { setLoading(false); }
  }, [getConversations]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const id = setInterval(loadConversations, 10000);
    return () => clearInterval(id);
  }, [loadConversations]);

  if (!user) return null;

  const members = users;
  const activeConv = conversations.find(c => c.id === activeConvId);
  const filteredConvs = conversations.filter(c => c.displayName?.toLowerCase().includes(convSearch.toLowerCase()));

  const handleCreateConv = async (type: "direct" | "group", memberIds: string[], name?: string) => {
    const conv = await createConversation({ type, memberIds, name });
    await loadConversations();
    setActiveConvId(conv.id);
    setMobileShowChat(true);
  };

  return (
    <div className="flex h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className={cn("flex flex-col border-r border-slate-200 bg-white", mobileShowChat ? "hidden md:flex w-80" : "flex w-full md:w-80")}>
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Tin nhan</h2>
          <button type="button" onClick={() => setShowNew(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer" title="Tao cuoc tro chuyen moi"><Plus size={18} /></button>
        </div>
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Tim cuoc tro chuyen..." className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs outline-none focus:border-slate-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 flex items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /></div>
          ) : filteredConvs.length === 0 ? (
            <div className="py-10 text-center">
              <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Chua co cuoc tro chuyen</p>
              <button type="button" onClick={() => setShowNew(true)} className="mt-2 text-xs text-slate-600 underline cursor-pointer">Bat dau nhan tin</button>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConvItem key={conv.id} conv={conv} active={conv.id === activeConvId} onClick={() => { setActiveConvId(conv.id); setMobileShowChat(true); }} />
            ))
          )}
        </div>
      </div>
      {/* Chat Area */}
      <div className={cn("flex-1 flex flex-col", mobileShowChat ? "flex" : "hidden md:flex")}>
        {activeConv ? (
          <>
            <div className="md:hidden border-b border-slate-200 px-4 py-2">
              <button type="button" onClick={() => setMobileShowChat(false)} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><ChevronLeft size={16} /> Quay lai</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatWindow conv={activeConv} currentUserId={user.id} getMessages={getMessages} sendMessage={sendMessage} uploadFile={uploadFile} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <UserIcon size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">Chon cuoc tro chuyen de bat dau</p>
            </div>
          </div>
        )}
      </div>
      {/* New Conversation Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Tao cuoc tro chuyen moi" size="md">
        <NewConvModal onClose={() => setShowNew(false)} onCreate={handleCreateConv} members={members} currentUserId={user.id} />
      </Modal>
    </div>
  );
}
