import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCleanRecipe } from "@/lib/openai";
import { generateFlawedRecipe } from "@/lib/mistakes";
import type { MistakeType, Recipe } from "@/types/recipe";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;

  const trial = await prisma.trial.findUnique({
    where: { id: trialId },
    include: { prompt: true },
  });
  if (!trial) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }
  if (trial.status !== "TRANSCRIBED" || !trial.rawTranscript) {
    return NextResponse.json({ error: "Trial has not been transcribed yet" }, { status: 400 });
  }

  try {
    const cleanRecipe = await generateCleanRecipe(trial.rawTranscript, trial.prompt.title);

    let displayRecipe: Recipe = cleanRecipe;
    let mistakeData = {
      mistakeType: null as MistakeType | null,
      mistakeTargetField: null as "INGREDIENT" | "STEP" | null,
      mistakeTargetIndex: null as number | null,
      mistakeSubfield: null as string | null,
      mistakeOriginalValue: null as string | null,
      mistakeNewValue: null as string | null,
      generationFallbackOccurred: false,
    };

    if (trial.condition === "FLAWED") {
      const result = await generateFlawedRecipe(cleanRecipe);
      displayRecipe = result.displayRecipe;
      mistakeData = {
        mistakeType: result.mistake?.type ?? null,
        mistakeTargetField: result.mistake
          ? (result.mistake.target_field.toUpperCase() as "INGREDIENT" | "STEP")
          : null,
        mistakeTargetIndex: result.mistake?.target_index ?? null,
        mistakeSubfield: result.mistake?.subfield ?? null,
        mistakeOriginalValue: result.mistake?.original_value ?? null,
        mistakeNewValue: result.mistake?.new_value ?? null,
        generationFallbackOccurred: result.fallbackOccurred,
      };
    }

    await prisma.trial.update({
      where: { id: trialId },
      data: {
        cleanRecipe,
        displayRecipe,
        status: "GENERATED",
        reviewStartedAt: new Date(),
        ...mistakeData,
      },
    });

    return NextResponse.json({ recipe: displayRecipe });
  } catch (err) {
    await prisma.trial.update({ where: { id: trialId }, data: { status: "FAILED" } });
    const message = err instanceof Error ? err.message : "Recipe generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
