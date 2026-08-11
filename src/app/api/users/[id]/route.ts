import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAdmin, hashPassword } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonError,
  jsonOk,
  toUserDto,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/middleware";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonError("Không tìm thấy user", 404);
    return jsonOk(toUserDto(user));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;
    
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const body = await req.json();
    const data = userUpdateSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return jsonError("Không tìm thấy user", 404);

    if (data.email && data.email.toLowerCase() !== existing.email) {
      const dup = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (dup) return jsonError("Email đã tồn tại", 409);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined)
      updateData.email = data.email.toLowerCase().trim();
    if (data.position !== undefined) updateData.position = data.position.trim();
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return jsonOk(toUserDto(user));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;
    
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonError("Không tìm thấy user", 404);
    if (user.role === "admin") return jsonError("Không thể xóa admin", 400);

    await prisma.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null },
    });
    await prisma.user.delete({ where: { id } });

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
