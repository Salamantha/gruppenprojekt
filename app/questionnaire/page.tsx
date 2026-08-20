"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LikertQuestion from "@/components/LikertQuestion";
import { getStoredParticipantId, clearStoredParticipantId } from "@/lib/session";

const AGE_RANGES = ["unter 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65 und älter"];
const OCCUPATIONS = ["Schüler:in", "Student:in", "Angestellt", "Selbstständig", "Arbeitssuchend", "Rentner:in", "Sonstiges"];
const LLM_FREQUENCIES = ["Nie", "Selten", "Monatlich", "Wöchentlich", "Täglich"];
const PROOFREAD_OPTIONS = ["Immer", "Meistens", "Manchmal", "Selten", "Nie"];
const TRUST_OPTIONS = ["Gar nicht", "Eher nicht", "Neutral", "Eher schon", "Voll und Ganz"];

export default function QuestionnairePage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);

  const [ageRange, setAgeRange] = useState("");
  const [occupationCategory, setOccupationCategory] = useState("");
  const [selfRatedPerformance, setSelfRatedPerformance] = useState<number | null>(null);
  const [llmUsageFrequency, setLlmUsageFrequency] = useState("");
  const [proofreadsLlmOutput, setProofreadsLlmOutput] = useState("");
  const [trustInAiContent, setTrustInAiContent] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = getStoredParticipantId();
    if (!id) {
      router.replace("/");
      return;
    }
    setParticipantId(id);
  }, [router]);

  const isComplete =
    ageRange &&
    occupationCategory &&
    selfRatedPerformance !== null &&
    llmUsageFrequency &&
    proofreadsLlmOutput &&
    trustInAiContent;

  const handleSubmit = async () => {
    if (!participantId || !isComplete) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          ageRange,
          occupationCategory,
          selfRatedPerformance,
          llmUsageFrequency,
          proofreadsLlmOutput,
          trustInAiContent,
          additionalComments: additionalComments || undefined,
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      clearStoredParticipantId();
      router.push("/questionnaire/danke");
    } catch {
      setError("Der Fragebogen konnte nicht gespeichert werden. Bitte versuche es erneut.");
      setSubmitting(false);
    }
  };

  if (!participantId) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-black py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold mb-1">Abschließende Fragen</h1>
        <p className="text-sm text-gray-500 mb-6">Fast geschafft — nur noch ein paar kurze Angaben.</p>

        <div className="mb-6">
          <label className="font-semibold text-gray-900 block mb-2">Altersgruppe</label>
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
          >
            <option value="">Bitte wählen</option>
            {AGE_RANGES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="font-semibold text-gray-900 block mb-2">Tätigkeit</label>
          <select
            value={occupationCategory}
            onChange={(e) => setOccupationCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
          >
            <option value="">Bitte wählen</option>
            {OCCUPATIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <LikertQuestion
          label="Wie gut denkst du, hast du bei der Erkennung von Fehlern in den Rezepten abgeschnitten?"
          name="performance"
          value={selfRatedPerformance}
          onChange={setSelfRatedPerformance}
          lowLabel="sehr schlecht"
          highLabel="sehr gut"
        />

        <div className="mb-6">
          <label className="font-semibold text-gray-900 block mb-2">
            Wie oft nutzt du KI-Sprachmodelle (z.B. ChatGPT), um Texte zu erstellen?
          </label>
          <select
            value={llmUsageFrequency}
            onChange={(e) => setLlmUsageFrequency(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
          >
            <option value="">Bitte wählen</option>
            {LLM_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="font-semibold text-gray-900 block mb-2">
            Wie oft liest du von einer KI erstellte Texte Korrektur, bevor du sie verwendest?
          </label>
          <select
            value={proofreadsLlmOutput}
            onChange={(e) => setProofreadsLlmOutput(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
          >
            <option value="">Bitte wählen</option>
            {PROOFREAD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="font-semibold text-gray-900 block mb-2">
            Wenn du Text durch KI generieren lässt, wie sehr vertraust du darauf, dass der Inhalt stimmt?
          </label>
          <select
            value={trustInAiContent}
            onChange={(e) => setTrustInAiContent(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
          >
            <option value="">Bitte wählen</option>
            {TRUST_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="font-semibold text-gray-900 block mb-2">Sonstige Anmerkungen (optional)</label>
          <textarea
            value={additionalComments}
            onChange={(e) => setAdditionalComments(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-3"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!isComplete || submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white py-4 rounded-xl font-bold text-lg"
        >
          {submitting ? "Wird gesendet…" : "Absenden"}
        </button>
      </div>
    </div>
  );
}
