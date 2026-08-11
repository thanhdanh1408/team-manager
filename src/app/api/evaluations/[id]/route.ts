import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/middleware";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;
    
    requireAdmin(await getAuthUser());
    const { id } = await params;
    const evaluation = await prisma.evaluation.findUnique({ where: { id } });
    if (!evaluation) return jsonError("Không tìm thấy đánh giá", 404);
    await prisma.evaluation.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
