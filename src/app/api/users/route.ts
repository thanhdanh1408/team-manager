import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAdmin, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonError,
  jsonOk,
  toUserDto,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/middleware";

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

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { position: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return jsonOk({
      data: users.map(toUserDto),
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

    const exists = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) return jsonError("Email đã tồn tại", 409);

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        position: data.position.trim(),
        phone: data.phone || "",
        isActive: data.isActive,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "create_user",
        detail: `Thêm thành viên: ${user.name}`,
      },
    });

    return jsonOk(toUserDto(user), 201);
  } catch (err) {
    return handleApiError(err);
  }
}
