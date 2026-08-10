import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface QuestionnaireBody {
  participantId: string;
  ageRange: string;
  occupationCategory: string;
  selfRatedCookingSkill: number;
  selfRatedPerformance: number;
  llmUsageFrequency: string;
  proofreadsLlmOutput: string;
  trustInAiAccuracy: number;
  additionalComments?: string;
}

const REQUIRED_FIELDS: (keyof QuestionnaireBody)[] = [
  "participantId",
  "ageRange",
  "occupationCategory",
  "selfRatedCookingSkill",
  "selfRatedPerformance",
  "llmUsageFrequency",
  "proofreadsLlmOutput",
  "trustInAiAccuracy",
];

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<QuestionnaireBody>;

  const missing = REQUIRED_FIELDS.filter((field) => body[field] === undefined || body[field] === null);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({ where: { id: body.participantId } });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  await prisma.questionnaireResponse.upsert({
    where: { participantId: body.participantId! },
    update: {
      ageRange: body.ageRange!,
      occupationCategory: body.occupationCategory!,
      selfRatedCookingSkill: body.selfRatedCookingSkill!,
      selfRatedPerformance: body.selfRatedPerformance!,
      llmUsageFrequency: body.llmUsageFrequency!,
      proofreadsLlmOutput: body.proofreadsLlmOutput!,
      trustInAiAccuracy: body.trustInAiAccuracy!,
      additionalComments: body.additionalComments ?? null,
    },
    create: {
      participantId: body.participantId!,
      ageRange: body.ageRange!,
      occupationCategory: body.occupationCategory!,
      selfRatedCookingSkill: body.selfRatedCookingSkill!,
      selfRatedPerformance: body.selfRatedPerformance!,
      llmUsageFrequency: body.llmUsageFrequency!,
      proofreadsLlmOutput: body.proofreadsLlmOutput!,
      trustInAiAccuracy: body.trustInAiAccuracy!,
      additionalComments: body.additionalComments ?? null,
    },
  });

  await prisma.participant.update({
    where: { id: body.participantId! },
    data: { completedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
