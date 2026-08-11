import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { taskCreateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonOk,
  toTaskDto,
} from "@/lib/api-helpers";
import { notifyTaskAssigned } from "@/lib/notifications";
import { applyRateLimit } from "@/lib/middleware";


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

    const where: Record<string, unknown> = {};

    // Members only see their own tasks
    if (user.role === "member") {
      where.assigneeId = user.id;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return jsonOk({
      data: tasks.map(toTaskDto),
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

    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        description: data.description || "",
        assigneeId: data.assigneeId || null,
        createdById: admin.id,
        priority: data.priority,
        status: "pending",
        progress: 0,
        dueDate: new Date(data.dueDate),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "create_task",
        detail: `Tạo task: ${task.title}`,
      },
    });

    await notifyTaskAssigned(task.assigneeId, task.title, task.id);

    return jsonOk(toTaskDto(task), 201);

  } catch (err) {
    return handleApiError(err);
  }
}
