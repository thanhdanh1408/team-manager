import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  try {
    requireAuth(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10))
    );

    const [total, messages] = await Promise.all([
      prisma.teamMessage.count(),
      prisma.teamMessage.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, role: true, position: true } },
        },
      }),
    ]);

    return jsonOk({
      data: messages.reverse().map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name,
        userRole: m.user.role,
        userPosition: m.user.position,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
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
    const user = requireAuth(await getAuthUser());
    const body = await req.json();
    const data = messageSchema.parse(body);

    const message = await prisma.teamMessage.create({
      data: {
        userId: user.id,
        content: data.content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, role: true, position: true } },
      },
    });

    return jsonOk(
      {
        id: message.id,
        userId: message.userId,
        userName: message.user.name,
        userRole: message.user.role,
        userPosition: message.user.position,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) return jsonError("Missing id", 400);

    const msg = await prisma.teamMessage.findUnique({ where: { id } });
    if (!msg) return jsonError("Not found", 404);
    if (msg.userId !== user.id && user.role !== "admin")
      return jsonError("Forbidden", 403);

    await prisma.teamMessage.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
