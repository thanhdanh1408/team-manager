import { z } from "zod";
import type { AiTaskSuggestion, TaskPriority } from "@/types";

const aiResponseSchema = z.object({
  analysis: z.string().min(1).max(10000),
  tasks: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).default(""),
    assigneeId: z.string().min(1),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    dueDate: z.string().min(1),
    rationale: z.string().min(1).max(1000),
  })).min(1).max(20),
});

type MemberForPlanning = {
  id: string;
  name: string;
  position: string;
  department?: string;
  bio?: string;
  activeTaskCount: number;
};

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || content;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI không trả về dữ liệu JSON hợp lệ");
  return JSON.parse(source.slice(start, end + 1)) as unknown;
}

export async function generateTaskPlan(requirement: string, members: MemberForPlanning[]) {
  const endpoint = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!endpoint || !apiKey || !model) {
    throw new Error("Chưa cấu hình AI_API_URL, AI_API_KEY và AI_MODEL trên máy chủ");
  }
  if (!members.length) throw new Error("Không có thành viên đang hoạt động để phân công");

  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Bạn là trợ lý quản lý dự án. Phân tích yêu cầu và chia thành các công việc rõ ràng, cân bằng khối lượng theo năng lực. Chỉ dùng assigneeId có trong danh sách. Trả về JSON gồm analysis và tasks; mỗi task có title, description, assigneeId, priority (low|medium|high|urgent), dueDate (YYYY-MM-DD từ hôm nay trở đi), rationale.",
        },
        {
          role: "user",
          content: JSON.stringify({ today, requirement, members }),
        },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Dịch vụ AI phản hồi lỗi ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Dịch vụ AI không trả về nội dung");

  const parsed = aiResponseSchema.parse(extractJson(content));
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const tasks: AiTaskSuggestion[] = parsed.tasks.map((task) => {
    const member = memberMap.get(task.assigneeId);
    if (!member) throw new Error(`AI đã chọn thành viên không hợp lệ: ${task.assigneeId}`);
    const date = new Date(task.dueDate);
    if (Number.isNaN(date.getTime()) || task.dueDate < today) throw new Error(`AI trả về hạn chót không hợp lệ cho công việc “${task.title}”`);
    return {
      ...task,
      priority: task.priority as TaskPriority,
      assigneeName: member.name,
      dueDate: task.dueDate.slice(0, 10),
    };
  });
  return { analysis: parsed.analysis, tasks };
}
