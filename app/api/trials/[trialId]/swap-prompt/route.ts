import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;

  const trial = await prisma.trial.findUnique({
    where: { id: trialId },
    include: {
      prompt: true,
      participant: { include: { trials: true } },
    },
  });
  if (!trial) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }
  if (trial.status !== "CREATED") {
    return NextResponse.json({ error: "Prompt can only be changed before recording" }, { status: 400 });
  }

  const rejectedSoFar = trial.rejectedPromptIds as string[];
  const newRejected = [...rejectedSoFar, trial.promptId];

  const otherTrials = trial.participant.trials.filter((t) => t.id !== trial.id);
  const otherTrialPromptIds = otherTrials.map((t) => t.promptId);
  const otherTrialsRejected = otherTrials.flatMap((t) => t.rejectedPromptIds as string[]);
  const excludeIds = new Set([...otherTrialPromptIds, ...otherTrialsRejected, ...newRejected]);

  const candidates = await prisma.recipePrompt.findMany({
    where: { isActive: true, id: { notIn: [...excludeIds] } },
  });

  if (candidates.length === 0) {
    await prisma.trial.update({
      where: { id: trialId },
      data: { rejectedPromptIds: newRejected },
    });
    // Rejected the entire pool of dishes they were offered — exclude them
    // from the study rather than forcing them to describe something they
    // said they don't know.
    await prisma.participant.update({
      where: { id: trial.participantId },
      data: { excludedAt: new Date() },
    });
    return NextResponse.json({ promptTitle: trial.prompt.title, exhausted: true });
  }

  const newPrompt = candidates[Math.floor(Math.random() * candidates.length)];
  await prisma.trial.update({
    where: { id: trialId },
    data: { promptId: newPrompt.id, rejectedPromptIds: newRejected },
  });

  return NextResponse.json({ promptTitle: newPrompt.title, exhausted: false });
}
