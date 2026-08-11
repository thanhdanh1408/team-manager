import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { commentSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { notifyUser } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return jsonError("Không tìm thấy task", 404);

    if (
      user.role === "member" &&
      task.assigneeId !== user.id &&
      task.createdById !== user.id
    ) {
      return jsonError("Forbidden", 403);
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return jsonOk({
      data: comments.map((c) => ({
        id: c.id,
        taskId: c.taskId,
        userId: c.userId,
        userName: c.user.name,
        userRole: c.user.role,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const body = await req.json();
    const data = commentSchema.parse(body);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return jsonError("Không tìm thấy task", 404);

    if (
      user.role === "member" &&
      task.assigneeId !== user.id
    ) {
      return jsonError("Forbidden", 403);
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: user.id,
        content: data.content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify the other party
    const notifyId =
      user.role === "admin"
        ? task.assigneeId
        : task.createdById !== user.id
          ? task.createdById
          : null;
    if (notifyId) {
      await notifyUser({
        userId: notifyId,
        title: "Bình luận mới",
        message: `${user.name} bình luận trên "${task.title}"`,
        type: "info",
        link: user.role === "admin" ? "/admin/tasks" : "/member/tasks",
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "comment_task",
        detail: `Bình luận task: ${task.title}`,
      },
    });

    return jsonOk(
      {
        id: comment.id,
        taskId: comment.taskId,
        userId: comment.userId,
        userName: comment.user.name,
        userRole: comment.user.role,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
