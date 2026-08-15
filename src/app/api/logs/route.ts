import { NextRequest } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonOk, toLogDto } from "@/lib/api-helpers";
import { getDocuments, countDocuments, COLLECTIONS } from "@/lib/db";

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
      countDocuments(COLLECTIONS.ACTIVITY_LOGS, []),
      getDocuments<{
        userId: string; action: string; detail: string; createdAt: string;
      }>(COLLECTIONS.ACTIVITY_LOGS, [], {
        orderByField: "createdAt",
        orderDirection: "desc",
        offset: (page - 1) * pageSize,
        limitCount: pageSize,
      }),
    ]);

    return jsonOk({
      data: logs.map((l) => toLogDto(l as Parameters<typeof toLogDto>[0])),
      pagination: {
        page, pageSize, total, totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}


