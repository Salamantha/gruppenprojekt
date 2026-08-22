"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RecordButton from "@/components/RecordButton";
import RecipeReviewCard from "@/components/RecipeReviewCard";
import ProgressIndicator from "@/components/ProgressIndicator";
import AudioPreview from "@/components/AudioPreview";
import { clearStoredParticipantId, getStoredParticipantId } from "@/lib/session";
import type { FlaggedItem, Recipe, ReviewReason } from "@/types/recipe";

type Phase =
  | "init"
  | "prompt"
  | "swapping"
  | "confirming"
  | "transcribing"
  | "generating"
  | "reviewing"
  | "submitting"
  | "error";

interface TrialState {
  trialId: string;
  order: number;
  totalTrials: number;
  promptTitle: string;
}

interface PendingRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export default function StudyPage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("init");
  const [trial, setTrial] = useState<TrialState | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [answeredNein, setAnsweredNein] = useState(false);
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [knowsRecipe, setKnowsRecipe] = useState<boolean | null>(null);
  const [pendingRecording, setPendingRecording] = useState<PendingRecording | null>(null);
  const [recordingAttempts, setRecordingAttempts] = useState(0);

  const loadNextTrial = useCallback(
    async (pid: string) => {
      setPhase("init");
      setRecipe(null);
      setAnsweredNein(false);
      setFlaggedItems([]);
      setErrorMessage(null);
      setRetryNotice(null);
      setKnowsRecipe(null);
      setPendingRecording(null);
      setRecordingAttempts(0);
      try {
        const res = await fetch("/api/trials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: pid }),
        });
        if (res.status === 409) {
          router.push("/questionnaire");
          return;
        }
        if (!res.ok) throw new Error("Failed to create trial");
        const data = (await res.json()) as TrialState;
        setTrial(data);
        setPhase("prompt");
      } catch {
        setErrorMessage("Das nächste Rezept konnte nicht geladen werden.");
        setPhase("error");
      }
    },
    [router]
  );

  useEffect(() => {
    const id = getStoredParticipantId();
    if (!id) {
      router.replace("/");
      return;
    }
    setParticipantId(id);
  }, [router]);

  useEffect(() => {
    if (participantId) loadNextTrial(participantId);
  }, [participantId, loadNextTrial]);

  const handleSwapReject = async () => {
    if (!trial) return;
    setPhase("swapping");
    try {
      const res = await fetch(`/api/trials/${trial.trialId}/swap-prompt`, { method: "POST" });
      if (!res.ok) throw new Error("swap failed");
      const data = (await res.json()) as { promptTitle: string; exhausted: boolean };
      if (data.exhausted) {
        clearStoredParticipantId();
        router.push("/excluded");
        return;
      }
      setTrial((t) => (t ? { ...t, promptTitle: data.promptTitle } : t));
      setKnowsRecipe(null);
      setPhase("prompt");
    } catch {
      setErrorMessage("Es gab ein Problem beim Wechseln des Gerichts.");
      setPhase("error");
    }
  };

  const handleRecordingReady = (blob: Blob, mimeType: string, durationMs: number) => {
    setRecordingAttempts((n) => n + 1);
    setPendingRecording({ blob, mimeType, durationMs });
    setPhase("confirming");
  };

  const discardRecording = () => {
    setPendingRecording(null);
    setPhase("prompt");
  };

  const confirmAndUpload = async () => {
    if (!trial || !pendingRecording) return;
    const { blob, mimeType, durationMs } = pendingRecording;
    setPendingRecording(null);
    setPhase("transcribing");
    setRetryNotice(null);
    try {
      const form = new FormData();
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      form.append("audio", blob, `recording.${ext}`);
      form.append("durationMs", String(durationMs));
      form.append("recordingAttempts", String(recordingAttempts));
      if (knowsRecipe !== null) form.append("knowsRecipe", String(knowsRecipe));

      const transcribeRes = await fetch(`/api/trials/${trial.trialId}/transcribe`, {
        method: "POST",
        body: form,
      });
      if (transcribeRes.status === 422) {
        setRetryNotice(
          "Wir konnten leider keine verständliche Sprache erkennen. Bitte sprich näher am Mikrofon und versuche es noch einmal."
        );
        setPhase("prompt");
        return;
      }
      if (!transcribeRes.ok) throw new Error("transcribe failed");

      setPhase("generating");
      const generateRes = await fetch(`/api/trials/${trial.trialId}/generate`, { method: "POST" });
      if (!generateRes.ok) throw new Error("generate failed");
      const generateData = (await generateRes.json()) as { recipe: Recipe };
      setRecipe(generateData.recipe);
      setPhase("reviewing");
    } catch {
      setErrorMessage("Bei der Verarbeitung deiner Aufnahme ist ein Fehler aufgetreten.");
      setPhase("error");
    }
  };

  const toggleFlag = (item: FlaggedItem) => {
    setFlaggedItems((prev) => {
      const exists = prev.some((f) => f.field === item.field && f.index === item.index);
      if (exists) return prev.filter((f) => !(f.field === item.field && f.index === item.index));
      return [...prev, item];
    });
  };

  const updateReason = (item: FlaggedItem, reason: ReviewReason) => {
    setFlaggedItems((prev) =>
      prev.map((f) => (f.field === item.field && f.index === item.index ? { ...f, reason } : f))
    );
  };

  const submitAnswer = async (isFlawed: boolean, items: FlaggedItem[]) => {
    if (!trial || !participantId) return;
    setPhase("submitting");
    try {
      await fetch(`/api/trials/${trial.trialId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFlawed, flaggedItems: items }),
      });
      if (trial.order >= trial.totalTrials) {
        router.push("/questionnaire");
      } else {
        loadNextTrial(participantId);
      }
    } catch {
      setErrorMessage("Deine Antwort konnte nicht gespeichert werden.");
      setPhase("error");
    }
  };

  if (!participantId || phase === "init") {
    return (
      <Centered>
        <p className="text-gray-500 animate-pulse">Lädt…</p>
      </Centered>
    );
  }

  if (phase === "error") {
    return (
      <Centered>
        <p className="text-red-600 mb-4 text-center max-w-sm">{errorMessage}</p>
        <button
          onClick={() => participantId && loadNextTrial(participantId)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold"
        >
          Erneut versuchen
        </button>
      </Centered>
    );
  }

  const canSubmitFlags = flaggedItems.length > 0 && flaggedItems.every((f) => Boolean(f.reason));

  return (
    <div className="min-h-screen bg-gray-50 text-black py-8 px-4 flex flex-col items-center gap-6">
      {trial && <ProgressIndicator current={trial.order} total={trial.totalTrials} />}

      {phase === "prompt" && trial && (
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center gap-6">
          {knowsRecipe === null ? (
            <>
              <h2 className="text-xl font-bold text-center">Kennst du ein Rezept für {trial.promptTitle}?</h2>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setKnowsRecipe(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold"
                >
                  Ja
                </button>
                <button
                  onClick={handleSwapReject}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold"
                >
                  Nein
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">{trial.promptTitle}</h2>
                <p className="text-gray-700 leading-relaxed">
                  Beschreibe in maximal einer Minute, wie man {trial.promptTitle} zubereitet — so, wie du es aus dem
                  Gedächtnis erklären würdest.
                </p>
              </div>
              {retryNotice && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
                  {retryNotice}
                </p>
              )}
              <RecordButton onRecordingComplete={handleRecordingReady} />
            </>
          )}
        </div>
      )}

      {phase === "swapping" && (
        <Centered>
          <p className="text-blue-600 font-semibold animate-pulse">Wechsle Gericht…</p>
        </Centered>
      )}

      {phase === "confirming" && pendingRecording && (
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center gap-4">
          <h2 className="text-lg font-bold text-center">Deine Aufnahme</h2>
          <p className="text-sm text-gray-500 text-center">Hör sie dir kurz an — bist du zufrieden?</p>
          <AudioPreview blob={pendingRecording.blob} />
          <div className="flex gap-3 w-full">
            <button
              onClick={discardRecording}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-bold"
            >
              Neu aufnehmen
            </button>
            <button
              onClick={confirmAndUpload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
            >
              Absenden
            </button>
          </div>
        </div>
      )}

      {phase === "transcribing" && (
        <Centered>
          <p className="text-blue-600 font-semibold animate-pulse">Transkribiere deine Aufnahme…</p>
        </Centered>
      )}

      {phase === "generating" && (
        <Centered>
          <p className="text-blue-600 font-semibold animate-pulse">Erstelle Rezept…</p>
        </Centered>
      )}

      {phase === "submitting" && (
        <Centered>
          <p className="text-blue-600 font-semibold animate-pulse">Speichere Antwort…</p>
        </Centered>
      )}

      {phase === "reviewing" && recipe && (
        <>
          <RecipeReviewCard
            recipe={recipe}
            flagging={answeredNein}
            flaggedItems={flaggedItems}
            onToggleFlag={toggleFlag}
            onReasonChange={updateReason}
          />

          <div className="w-full max-w-xl bg-white p-5 rounded-2xl shadow-md border border-gray-100">
            {!answeredNein ? (
              <>
                <p className="font-bold text-center mb-4">Ist dieses Rezept richtig?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => submitAnswer(false, [])}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold"
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setAnsweredNein(true)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold"
                  >
                    Nein
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 text-center mb-4">
                  Markiere die auffällige(n) Stelle(n) und wähle für jede markierte Stelle eine Begründung aus.
                </p>
                {!canSubmitFlags && (
                  <p className="text-xs text-amber-700 text-center mb-3">
                    Für „Weiter&rdquo; muss mindestens eine Stelle markiert und zu jeder Markierung eine Begründung
                    gewählt sein.
                  </p>
                )}
                <button
                  onClick={() => submitAnswer(true, flaggedItems)}
                  disabled={!canSubmitFlags}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white py-3 rounded-xl font-bold"
                >
                  Weiter
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">{children}</div>;
}
