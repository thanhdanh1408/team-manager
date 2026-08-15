import { NextRequest } from "next/server";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { rejectTaskSchema, reassignSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk, toTaskDto } from "@/lib/api-helpers";
import { notifyUser, notifyTaskAssigned } from "@/lib/notifications";
import { applyRateLimit } from "@/lib/middleware";
import { getDocument, getDocuments, createDocument, updateDocument, COLLECTIONS } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };
type FirestoreTask = {
  title: string; description: string; assigneeId: string | null;
  createdById: string; priority: string; status: string;
  dueDate: string; rejectionReason: string | null;
  completedAt: string | null; createdAt: string; updatedAt: string;
};
type TDto = Parameters<typeof toTaskDto>[0];

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;
    const user = requireAuth(await getAuthUser());
    const { id } = await params;
    const body = await req.json();
    const action = body.action as string;
    const task = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!task) return jsonError("Không tìm thấy task", 404);

    switch (action) {
      case "reject": {
        if (
          task.assigneeId !== user.id ||
          !["in_progress", "completion_pending"].includes(task.status)
        )
          return jsonError("Không thể yêu cầu hủy task này", 400);
        const { reason } = rejectTaskSchema.parse(body);
        await updateDocument(COLLECTIONS.TASKS, id, {
          status: "rejection_pending",
          rejectionReason: reason,
        });
        await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
          userId: user.id,
          action: "reject_task",
          detail: `Yêu cầu hủy task: ${task.title}`,
        });
        if (task.createdById) {
          await notifyUser({
            userId: task.createdById,
            title: "Yêu cầu hủy task",
            message: `${user.name} muốn hủy: ${task.title}`,
            type: "warning",
            link: "/admin/tasks",
          });
        }
        return jsonOk(toTaskDto((await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id))! as TDto));
      }
      case "approve_rejection": {
        requireAdmin(user);
        if (task.status !== "rejection_pending")
          return jsonError("Task không ở trạng thái chờ duyệt hủy", 400);
        await updateDocument(COLLECTIONS.TASKS, id, { status: "cancelled" });
        await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
          userId: user.id,
          action: "approve_rejection",
          detail: `Duyệt hủy task: ${task.title}`,
        });
        return jsonOk(toTaskDto((await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id))! as TDto));
      }
      case "deny_rejection": {
        requireAdmin(user);
        if (task.status !== "rejection_pending")
          return jsonError("Task không ở trạng thái chờ duyệt hủy", 400);
        await updateDocument(COLLECTIONS.TASKS, id, {
          status: "in_progress",
          rejectionReason: null,
        });
        await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
          userId: user.id,
          action: "deny_rejection",
          detail: `Từ chối yêu cầu hủy task: ${task.title}`,
        });
        return jsonOk(toTaskDto((await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id))! as TDto));
      }
      case "request_completion": {
        if (task.assigneeId !== user.id || task.status !== "in_progress")
          return jsonError("Không thể gửi duyệt task này", 400);
        const reports = await getDocuments(
          COLLECTIONS.TASK_REPORTS,
          [{ field: "taskId", op: "==", value: id }]
        );
        if (reports.length === 0) {
          return jsonError("Vui lòng nộp ít nhất một báo cáo trước khi gửi duyệt", 400);
        }
        await updateDocument(COLLECTIONS.TASKS, id, {
          status: "completion_pending",
        });
        await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
          userId: user.id,
          action: "request_completion",
          detail: `Gửi duyệt hoàn thành task: ${task.title}`,
        });
        if (task.createdById) {
          await notifyUser({
            userId: task.createdById,
            title: "Yêu cầu duyệt hoàn thành",
            message: `${user.name} đã gửi báo cáo và chờ duyệt: ${task.title}`,
            type: "info",
            link: "/admin/tasks",
          });
        }
        return jsonOk(toTaskDto((await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id))! as TDto));
      }
      case "approve_completion": {
        requireAdmin(user);
        if (task.status !== "completion_pending")
          return jsonError("Task không ở trạng thái chờ duyệt hoàn thành", 400);
        await updateDocument(COLLECTIONS.TASKS, id, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });
        await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
          userId: user.id,
          action: "approve_completion",
          detail: `Duyệt hoàn thành task: ${task.title}`,
        });
        if (task.assigneeId) {
          await notifyUser({
            userId: task.assigneeId,
            title: "Task đã được duyệt hoàn thành",
            message: `Admin đã duyệt hoàn thành: ${task.title}`,
            type: "success",
            link: "/member/tasks",
          });
        }
        return jsonOk(toTaskDto((await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id))! as TDto));
      }
      case "deny_completion": {
        requireAdmin(user);
        if (task.status !== "completion_pending")
          return jsonError("Task không ở trạng thái chờ duyệt hoàn thành", 400);
        await updateDocument(COLLECTIONS.TASKS, id, {
          status: "in_progress",
          completedAt: null,
        });
        await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
          userId: user.id,
          action: "deny_completion",
          detail: `Yêu cầu tiếp tục task: ${task.title}`,
        });
        if (task.assigneeId) {
          await notifyUser({
            userId: task.assigneeId,
            title: "Task cần tiếp tục thực hiện",
            message: `Admin chưa duyệt hoàn thành: ${task.title}`,
            type: "warning",
            link: "/member/tasks",
          });
        }
        return jsonOk(toTaskDto((await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id))! as TDto));
      }
      case "reassign": {
        requireAdmin(user);
        const { assigneeId } = reassignSchema.parse(body);
        const member = await getDocument<{ name: string }>(COLLECTIONS.USERS, assigneeId);
        if (!member) return jsonError("Không tìm thấy thành viên", 404);
        await updateDocument(COLLECTIONS.TASKS, id, {
          assigneeId,
          status: "in_progress",
          rejectionReason: null,
        });
        await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
          userId: user.id,
          action: "reassign_task",
          detail: `Giao lại task "${task.title}" cho ${member.name}`,
        });
        await notifyTaskAssigned(assigneeId, task.title, id);
        return jsonOk(toTaskDto((await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id))! as TDto));
      }
      default:
        return jsonError("Action không hợp lệ", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}

