"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User, Task, Evaluation, ActivityLog, Stats, TaskPriority, TaskReport, Conversation, Message } from "@/types";
import { api, Paginated } from "@/lib/api-client";
import { POLL_INTERVAL_MS } from "@/constants";

const emptyStats: Stats = {
  totalMembers: 0, totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completionPending: 0,
  completedTasks: 0, rejectionPending: 0, cancelledTasks: 0, overdueTasks: 0,
};

const POLL_MS = POLL_INTERVAL_MS;

export function useStore() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [statsRes, tasksRes, evalsRes] = await Promise.all([
        api.get<Stats>("/api/stats"),
        api.get<Paginated<Task>>("/api/tasks?pageSize=100"),
        api.get<{ data: Evaluation[] }>("/api/evaluations"),
      ]);
      if (!mounted.current) return;
      setStats(statsRes); setTasks(tasksRes.data); setEvaluations(evalsRes.data);
      try {
        const [usersRes, logsRes] = await Promise.all([
          api.get<Paginated<User>>("/api/users?pageSize=100"),
          api.get<Paginated<ActivityLog>>("/api/logs?pageSize=100"),
        ]);
        if (!mounted.current) return;
        setUsers(usersRes.data); setLogs(logsRes.data);
      } catch { if (!mounted.current) return; }
    } catch (err) {
      if (!mounted.current) return;
      if (!silent) setError(err instanceof Error ? err.message : "L\u1ed7i t\u1ea3i d\u1eef li\u1ec7u");
    } finally {
      if (mounted.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const doInitialLoad = async () => { if (mounted.current) await refresh(); };
    doInitialLoad();
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && mounted.current) refresh({ silent: true });
    }, POLL_MS);
    return () => { mounted.current = false; clearInterval(id); };
  }, [refresh]);

  const members = users.filter((u) => u.role === "member");
  const findUser = useCallback((id: string): User | undefined => users.find((u) => u.id === id), [users]);
  const getTask = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);
  const getTasksByAssignee = useCallback((userId: string) => tasks.filter((t) => t.assigneeId === userId), [tasks]);
  const getEvaluationsByMember = useCallback((memberId: string) => evaluations.filter((e) => e.memberId === memberId), [evaluations]);
  const getAverageRating = useCallback((memberId: string) => {
    const evals = evaluations.filter((e) => e.memberId === memberId);
    if (!evals.length) return 0;
    return evals.reduce((sum, e) => sum + e.rating, 0) / evals.length;
  }, [evaluations]);
  // Users
  const addUser = async (data: { name: string; email: string; password: string; position: string; phone: string; role: "admin" | "member"; isActive: boolean }) => {
    const user = await api.post<User>("/api/users", data); await refresh({ silent: true }); return user;
  };
  const updateUser = async (id: string, data: Partial<User> & { password?: string }) => {
    const user = await api.put<User>(`/api/users/${id}`, data); await refresh({ silent: true }); return user;
  };
  const deleteUser = async (id: string) => { await api.delete(`/api/users/${id}`); await refresh({ silent: true }); return true; };

  // Tasks
  const addTask = async (data: { title: string; description: string; assigneeId: string; priority: TaskPriority; dueDate: string }) => {
    const task = await api.post<Task>("/api/tasks", data); await refresh({ silent: true }); return task;
  };
  const updateTask = async (id: string, data: Partial<Task>) => {
    const task = await api.put<Task>(`/api/tasks/${id}`, data); await refresh({ silent: true }); return task;
  };
  const deleteTask = async (id: string) => { await api.delete(`/api/tasks/${id}`); await refresh({ silent: true }); return true; };
  const rejectTask = async (taskId: string, reason: string) => {
    const task = await api.post<Task>(`/api/tasks/${taskId}/actions`, { action: "reject", reason });
    await refresh({ silent: true }); return task;
  };
  const requestCompletion = async (taskId: string) => {
    const task = await api.post<Task>(`/api/tasks/${taskId}/actions`, { action: "request_completion" });
    await refresh({ silent: true }); return task;
  };
  const approveCompletion = async (taskId: string) => {
    const task = await api.post<Task>(`/api/tasks/${taskId}/actions`, { action: "approve_completion" });
    await refresh({ silent: true }); return task;
  };
  const denyCompletion = async (taskId: string) => {
    const task = await api.post<Task>(`/api/tasks/${taskId}/actions`, { action: "deny_completion" });
    await refresh({ silent: true }); return task;
  };
  const approveRejection = async (taskId: string) => {
    const task = await api.post<Task>(`/api/tasks/${taskId}/actions`, { action: "approve_rejection" });
    await refresh({ silent: true }); return task;
  };
  const denyRejection = async (taskId: string) => {
    const task = await api.post<Task>(`/api/tasks/${taskId}/actions`, { action: "deny_rejection" });
    await refresh({ silent: true }); return task;
  };
  const reassignTask = async (taskId: string, assigneeId: string) => {
    const task = await api.post<Task>(`/api/tasks/${taskId}/actions`, { action: "reassign", assigneeId });
    await refresh({ silent: true }); return task;
  };

  // Reports
  const submitReport = async (taskId: string, content: string) =>
    api.post<TaskReport>(`/api/tasks/${taskId}/reports`, { content });
  const getReports = async (taskId: string): Promise<TaskReport[]> => {
    const res = await api.get<{ data: TaskReport[] }>(`/api/tasks/${taskId}/reports`);
    return res.data;
  };

  // Evaluations
  const addEvaluation = async (data: { memberId: string; taskId?: string; rating: number; comment: string }) => {
    const evaluation = await api.post<Evaluation>("/api/evaluations", data);
    await refresh({ silent: true }); return evaluation;
  };
  const deleteEvaluation = async (id: string) => { await api.delete(`/api/evaluations/${id}`); await refresh({ silent: true }); return true; };
  // Chat
  const getConversations = async () => {
    const res = await api.get<{ data: Conversation[] }>("/api/conversations");
    return res.data;
  };
  const createConversation = async (data: { type: "direct" | "group"; memberIds: string[]; name?: string }) =>
    api.post<Conversation>("/api/conversations", data);

  type EnrichedMsg = Message & { userName: string; userAvatar?: string };
  type MsgResponse = { data: EnrichedMsg[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };

  const getMessages = async (conversationId: string, page = 1) =>
    api.get<MsgResponse>(`/api/conversations/${conversationId}/messages?page=${page}&pageSize=30`);

  const sendMessage = async (conversationId: string, content: string, attachments: Message["attachments"] = []) =>
    api.post<EnrichedMsg>(`/api/conversations/${conversationId}/messages`, { content, attachments });

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { error?: string }).error || "Tải tệp lên thất bại"); }
    return res.json() as Promise<{ url: string; name: string; type: "image" | "file"; size: number }>;
  };

  return {
    users, members, tasks, evaluations, logs, stats, loading, error,
    getUser: findUser, getTask, getTasksByAssignee, getEvaluationsByMember, getAverageRating,
    addUser, updateUser, deleteUser,
    addTask, updateTask, deleteTask,
    rejectTask, requestCompletion, approveCompletion, denyCompletion,
    approveRejection, denyRejection, reassignTask,
    submitReport, getReports,
    addEvaluation, deleteEvaluation,
    getConversations, createConversation, getMessages, sendMessage, uploadFile,
    refresh,
  };
}

export type StoreHook = ReturnType<typeof useStore>;
