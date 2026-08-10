import { toFile } from "openai";
import { getOpenAIClient } from "@/lib/openai-client";

const WHISPER_MODEL = "whisper-1";
// A participant who says they don't know the recipe may honestly reply with
// something very short ("Das weiß ich leider nicht") — don't reject that as
// unclear audio. Only apply the stricter word-count floor when they're
// actually expected to describe a recipe.
const MIN_PLAUSIBLE_WORDS_DEFAULT = 5;
const MIN_PLAUSIBLE_WORDS_DOESNT_KNOW = 2;

// Whisper is trained on a lot of YouTube caption data and tends to hallucinate
// these exact boilerplate captions when given silent or near-silent audio
// instead of failing cleanly. Treat their presence as "no real speech detected".
const HALLUCINATION_PATTERNS = [
  "untertitel der amara.org-community",
  "untertitelung des zdf",
  "copyright wdr",
  "www.zdf.de",
  "das erste",
  "swr 2021",
  "ndr 2021",
];

export class TranscriptionError extends Error {}
export class TranscriptionUnclearError extends TranscriptionError {}

function isLikelyHallucination(text: string, minWords: number): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (normalized.split(/\s+/).length < minWords) return true;
  return HALLUCINATION_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Transcribes a recorded audio blob to German text using OpenAI's hosted
 * Whisper endpoint (the open-source Whisper model, API-hosted — a few cents
 * total for a whole study's worth of short recordings at $0.006/minute).
 *
 * Throws TranscriptionUnclearError (rather than returning garbage) when the
 * audio contained little or no detectable speech, so callers can ask the
 * participant to simply re-record instead of pushing hallucinated text
 * through recipe generation.
 */
export async function transcribeAudio(
  audio: Blob,
  filename: string,
  options?: { participantKnowsRecipe?: boolean }
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new TranscriptionError("OPENAI_API_KEY is not set");
  }

  let text: string;
  try {
    const file = await toFile(audio, filename);
    const result = await getOpenAIClient().audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: "de",
    });
    text = result.text.trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Whisper transcription failed";
    console.error(`[whisper] transcription request failed: ${message}`);
    throw new TranscriptionError(message);
  }

  const minWords =
    options?.participantKnowsRecipe === false ? MIN_PLAUSIBLE_WORDS_DOESNT_KNOW : MIN_PLAUSIBLE_WORDS_DEFAULT;

  if (isLikelyHallucination(text, minWords)) {
    console.warn(
      `[whisper] rejected as unclear/hallucinated (minWords=${minWords}): ${JSON.stringify(text.slice(0, 200))}`
    );
    throw new TranscriptionUnclearError(
      "No clear speech was detected in the recording (or Whisper produced a known hallucination artifact)."
    );
  }

  return text;
}
