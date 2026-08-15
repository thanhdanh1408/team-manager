import { NextRequest } from "next/server";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { taskUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonError,
  jsonOk,
  toTaskDto,
} from "@/lib/api-helpers";
import {
  getDocument,
  updateDocument,
  deleteDocument,
  COLLECTIONS,
} from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

type FirestoreTask = {
  title: string;
  description: string;
  assigneeId: string | null;
  createdById: string;
  priority: string;
  status: string;
  progress: number;
  dueDate: string;
  rejectionReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const task = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!task) return jsonError("Không tìm thấy task", 404);
    if (user.role === "member" && task.assigneeId !== user.id) {
      return jsonError("Forbidden", 403);
    }
    return jsonOk(toTaskDto(task as Parameters<typeof toTaskDto>[0]));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const body = await req.json();
    const data = taskUpdateSchema.parse(body);

    const existing = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!existing) return jsonError("Không tìm thấy task", 404);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined)
      updateData.dueDate = new Date(data.dueDate).toISOString();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progress !== undefined) updateData.progress = data.progress;

    await updateDocument(COLLECTIONS.TASKS, id, updateData);
    const updated = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);

    return jsonOk(toTaskDto(updated! as Parameters<typeof toTaskDto>[0]));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const task = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!task) return jsonError("Không tìm thấy task", 404);
    await deleteDocument(COLLECTIONS.TASKS, id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

