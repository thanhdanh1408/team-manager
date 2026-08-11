import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { ZodError } from "zod";
import { formatZodError } from "./validations";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json(
    { error: message, ...(errors ? { errors } : {}) },
    { status }
  );
}

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return jsonError(err.message, err.status);
  }
  if (err instanceof ZodError) {
    return jsonError("Dữ liệu không hợp lệ", 400, formatZodError(err));
  }
  console.error("[API Error]", err);
  return jsonError(
    err instanceof Error ? err.message : "Lỗi máy chủ",
    500
  );
}

export function toUserDto(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
  phone: string;
  avatar: string | null;
  isActive: boolean;
  createdAt: Date;
  passwordHash?: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "admin" | "member",
    position: user.position,
    phone: user.phone,
    avatar: user.avatar ?? undefined,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    // Never expose passwordHash to client
  };
}

export function toTaskDto(task: {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  createdById: string;
  priority: string;
  status: string;
  progress: number;
  dueDate: Date;
  rejectionReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assigneeId: task.assigneeId,
    createdById: task.createdById,
    priority: task.priority as "low" | "medium" | "high" | "urgent",
    status: task.status as
      | "pending"
      | "in_progress"
      | "completed"
      | "rejection_pending"
      | "cancelled",
    progress: task.progress,
    dueDate: task.dueDate.toISOString(),
    rejectionReason: task.rejectionReason ?? undefined,
    completedAt: task.completedAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toEvalDto(e: {
  id: string;
  memberId: string;
  evaluatorId: string;
  taskId: string | null;
  rating: number;
  comment: string;
  createdAt: Date;
}) {
  return {
    id: e.id,
    memberId: e.memberId,
    evaluatorId: e.evaluatorId,
    taskId: e.taskId ?? undefined,
    rating: e.rating,
    comment: e.comment,
    createdAt: e.createdAt.toISOString(),
  };
}

export function toLogDto(l: {
  id: string;
  userId: string;
  action: string;
  detail: string;
  createdAt: Date;
}) {
  return {
    id: l.id,
    userId: l.userId,
    action: l.action,
    detail: l.detail,
    createdAt: l.createdAt.toISOString(),
  };
}
