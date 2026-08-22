import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;

  const trial = await prisma.trial.findUnique({
    where: { id: trialId },
    include: {
      participant: {
        include: { trials: { select: { id: true, promptId: true } } },
      },
    },
  });

  if (!trial) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }
  if (trial.status !== "CREATED") {
    return NextResponse.json({ error: "Prompt can only be changed before recording" }, { status: 400 });
  }

  const rejectedPromptIds = Array.from(
    new Set([...asStringArray(trial.rejectedPromptIds), trial.promptId])
  );
  const promptIdsUsedInOtherTrials = trial.participant.trials
    .filter((participantTrial) => participantTrial.id !== trial.id)
    .map((participantTrial) => participantTrial.promptId);
  const excludedPromptIds = Array.from(new Set([...rejectedPromptIds, ...promptIdsUsedInOtherTrials]));

  const availablePrompts = await prisma.recipePrompt.findMany({
    where: {
      isActive: true,
      id: { notIn: excludedPromptIds },
    },
  });

  if (availablePrompts.length === 0) {
    return NextResponse.json(
      {
        error: "no_alternative_prompt",
        message: "Es sind keine weiteren Gerichte verfügbar.",
      },
      { status: 409 }
    );
  }

  const prompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];

  await prisma.trial.update({
    where: { id: trial.id },
    data: {
      promptId: prompt.id,
      rejectedPromptIds: rejectedPromptIds as unknown as Prisma.InputJsonValue,
      participantKnowsRecipe: null,
    },
  });

  return NextResponse.json({
    trialId: trial.id,
    order: trial.order,
    promptTitle: prompt.title,
  });
}
