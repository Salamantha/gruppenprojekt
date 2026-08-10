import { toFile } from "openai";
import { getOpenAIClient } from "@/lib/openai-client";

const WHISPER_MODEL = "whisper-1";

export class TranscriptionError extends Error {}

/**
 * Transcribes a recorded audio blob to German text using OpenAI's hosted
 * Whisper endpoint (the open-source Whisper model, API-hosted — a few cents
 * total for a whole study's worth of short recordings at $0.006/minute).
 */
export async function transcribeAudio(audio: Blob, filename: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new TranscriptionError("OPENAI_API_KEY is not set");
  }

  try {
    const file = await toFile(audio, filename);
    const result = await getOpenAIClient().audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: "de",
    });
    return result.text.trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Whisper transcription failed";
    throw new TranscriptionError(message);
  }
}
