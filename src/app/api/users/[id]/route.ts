import { NextRequest } from "next/server";
import { getAuthUser, requireAdmin, hashPassword } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonError,
  jsonOk,
  toUserDto,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/middleware";
import {
  getDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  updateDocuments,
  COLLECTIONS,
} from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const user = await getDocument<{
      name: string;
      email: string;
      role: string;
      position: string;
      phone: string;
      avatar: string | null;
      isActive: boolean;
      createdAt: string;
    }>(COLLECTIONS.USERS, id);
    if (!user) return jsonError("Không tìm thấy user", 404);
    return jsonOk(toUserDto(user as Parameters<typeof toUserDto>[0]));
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

    const existing = await getDocument<{
      name: string;
      email: string;
      role: string;
      position: string;
      phone: string;
      avatar: string | null;
      isActive: boolean;
      createdAt: string;
    }>(COLLECTIONS.USERS, id);
    if (!existing) return jsonError("Không tìm thấy user", 404);

    if (data.email && data.email.toLowerCase() !== existing.email) {
      const dup = await getDocuments(COLLECTIONS.USERS, [
        { field: "email", op: "==", value: data.email.toLowerCase() },
      ]);
      if (dup.length > 0) return jsonError("Email đã tồn tại", 409);
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

    await updateDocument(COLLECTIONS.USERS, id, updateData);
    const updated = await getDocument<{
      name: string;
      email: string;
      role: string;
      position: string;
      phone: string;
      avatar: string | null;
      isActive: boolean;
      createdAt: string;
    }>(COLLECTIONS.USERS, id);

    return jsonOk(toUserDto(updated! as Parameters<typeof toUserDto>[0]));
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
    const user = await getDocument<{ role: string }>(COLLECTIONS.USERS, id);
    if (!user) return jsonError("Không tìm thấy user", 404);
    if (user.role === "admin") return jsonError("Không thể xóa admin", 400);

    // Unassign tasks before deleting user
    await updateDocuments(
      COLLECTIONS.TASKS,
      [{ field: "assigneeId", op: "==", value: id }],
      { assigneeId: null }
    );
    await deleteDocument(COLLECTIONS.USERS, id);

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

