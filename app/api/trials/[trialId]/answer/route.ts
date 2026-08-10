import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeScoring } from "@/lib/scoring";
import type { FlaggedItem, MistakeTargetFieldLower, MistakeType } from "@/types/recipe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  const body = (await request.json()) as {
    isFlawed?: boolean;
    flaggedItems?: FlaggedItem[];
  };

  if (typeof body.isFlawed !== "boolean") {
    return NextResponse.json({ error: "isFlawed (boolean) is required" }, { status: 400 });
  }
  const flaggedItems = Array.isArray(body.flaggedItems) ? body.flaggedItems : [];

  const trial = await prisma.trial.findUnique({ where: { id: trialId } });
  if (!trial) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }
  if (trial.status !== "GENERATED") {
    return NextResponse.json({ error: "Trial is not ready to be answered" }, { status: 400 });
  }

  const scoring = computeScoring({
    condition: trial.condition,
    mistakeType: trial.mistakeType as MistakeType | null,
    mistakeTargetField: trial.mistakeTargetField
      ? (trial.mistakeTargetField.toLowerCase() as MistakeTargetFieldLower)
      : null,
    mistakeTargetIndex: trial.mistakeTargetIndex,
    participantAnswerIsFlawed: body.isFlawed,
    flaggedItems,
  });

  const answeredAt = new Date();
  const timeSpentReviewMs = trial.reviewStartedAt
    ? answeredAt.getTime() - trial.reviewStartedAt.getTime()
    : null;

  await prisma.trial.update({
    where: { id: trialId },
    data: {
      participantAnswerIsFlawed: body.isFlawed,
      participantFlaggedItems: flaggedItems as unknown as Prisma.InputJsonValue,
      isCorrectDetection: scoring.isCorrectDetection,
      isCorrectLocalization: scoring.isCorrectLocalization,
      isFalsePositive: scoring.isFalsePositive,
      answeredAt,
      timeSpentReviewMs,
      status: "ANSWERED",
    },
  });

  return NextResponse.json({ ok: true });
}
