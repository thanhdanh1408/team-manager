import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { taskCreateSchema } from "@/lib/validations";
import { COLLECTIONS, createDocument, getDocument, updateDocument } from "@/lib/db";
import { notifyTaskAssigned } from "@/lib/notifications";
import { toTaskDto } from "@/lib/api-helpers";
import type { AiTaskPlan } from "@/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const admin = requireAdmin(await getAuthUser());
    const { id } = await params;
    const plan = await getDocument<Omit<AiTaskPlan, "id">>(COLLECTIONS.AI_TASK_PLANS, id);
    if (!plan) return jsonError("Không tìm thấy bản phân công", 404);
    if (plan.status === "applied") return jsonError("Bản phân công này đã được áp dụng", 409);

    const validatedTasks = plan.tasks.map((task) => taskCreateSchema.parse(task));
    const created = [];
    for (const task of validatedTasks) {
      const record = await createDocument(COLLECTIONS.TASKS, {
        title: task.title.trim(), description: task.description || "", assigneeId: task.assigneeId,
        createdById: admin.id, priority: task.priority, status: "in_progress",
        dueDate: new Date(task.dueDate).toISOString(), rejectionReason: null, completedAt: null,
        updatedAt: new Date().toISOString(), aiPlanId: id,
      });
      created.push(record);
      await notifyTaskAssigned(task.assigneeId, task.title, record.id);
    }
    await updateDocument(COLLECTIONS.AI_TASK_PLANS, id, {
      status: "applied", appliedAt: new Date().toISOString(), taskIds: created.map((task) => task.id),
    });
    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: admin.id, action: "apply_ai_task_plan", detail: `Áp dụng bản phân công AI gồm ${created.length} công việc`,
    });
    return jsonOk({ data: created.map((task) => toTaskDto(task as Parameters<typeof toTaskDto>[0])) });
  } catch (error) { return handleApiError(error); }
}
