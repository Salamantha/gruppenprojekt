import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@/lib/whisper";

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

  try {
    const rawTranscript = await transcribeAudio(audio, `trial-${trialId}.${extension}`);

    await prisma.trial.update({
      where: { id: trialId },
      data: {
        rawTranscript,
        audioMimeType,
        audioDurationMs,
        recordingEndedAt: new Date(),
        status: "TRANSCRIBED",
      },
    });

    return NextResponse.json({ status: "TRANSCRIBED" });
  } catch (err) {
    await prisma.trial.update({ where: { id: trialId }, data: { status: "FAILED" } });
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
