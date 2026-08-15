import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { commentSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { notifyUser } from "@/lib/notifications";
import { getDocument, getDocuments, createDocument, COLLECTIONS } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

type FirestoreTask = {
  title: string; assigneeId: string | null; createdById: string;
};

type FirestoreComment = {
  taskId: string; userId: string; content: string; createdAt: string;
};

type FirestoreUser = { name: string; role: string };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;

    const task = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!task) return jsonError("Không tìm thấy task", 404);

    if (
      user.role === "member" &&
      task.assigneeId !== user.id &&
      task.createdById !== user.id
    ) {
      return jsonError("Forbidden", 403);
    }

    const comments = await getDocuments<FirestoreComment & { userId: string }>(
      COLLECTIONS.TASK_COMMENTS,
      [{ field: "taskId", op: "==", value: id }],
      { orderByField: "createdAt", orderDirection: "asc" }
    );

    // Fetch user info for each comment
    const result = await Promise.all(
      comments.map(async (c) => {
        const u = await getDocument<FirestoreUser>(COLLECTIONS.USERS, c.userId);
        return {
          id: c.id,
          taskId: c.taskId,
          userId: c.userId,
          userName: u?.name || "Unknown",
          userRole: u?.role || "member",
          content: c.content,
          createdAt: c.createdAt,
        };
      })
    );

    return jsonOk({ data: result });
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

    const task = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!task) return jsonError("Không tìm thấy task", 404);

    if (user.role === "member" && task.assigneeId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const comment = await createDocument(COLLECTIONS.TASK_COMMENTS, {
      taskId: id,
      userId: user.id,
      content: data.content.trim(),
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

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: user.id,
      action: "comment_task",
      detail: `Bình luận task: ${task.title}`,
    });

    return jsonOk(
      {
        id: comment.id,
        taskId: comment.taskId,
        userId: comment.userId,
        userName: user.name,
        userRole: user.role,
        content: comment.content,
        createdAt: comment.createdAt,
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}

