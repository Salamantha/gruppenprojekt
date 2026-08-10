import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildConditionSequence } from "@/lib/study";

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const participant = await prisma.participant.create({
    data: {
      consentGivenAt: new Date(),
      conditionSequence: buildConditionSequence(),
      userAgent,
    },
  });

  return NextResponse.json({ participantId: participant.id });
}
