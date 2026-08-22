import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-helpers";
import { COLLECTIONS, createDocument, getDocuments } from "@/lib/db";
import { generateTaskPlan } from "@/lib/ai-planner";
import type { AiTaskPlan, Task } from "@/types";

const requestSchema = z.object({
  requirement: z.string().min(20, "Yêu cầu cần ít nhất 20 ký tự").max(10000),
});

type StoredUser = { name: string; position: string; department?: string; bio?: string; role: string; isActive: boolean };

export async function GET() {
  try {
    requireAdmin(await getAuthUser());
    const plans = await getDocuments<Omit<AiTaskPlan, "id">>(COLLECTIONS.AI_TASK_PLANS, [], {
      orderByField: "createdAt", orderDirection: "desc", limitCount: 50,
    });
    return jsonOk({ data: plans });
  } catch (error) { return handleApiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(await getAuthUser());
    const { requirement } = requestSchema.parse(await req.json());
    const [members, activeTasks] = await Promise.all([
      getDocuments<StoredUser>(COLLECTIONS.USERS, [
        { field: "role", op: "==", value: "member" },
        { field: "isActive", op: "==", value: true },
      ]),
      getDocuments<Task>(COLLECTIONS.TASKS, []),
    ]);
    const planningMembers = members.map((member) => ({
      id: member.id, name: member.name, position: member.position,
      department: member.department, bio: member.bio,
      activeTaskCount: activeTasks.filter((task) => task.assigneeId === member.id && ["in_progress", "completion_pending"].includes(task.status)).length,
    }));
    const generated = await generateTaskPlan(requirement.trim(), planningMembers);
    const plan = await createDocument(COLLECTIONS.AI_TASK_PLANS, {
      requirement: requirement.trim(), analysis: generated.analysis, tasks: generated.tasks,
      status: "draft", createdById: admin.id,
    });
    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: admin.id, action: "create_ai_task_plan", detail: `AI tạo bản phân công gồm ${generated.tasks.length} công việc`,
    });
    return jsonOk(plan, 201);
  } catch (error) { return handleApiError(error); }
}
