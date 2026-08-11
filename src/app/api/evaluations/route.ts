import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { evaluationSchema } from "@/lib/validations";
import {
  handleApiError,
  jsonOk,
  toEvalDto,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser());
    const { searchParams } = req.nextUrl;
    const memberId = searchParams.get("memberId");

    const where: Record<string, unknown> = {};
    if (user.role === "member") {
      where.memberId = user.id;
    } else if (memberId) {
      where.memberId = memberId;
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ data: evaluations.map(toEvalDto) });
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

    const evaluation = await prisma.evaluation.create({
      data: {
        memberId: data.memberId,
        evaluatorId: admin.id,
        taskId: data.taskId || null,
        rating: data.rating,
        comment: data.comment,
      },
    });

    const member = await prisma.user.findUnique({
      where: { id: data.memberId },
    });

    await prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "evaluate",
        detail: `Đánh giá ${member?.name || data.memberId}: ${data.rating}/5`,
      },
    });

    return jsonOk(toEvalDto(evaluation), 201);
  } catch (err) {
    return handleApiError(err);
  }
}
