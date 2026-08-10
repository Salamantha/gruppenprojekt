import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOTAL_TRIALS } from "@/lib/study";

export async function POST(request: NextRequest) {
  const { participantId } = (await request.json()) as { participantId?: string };
  if (!participantId) {
    return NextResponse.json({ error: "participantId is required" }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { trials: { select: { promptId: true } } },
  });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const order = participant.trials.length + 1;
  if (order > TOTAL_TRIALS) {
    return NextResponse.json({ error: "Session already complete" }, { status: 409 });
  }

  const conditionSequence = participant.conditionSequence as ("CONTROL" | "FLAWED")[];
  const condition = conditionSequence[order - 1];
  if (!condition) {
    return NextResponse.json({ error: "No condition assigned for this trial" }, { status: 500 });
  }

  const usedPromptIds = participant.trials.map((t) => t.promptId);
  const availablePrompts = await prisma.recipePrompt.findMany({
    where: { isActive: true, id: { notIn: usedPromptIds } },
  });
  if (availablePrompts.length === 0) {
    return NextResponse.json({ error: "No recipe prompts available" }, { status: 500 });
  }
  const prompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];

  const trial = await prisma.trial.create({
    data: {
      participantId,
      promptId: prompt.id,
      order,
      condition,
      status: "CREATED",
      recordingStartedAt: new Date(),
    },
  });

  return NextResponse.json({
    trialId: trial.id,
    order,
    totalTrials: TOTAL_TRIALS,
    promptTitle: prompt.title,
  });
}
