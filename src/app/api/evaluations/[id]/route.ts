import { NextRequest } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/middleware";
import { getDocument, deleteDocument, COLLECTIONS } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const rateLimitError = await applyRateLimit(req);
    if (rateLimitError) return rateLimitError;

    requireAdmin(await getAuthUser());
    const { id } = await params;
    const evaluation = await getDocument(COLLECTIONS.EVALUATIONS, id);
    if (!evaluation) return jsonError("Không tìm thấy đánh giá", 404);
    await deleteDocument(COLLECTIONS.EVALUATIONS, id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

