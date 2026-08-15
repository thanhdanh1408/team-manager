import { NextRequest } from "next/server";
import { getAuthUser, requireAdmin, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonError,
  jsonOk,
  toUserDto,
} from "@/lib/api-helpers";
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

    requireAdmin(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const role = searchParams.get("role");
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const filters: Array<{ field: string; op: "=="; value: unknown }> = [];
    if (role) filters.push({ field: "role", op: "==", value: role });

    // Firestore doesn't support OR queries easily, so we fetch all and filter in-memory for search
    let users = await getDocuments<{
      name: string;
      email: string;
      role: string;
      position: string;
      phone: string;
      avatar: string | null;
      isActive: boolean;
      createdAt: string;
    }>(COLLECTIONS.USERS, filters, {
      orderByField: "createdAt",
      orderDirection: "desc",
    });

    // Apply search filter in memory
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s) ||
          u.position?.toLowerCase().includes(s)
      );
    }

    const total = users.length;
    const paginated = users.slice((page - 1) * pageSize, page * pageSize);

    return jsonOk({
      data: paginated.map((u) => toUserDto(u as Parameters<typeof toUserDto>[0])),
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
    const data = userCreateSchema.parse(body);

    const existing = await getDocuments(COLLECTIONS.USERS, [
      { field: "email", op: "==", value: data.email.toLowerCase() },
    ]);
    if (existing.length > 0) return jsonError("Email đã tồn tại", 409);

    const passwordHash = await hashPassword(data.password);
    const user = await createDocument(COLLECTIONS.USERS, {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      position: data.position.trim(),
      phone: data.phone || "",
      isActive: data.isActive,
      avatar: null,
    });

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: admin.id,
      action: "create_user",
      detail: `Thêm thành viên: ${user.name}`,
    });

    return jsonOk(toUserDto(user as Parameters<typeof toUserDto>[0]), 201);
  } catch (err) {
    return handleApiError(err);
  }
}

