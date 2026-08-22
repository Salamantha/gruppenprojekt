"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RecordButton from "@/components/RecordButton";
import RecipeReviewCard from "@/components/RecipeReviewCard";
import ProgressIndicator from "@/components/ProgressIndicator";
import { getStoredParticipantId } from "@/lib/session";
import type { FlaggedItem, Recipe, ReviewReason } from "@/types/recipe";

type Phase =
  | "init"
  | "prompt"
  | "switchingPrompt"
  | "recorded"
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

const MAX_RETAKES = 3;

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
  const [promptNotice, setPromptNotice] = useState<string | null>(null);
  const [knowsRecipe, setKnowsRecipe] = useState<boolean | null>(null);
  const [pendingRecording, setPendingRecording] = useState<PendingRecording | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingAttempts, setRecordingAttempts] = useState(0);
  const [retakesUsed, setRetakesUsed] = useState(0);

  const loadNextTrial = useCallback(
    async (pid: string) => {
      setPhase("init");
      setRecipe(null);
      setAnsweredNein(false);
      setFlaggedItems([]);
      setErrorMessage(null);
      setRetryNotice(null);
      setPromptNotice(null);
      setKnowsRecipe(null);
      setPendingRecording(null);
      setRecordingAttempts(0);
      setRetakesUsed(0);
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

  useEffect(() => {
    if (!pendingRecording) {
      setRecordingUrl(null);
      return;
    }

    const url = URL.createObjectURL(pendingRecording.blob);
    setRecordingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingRecording]);

  const handleUnknownRecipe = async () => {
    if (!trial) return;
    setPhase("switchingPrompt");
    setPromptNotice(null);
    setRetryNotice(null);

    try {
      const res = await fetch(`/api/trials/${trial.trialId}/prompt`, { method: "POST" });
      if (res.status === 409) {
        setPromptNotice(
          "Es sind keine weiteren Gerichte verfügbar. Bitte wähle bei diesem Gericht „Ja“, wenn du es zumindest ungefähr beschreiben kannst."
        );
        setKnowsRecipe(null);
        setPhase("prompt");
        return;
      }
      if (!res.ok) throw new Error("prompt replacement failed");

      const data = (await res.json()) as Pick<TrialState, "trialId" | "order" | "promptTitle">;
      setTrial((current) => (current ? { ...current, ...data } : current));
      setKnowsRecipe(null);
      setPromptNotice("Kein Problem — hier ist ein anderes Gericht.");
      setPhase("prompt");
    } catch {
      setErrorMessage("Ein anderes Rezept konnte nicht vorgeschlagen werden.");
      setPhase("error");
    }
  };

  const handleRecordingComplete = (blob: Blob, mimeType: string, durationMs: number) => {
    setRecordingAttempts((current) => current + 1);
    setPendingRecording({ blob, mimeType, durationMs });
    setRetryNotice(null);
    setPhase("recorded");
  };

  const handleRetake = () => {
    if (retakesUsed >= MAX_RETAKES) return;
    setRetakesUsed((current) => current + 1);
    setPendingRecording(null);
    setRetryNotice(`Neuaufnahme ${retakesUsed + 1} von ${MAX_RETAKES}.`);
    setPhase("prompt");
  };

  const processRecording = async () => {
    if (!trial || !pendingRecording) return;
    setPhase("transcribing");
    setRetryNotice(null);

    try {
      const form = new FormData();
      const ext = pendingRecording.mimeType.includes("mp4") ? "mp4" : "webm";
      form.append("audio", pendingRecording.blob, `recording.${ext}`);
      form.append("durationMs", String(pendingRecording.durationMs));
      form.append("recordingAttempts", String(recordingAttempts));
      if (knowsRecipe !== null) form.append("knowsRecipe", String(knowsRecipe));

      const transcribeRes = await fetch(`/api/trials/${trial.trialId}/transcribe`, {
        method: "POST",
        body: form,
      });
      if (transcribeRes.status === 422) {
        setPendingRecording(null);
        setRetryNotice(
          "Wir konnten leider keine verständliche Sprache erkennen. Bitte sprich näher am Mikrofon und nimm die Erklärung noch einmal auf. Dieser technische Wiederholungsversuch zählt nicht zu deinen drei freiwilligen Neuaufnahmen."
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
      setPendingRecording(null);
      setPhase("reviewing");
    } catch {
      setErrorMessage("Bei der Verarbeitung deiner Aufnahme ist ein Fehler aufgetreten.");
      setPhase("error");
    }
  };

  const toggleFlag = (item: FlaggedItem) => {
    setFlaggedItems((prev) => {
      const existing = prev.find((f) => f.field === item.field && f.index === item.index);
      if (existing) return prev.filter((f) => !(f.field === item.field && f.index === item.index));
      return [...prev, item];
    });
  };

  const updateReason = (item: FlaggedItem, reason: ReviewReason) => {
    setFlaggedItems((prev) =>
      prev.map((flagged) =>
        flagged.field === item.field && flagged.index === item.index ? { ...flagged, reason } : flagged
      )
    );
  };

  const submitAnswer = async (isFlawed: boolean, items: FlaggedItem[]) => {
    if (!trial || !participantId) return;
    setPhase("submitting");
    try {
      const res = await fetch(`/api/trials/${trial.trialId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFlawed, flaggedItems: items }),
      });
      if (!res.ok) throw new Error("answer failed");

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

  const allFlaggedItemsHaveReason =
    flaggedItems.length > 0 && flaggedItems.every((item) => Boolean(item.reason));
  const retakesRemaining = Math.max(0, MAX_RETAKES - retakesUsed);

  return (
    <div className="min-h-screen bg-gray-50 text-black py-8 px-4 flex flex-col items-center gap-6">
      {trial && <ProgressIndicator current={trial.order} total={trial.totalTrials} />}

      {phase === "switchingPrompt" && (
        <Centered>
          <p className="text-blue-600 font-semibold animate-pulse">Suche ein anderes Gericht…</p>
        </Centered>
      )}

      {phase === "prompt" && trial && (
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center gap-6">
          {knowsRecipe === null ? (
            <>
              <h2 className="text-xl font-bold text-center">Kennst du ein Rezept für {trial.promptTitle}?</h2>
              {promptNotice && (
                <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
                  {promptNotice}
                </p>
              )}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setKnowsRecipe(true);
                    setPromptNotice(null);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold"
                >
                  Ja
                </button>
                <button
                  onClick={handleUnknownRecipe}
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
                <p className="text-sm text-gray-500 mt-2">
                  Nach der Aufnahme kannst du sie anhören und vor der Rezeptgenerierung bis zu {MAX_RETAKES}-mal neu
                  aufnehmen.
                </p>
              </div>
              {retryNotice && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
                  {retryNotice}
                </p>
              )}
              <RecordButton onRecordingComplete={handleRecordingComplete} />
            </>
          )}
        </div>
      )}

      {phase === "recorded" && pendingRecording && (
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Aufnahme prüfen</h2>
            <p className="text-gray-600 text-sm">
              Höre dir deine Aufnahme an. Erst wenn du sie verwendest, wird das KI-Rezept erzeugt.
            </p>
          </div>

          {recordingUrl && <audio className="w-full" controls src={recordingUrl} />}

          <p className="text-sm text-gray-500 text-center">
            Aufnahmeversuche insgesamt: {recordingAttempts} · freiwillige Neuaufnahmen übrig: {retakesRemaining}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleRetake}
              disabled={retakesRemaining === 0}
              className="flex-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 py-3 rounded-xl font-bold disabled:opacity-40 disabled:pointer-events-none"
            >
              {retakesRemaining > 0 ? `Neu aufnehmen (${retakesRemaining}× möglich)` : "Keine Neuaufnahme mehr"}
            </button>
            <button
              type="button"
              onClick={processRecording}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
            >
              Aufnahme verwenden
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
                  Markiere die auffällige(n) Zeile(n) und wähle für jede markierte Zeile eine Begründung aus.
                </p>
                {!allFlaggedItemsHaveReason && (
                  <p className="text-xs text-amber-700 text-center mb-3">
                    Für „Weiter“ muss mindestens eine Stelle markiert und zu jeder Markierung eine Begründung gewählt
                    sein.
                  </p>
                )}
                <button
                  onClick={() => submitAnswer(true, flaggedItems)}
                  disabled={!allFlaggedItemsHaveReason}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-40 disabled:pointer-events-none"
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
