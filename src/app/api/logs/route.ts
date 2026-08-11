import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonOk, toLogDto } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10))
    );

    const [total, logs] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return jsonOk({
      data: logs.map(toLogDto),
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
