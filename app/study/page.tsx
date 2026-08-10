"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RecordButton from "@/components/RecordButton";
import RecipeReviewCard from "@/components/RecipeReviewCard";
import ProgressIndicator from "@/components/ProgressIndicator";
import { getStoredParticipantId } from "@/lib/session";
import type { FlaggedItem, Recipe } from "@/types/recipe";

type Phase = "init" | "prompt" | "transcribing" | "generating" | "reviewing" | "submitting" | "error";

interface TrialState {
  trialId: string;
  order: number;
  totalTrials: number;
  promptTitle: string;
  promptText: string;
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

  const loadNextTrial = useCallback(
    async (pid: string) => {
      setPhase("init");
      setRecipe(null);
      setAnsweredNein(false);
      setFlaggedItems([]);
      setErrorMessage(null);
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

  const handleRecordingComplete = async (blob: Blob, mimeType: string, durationMs: number) => {
    if (!trial) return;
    setPhase("transcribing");
    try {
      const form = new FormData();
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      form.append("audio", blob, `recording.${ext}`);
      form.append("durationMs", String(durationMs));

      const transcribeRes = await fetch(`/api/trials/${trial.trialId}/transcribe`, {
        method: "POST",
        body: form,
      });
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

  return (
    <div className="min-h-screen bg-gray-50 text-black py-8 px-4 flex flex-col items-center gap-6">
      {trial && <ProgressIndicator current={trial.order} total={trial.totalTrials} />}

      {phase === "prompt" && trial && (
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">{trial.promptTitle}</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
              Bitte lies den folgenden Text laut vor
            </p>
            <p className="text-gray-700 leading-relaxed">{trial.promptText}</p>
          </div>
          <RecordButton onRecordingComplete={handleRecordingComplete} />
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
                  Tippe auf die Stelle(n), die du für falsch hältst, und dann auf &bdquo;Weiter&ldquo;.
                </p>
                <button
                  onClick={() => submitAnswer(true, flaggedItems)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
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
