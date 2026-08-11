import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { taskUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonError,
  jsonOk,
  toTaskDto,
} from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return jsonError("Không tìm thấy task", 404);
    if (user.role === "member" && task.assigneeId !== user.id) {
      return jsonError("Forbidden", 403);
    }
    return jsonOk(toTaskDto(task));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;
    
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const body = await req.json();
    const data = taskUpdateSchema.parse(body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return jsonError("Không tìm thấy task", 404);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progress !== undefined) updateData.progress = data.progress;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    return jsonOk(toTaskDto(task));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;
    
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return jsonError("Không tìm thấy task", 404);
    await prisma.task.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
