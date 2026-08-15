import { NextRequest } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { bulkTaskSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { notifyTaskAssigned } from "@/lib/notifications";
import {
  getDocument,
  createDocument,
  deleteDocument,
  updateDocument,
  COLLECTIONS,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(await getAuthUser());
    const body = await req.json();
    const data = bulkTaskSchema.parse(body);

    if (data.action === "delete") {
      let count = 0;
      for (const taskId of data.ids) {
        await deleteDocument(COLLECTIONS.TASKS, taskId);
        count++;
      }
      await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
        userId: admin.id,
        action: "bulk_delete_tasks",
        detail: `Xóa hàng loạt ${count} task`,
      });
      return jsonOk({ deleted: count });
    }

    if (data.action === "reassign") {
      if (!data.assigneeId) {
        return jsonError("Cần chọn thành viên", 400);
      }
      let count = 0;
      for (const taskId of data.ids) {
        const task = await getDocument<{ title: string }>(COLLECTIONS.TASKS, taskId);
        await updateDocument(COLLECTIONS.TASKS, taskId, {
          assigneeId: data.assigneeId,
          status: "in_progress",
          rejectionReason: null,
          completedAt: null,
        });
        const taskTitle = task?.title || "";
        await notifyTaskAssigned(data.assigneeId, taskTitle, taskId);
        count++;
      }
      await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
        userId: admin.id,
        action: "bulk_reassign",
        detail: `Giao lại ${count} task`,
      });
      return jsonOk({ updated: count });
    }

    if (data.action === "priority") {
      if (!data.priority) {
        return jsonError("Cần chọn mức ưu tiên", 400);
      }
      let count = 0;
      for (const taskId of data.ids) {
        await updateDocument(COLLECTIONS.TASKS, taskId, {
          priority: data.priority,
        });
        count++;
      }
      await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
        userId: admin.id,
        action: "bulk_priority",
        detail: `Đổi priority ${count} task → ${data.priority}`,
      });
      return jsonOk({ updated: count });
    }

    return jsonError("Action không hợp lệ", 400);
  } catch (err) {
    return handleApiError(err);
  }
}

