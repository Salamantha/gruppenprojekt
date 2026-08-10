import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const COLUMNS = [
  "participantId",
  "ageRange",
  "occupationCategory",
  "selfRatedCookingSkill",
  "selfRatedPerformance",
  "llmUsageFrequency",
  "proofreadsLlmOutput",
  "trustInAiAccuracy",
  "trialId",
  "trialOrder",
  "promptTitle",
  "condition",
  "status",
  "participantKnowsRecipe",
  "mistakeType",
  "mistakeTargetField",
  "mistakeTargetIndex",
  "generationFallbackOccurred",
  "participantAnswerIsFlawed",
  "isCorrectDetection",
  "isCorrectLocalization",
  "isFalsePositive",
  "timeSpentReviewMs",
  "audioDurationMs",
] as const;

export async function GET(request: NextRequest) {
  const token = process.env.ADMIN_EXPORT_TOKEN;
  const auth = request.headers.get("authorization");
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trials = await prisma.trial.findMany({
    include: { participant: { include: { questionnaire: true } }, prompt: true },
    orderBy: [{ participantId: "asc" }, { order: "asc" }],
  });

  const rows = trials.map((t) => {
    const q = t.participant.questionnaire;
    const row: Record<(typeof COLUMNS)[number], unknown> = {
      participantId: t.participantId,
      ageRange: q?.ageRange,
      occupationCategory: q?.occupationCategory,
      selfRatedCookingSkill: q?.selfRatedCookingSkill,
      selfRatedPerformance: q?.selfRatedPerformance,
      llmUsageFrequency: q?.llmUsageFrequency,
      proofreadsLlmOutput: q?.proofreadsLlmOutput,
      trustInAiAccuracy: q?.trustInAiAccuracy,
      trialId: t.id,
      trialOrder: t.order,
      promptTitle: t.prompt.title,
      condition: t.condition,
      status: t.status,
      participantKnowsRecipe: t.participantKnowsRecipe,
      mistakeType: t.mistakeType,
      mistakeTargetField: t.mistakeTargetField,
      mistakeTargetIndex: t.mistakeTargetIndex,
      generationFallbackOccurred: t.generationFallbackOccurred,
      participantAnswerIsFlawed: t.participantAnswerIsFlawed,
      isCorrectDetection: t.isCorrectDetection,
      isCorrectLocalization: t.isCorrectLocalization,
      isFalsePositive: t.isFalsePositive,
      timeSpentReviewMs: t.timeSpentReviewMs,
      audioDurationMs: t.audioDurationMs,
    };
    return row;
  });

  const csv = [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((col) => csvEscape(row[col])).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="study-export.csv"`,
    },
  });
}
