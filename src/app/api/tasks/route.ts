import { NextRequest } from "next/server";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { taskCreateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonOk,
  toTaskDto,
} from "@/lib/api-helpers";
import { notifyTaskAssigned } from "@/lib/notifications";
import { applyRateLimit } from "@/lib/middleware";
import {
  getDocuments,
  createDocument,
  COLLECTIONS,
} from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;

    const user = requireAuth(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const assigneeId = searchParams.get("assigneeId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const filters: Array<{ field: string; op: "=="; value: unknown }> = [];

    // Members only see their own tasks
    if (user.role === "member") {
      filters.push({ field: "assigneeId", op: "==", value: user.id });
    } else if (assigneeId) {
      filters.push({ field: "assigneeId", op: "==", value: assigneeId });
    }

    if (status && status !== "all") {
      filters.push({ field: "status", op: "==", value: status });
    }

    let tasks = await getDocuments<{
      title: string;
      description: string;
      assigneeId: string | null;
      createdById: string;
      priority: string;
      status: string;
      dueDate: string;
      rejectionReason: string | null;
      completedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>(COLLECTIONS.TASKS, filters, {
      orderByField: "createdAt",
      orderDirection: "desc",
    });

    // Apply search filter in memory
    if (search) {
      const s = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title?.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s)
      );
    }

    const total = tasks.length;
    const paginated = tasks.slice((page - 1) * pageSize, page * pageSize);

    return jsonOk({
      data: paginated.map((t) => toTaskDto(t as Parameters<typeof toTaskDto>[0])),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;

    const admin = requireAdmin(await getAuthUser());
    const body = await req.json();
    const data = taskCreateSchema.parse(body);

    const now = new Date().toISOString();
    const task = await createDocument(COLLECTIONS.TASKS, {
      title: data.title.trim(),
      description: data.description || "",
      assigneeId: data.assigneeId,
      createdById: admin.id,
      priority: data.priority,
      status: "in_progress",
      dueDate: new Date(data.dueDate).toISOString(),
      rejectionReason: null,
      completedAt: null,
      updatedAt: now,
    });

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: admin.id,
      action: "create_task",
      detail: `Tạo task: ${task.title}`,
    });

    await notifyTaskAssigned(task.assigneeId as string | null, task.title as string, task.id);

    return jsonOk(toTaskDto(task as Parameters<typeof toTaskDto>[0]), 201);
  } catch (err) {
    return handleApiError(err);
  }
}

