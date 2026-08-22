import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TRUST_OPTIONS } from "@/lib/questionnaire-options";

export const dynamic = "force-dynamic";

type FlaggedItem = {
  field?: "INGREDIENT" | "STEP";
  index?: number;
  reason?: string;
};

function asFlaggedItems(value: unknown): FlaggedItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FlaggedItem => Boolean(item) && typeof item === "object");
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export async function GET(request: NextRequest) {
  const token = process.env.ADMIN_EXPORT_TOKEN;
  const auth = request.headers.get("authorization");

  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [participants, trials] = await Promise.all([
    prisma.participant.findMany({
      select: {
        id: true,
        createdAt: true,
        completedAt: true,
        excludedAt: true,
        questionnaire: {
          select: {
            trustInAiContent: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trial.findMany({
      include: { prompt: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const excludedParticipants = participants.filter((p) => p.excludedAt !== null).length;

  const answered = trials.filter((trial) => trial.status === "ANSWERED");
  const invalidFallbacks = answered.filter(
    (trial) => trial.condition === "FLAWED" && (trial.generationFallbackOccurred || !trial.mistakeType)
  );
  const evaluable = answered.filter(
    (trial) => trial.condition === "CONTROL" || (trial.condition === "FLAWED" && !trial.generationFallbackOccurred && trial.mistakeType)
  );
  const control = evaluable.filter((trial) => trial.condition === "CONTROL");
  const flawed = evaluable.filter((trial) => trial.condition === "FLAWED");

  const correct = evaluable.filter((trial) => trial.isCorrectDetection === true).length;
  const detectedFlaws = flawed.filter((trial) => trial.participantAnswerIsFlawed === true).length;
  const correctControls = control.filter((trial) => trial.participantAnswerIsFlawed === false).length;
  const falsePositives = control.filter((trial) => trial.participantAnswerIsFlawed === true).length;
  const correctlyLocalized = flawed.filter((trial) => trial.isCorrectLocalization === true).length;
  const localizedAmongDetected = flawed.filter(
    (trial) => trial.participantAnswerIsFlawed === true && trial.isCorrectLocalization === true
  ).length;

  const reviewTimes = evaluable
    .map((trial) => trial.timeSpentReviewMs)
    .filter((value): value is number => typeof value === "number" && value >= 0);
  const recordingAttempts = answered
    .map((trial) => trial.recordingAttempts)
    .filter((value): value is number => typeof value === "number" && value > 0);

  const mistakeTypes = [
    "WRONG_QUANTITY",
    "WRONG_UNIT",
    "OMITTED_INGREDIENT",
    "OMITTED_STEP",
    "HALLUCINATED_INGREDIENT",
    "HALLUCINATED_STEP",
    "WRONG_TIME_OR_TEMPERATURE",
  ] as const;

  const mistakeBreakdown = mistakeTypes.map((mistakeType) => {
    const group = flawed.filter((trial) => trial.mistakeType === mistakeType);
    const detected = group.filter((trial) => trial.participantAnswerIsFlawed === true).length;
    const localized = group.filter((trial) => trial.isCorrectLocalization === true).length;
    return {
      mistakeType,
      total: group.length,
      detected,
      detectionRate: pct(detected, group.length),
      localized,
      localizationRate: pct(localized, group.length),
    };
  });

  const promptTitles = Array.from(new Set(evaluable.map((trial) => trial.prompt.title))).sort();
  const promptBreakdown = promptTitles.map((promptTitle) => {
    const group = evaluable.filter((trial) => trial.prompt.title === promptTitle);
    const groupCorrect = group.filter((trial) => trial.isCorrectDetection === true).length;
    return {
      promptTitle,
      total: group.length,
      correct: groupCorrect,
      accuracy: pct(groupCorrect, group.length),
    };
  });

  const reasonCounts: Record<string, Record<string, number>> = {};
  for (const mistakeType of mistakeTypes) {
    reasonCounts[mistakeType] = {};
  }
  for (const trial of flawed) {
    if (!trial.mistakeType) continue;
    for (const flagged of asFlaggedItems(trial.participantFlaggedItems)) {
      if (!flagged.reason) continue;
      reasonCounts[trial.mistakeType][flagged.reason] = (reasonCounts[trial.mistakeType][flagged.reason] ?? 0) + 1;
    }
  }

  const accuracyByAiTrust = TRUST_OPTIONS.map((trust) => {
    const participantIds = new Set(
      participants.filter((participant) => participant.questionnaire?.trustInAiContent === trust).map((participant) => participant.id)
    );
    const group = evaluable.filter((trial) => participantIds.has(trial.participantId));
    const groupCorrect = group.filter((trial) => trial.isCorrectDetection === true).length;
    return { value: trust, total: group.length, accuracy: pct(groupCorrect, group.length) };
  });

  const participantRows = participants.slice(0, 100).map((participant) => {
    const participantTrials = evaluable.filter((trial) => trial.participantId === participant.id);
    const participantCorrect = participantTrials.filter((trial) => trial.isCorrectDetection === true).length;
    return {
      id: participant.id,
      createdAt: participant.createdAt.toISOString(),
      completedAt: participant.completedAt?.toISOString() ?? null,
      excludedAt: participant.excludedAt?.toISOString() ?? null,
      answeredTrials: answered.filter((trial) => trial.participantId === participant.id).length,
      evaluableTrials: participantTrials.length,
      accuracy: pct(participantCorrect, participantTrials.length),
    };
  });

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      overview: {
        participants: participants.length,
        completedParticipants: participants.filter((participant) => participant.completedAt !== null).length,
        completionRate: pct(participants.filter((participant) => participant.completedAt !== null).length, participants.length),
        excludedParticipants,
        answeredTrials: answered.length,
        evaluableTrials: evaluable.length,
        invalidFallbackTrials: invalidFallbacks.length,
        controlTrials: control.length,
        flawedTrials: flawed.length,
        accuracy: pct(correct, evaluable.length),
        sensitivity: pct(detectedFlaws, flawed.length),
        specificity: pct(correctControls, control.length),
        falsePositiveRate: pct(falsePositives, control.length),
        localizationRate: pct(correctlyLocalized, flawed.length),
        localizationGivenDetection: pct(localizedAmongDetected, detectedFlaws),
        medianReviewTimeMs: median(reviewTimes),
        averageRecordingAttempts: average(recordingAttempts),
      },
      mistakeBreakdown,
      promptBreakdown,
      reasonCounts,
      accuracyByAiTrust,
      participants: participantRows,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
