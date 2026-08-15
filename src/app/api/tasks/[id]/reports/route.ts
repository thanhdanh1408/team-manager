import { NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { taskReportSchema } from "@/lib/validations";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { getDocument, getDocuments, createDocument, COLLECTIONS } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };
type FirestoreTask = { assigneeId: string | null; title: string; status: string };
type FirestoreReport = { taskId: string; userId: string; content: string; createdAt: string };

/** GET /api/tasks/[id]/reports — admin sees all, member sees own */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;

    const task = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!task) return jsonError("Không tìm thấy task", 404);

    // member can only view reports for their own tasks
    if (user.role === "member" && task.assigneeId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const reports = await getDocuments<FirestoreReport>(
      COLLECTIONS.TASK_REPORTS,
      [{ field: "taskId", op: "==", value: id }],
      { orderByField: "createdAt", orderDirection: "asc" }
    );

    return jsonOk({ data: reports });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/tasks/[id]/reports — member submits a progress report */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser());
    const { id } = await params;

    const task = await getDocument<FirestoreTask>(COLLECTIONS.TASKS, id);
    if (!task) return jsonError("Không tìm thấy task", 404);

    if (user.role === "member" && task.assigneeId !== user.id) {
      return jsonError("Bạn không được giao task này", 403);
    }

    const body = await req.json();
    const data = taskReportSchema.parse(body);

    const report = await createDocument(COLLECTIONS.TASK_REPORTS, {
      taskId: id,
      userId: user.id,
      content: data.content.trim(),
    });

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: user.id,
      action: "submit_report",
      detail: `Nộp báo cáo cho task: ${task.title}`,
    });

    return jsonOk(report, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
