import { NextRequest } from "next/server";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { evaluationSchema } from "@/lib/validations";
import { handleApiError, jsonOk, toEvalDto } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/middleware";
import { getDocuments, getDocument, createDocument, COLLECTIONS } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const memberId = searchParams.get("memberId");

    const filters: Array<{ field: string; op: "=="; value: unknown }> = [];
    if (user.role === "member") {
      filters.push({ field: "memberId", op: "==", value: user.id });
    } else if (memberId) {
      filters.push({ field: "memberId", op: "==", value: memberId });
    }

    const evaluations = await getDocuments<{
      memberId: string; evaluatorId: string; taskId: string | null;
      rating: number; comment: string; createdAt: string;
    }>(COLLECTIONS.EVALUATIONS, filters, {
      orderByField: "createdAt", orderDirection: "desc",
    });

    return jsonOk({ data: evaluations.map((e) => toEvalDto(e as Parameters<typeof toEvalDto>[0])) });
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
    const data = evaluationSchema.parse(body);

    const evaluation = await createDocument(COLLECTIONS.EVALUATIONS, {
      memberId: data.memberId,
      evaluatorId: admin.id,
      taskId: data.taskId || null,
      rating: data.rating,
      comment: data.comment,
    });

    const member = await getDocument<{ name: string }>(COLLECTIONS.USERS, data.memberId);

    await createDocument(COLLECTIONS.ACTIVITY_LOGS, {
      userId: admin.id,
      action: "evaluate",
      detail: `Đánh giá ${member?.name || data.memberId}: ${data.rating}/5`,
    });

    return jsonOk(toEvalDto(evaluation as Parameters<typeof toEvalDto>[0]), 201);
  } catch (err) {
    return handleApiError(err);
  }
}

