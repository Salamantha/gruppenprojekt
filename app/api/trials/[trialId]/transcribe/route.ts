import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transcribeAudio, TranscriptionUnclearError } from "@/lib/whisper";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;

  const trial = await prisma.trial.findUnique({ where: { id: trialId } });
  if (!trial) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  const audioMimeType = audio.type || "audio/webm";
  const audioDurationMs = Number(formData.get("durationMs") ?? 0) || null;
  const extension = audioMimeType.includes("mp4") ? "mp4" : audioMimeType.includes("aac") ? "aac" : "webm";
  const knowsRecipeRaw = formData.get("knowsRecipe");
  const participantKnowsRecipe = knowsRecipeRaw === null ? undefined : knowsRecipeRaw === "true";
  const recordingAttempts = Math.max(1, Number(formData.get("recordingAttempts") ?? 1) || 1);

  console.log(
    `[transcribe] trial=${trialId} audioBytes=${audio.size} mimeType=${audioMimeType} ` +
      `clientDurationMs=${audioDurationMs} knowsRecipe=${participantKnowsRecipe} recordingAttempts=${recordingAttempts}`
  );

  try {
    const rawTranscript = await transcribeAudio(audio, `trial-${trialId}.${extension}`, {
      participantKnowsRecipe,
    });

    await prisma.trial.update({
      where: { id: trialId },
      data: {
        rawTranscript,
        audioMimeType,
        audioDurationMs,
        participantKnowsRecipe,
        recordingAttempts,
        recordingEndedAt: new Date(),
        status: "TRANSCRIBED",
      },
    });

    return NextResponse.json({ status: "TRANSCRIBED" });
  } catch (err) {
    if (err instanceof TranscriptionUnclearError) {
      // Don't mark the trial FAILED — let the participant simply re-record the same prompt.
      await prisma.trial.update({ where: { id: trialId }, data: { status: "CREATED" } });
      return NextResponse.json(
        { error: "unclear_audio", message: "Keine verständliche Sprache erkannt." },
        { status: 422 }
      );
    }
    await prisma.trial.update({ where: { id: trialId }, data: { status: "FAILED" } });
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
