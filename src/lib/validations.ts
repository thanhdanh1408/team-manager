import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu bắt buộc"),
});

export const userCreateSchema = z.object({
  name: z.string().min(2, "Tên tối thiểu 2 ký tự").max(100),
  email: z.string().email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Cần ít nhất 1 số")
    .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt"),
  position: z.string().min(1, "Chức vụ bắt buộc").max(100),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])[0-9]{8}$/, "SĐT Việt Nam không hợp lệ (0XXXXXXXXX)")
    .or(z.literal(""))
    .optional()
    .default(""),
  role: z.enum(["admin", "member"]).default("member"),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Cần ít nhất 1 số")
    .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt")
    .optional()
    .or(z.literal("")),
  position: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])[0-9]{8}$/, "SĐT Việt Nam không hợp lệ")
    .or(z.literal(""))
    .optional(),
  isActive: z.boolean().optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().min(1, "Tiêu đề bắt buộc").max(200),
  description: z.string().max(2000).default(""),
  assigneeId: z.string().min(1, "Vui lòng chọn thành viên"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z
    .string()
    .refine((d) => {
      const date = new Date(d);
      return !isNaN(date.getTime());
    }, "Ngày không hợp lệ")
    .refine((d) => {
      const date = new Date(d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, "Hạn chót phải từ hôm nay trở đi"),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Nội dung bắt buộc").max(2000),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])[0-9]{8}$/, "SĐT Việt Nam không hợp lệ")
    .or(z.literal(""))
    .optional(),
  position: z.string().min(1).max(100).optional(),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Cần ít nhất 1 số")
    .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt")
    .optional()
    .or(z.literal("")),
});

export const bulkTaskSchema = z.object({
  ids: z.array(z.string()).min(1, "Chọn ít nhất 1 task"),
  action: z.enum(["delete", "reassign", "priority"]),
  assigneeId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().min(1, "Vui lòng chọn thành viên").optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z
    .string()
    .optional()
    .refine((d) => {
      if (!d) return true;
      const date = new Date(d);
      return !isNaN(date.getTime());
    }, "Ngày không hợp lệ")
    .refine((d) => {
      if (!d) return true;
      const date = new Date(d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, "Hạn chót phải từ hôm nay trở đi"),
  status: z
    .enum(["in_progress", "completion_pending", "completed", "rejection_pending", "cancelled"])
    .optional(),
});

export const rejectTaskSchema = z.object({
  reason: z.string().min(5, "Lý do tối thiểu 5 ký tự").max(500),
});

export const taskReportSchema = z.object({
  content: z.string().min(10, "Nội dung báo cáo tối thiểu 10 ký tự").max(5000),
});

export const evaluationSchema = z.object({
  memberId: z.string().min(1),
  taskId: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, "Nhận xét bắt buộc").max(1000),
});

export const reassignSchema = z.object({
  assigneeId: z.string().min(1, "Chọn thành viên"),
});

export const conversationCreateSchema = z.object({
  type: z.enum(["direct", "group"]),
  memberIds: z.array(z.string()).min(1, "Cần ít nhất 1 thành viên"),
  name: z.string().max(100).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().max(5000).default(""),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        type: z.enum(["image", "file"]),
        size: z.number(),
      })
    )
    .default([]),
});

export function formatZodError(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
