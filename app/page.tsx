"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredParticipantId, setStoredParticipantId, clearStoredParticipantId } from "@/lib/session";

export default function WelcomePage() {
  const router = useRouter();
  const [resuming, setResuming] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredParticipantId()) setResuming(true);
  }, []);

  const requestMic = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicGranted(true);
    } catch {
      setMicError("Ohne Mikrofonzugriff kann die Studie nicht durchgeführt werden. Bitte erlaube den Zugriff.");
    }
  };

  const startStudy = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/participants", { method: "POST" });
      const data = await res.json();
      setStoredParticipantId(data.participantId);
      router.push("/study");
    } catch {
      setLoading(false);
      setMicError("Die Studie konnte nicht gestartet werden. Bitte versuche es erneut.");
    }
  };

  const restart = () => {
    clearStoredParticipantId();
    setResuming(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-black">
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold mb-4">Studie: Rezepte diktieren</h1>

        {resuming ? (
          <div className="space-y-4">
            <p className="text-gray-600">Du hast diese Studie bereits begonnen.</p>
            <button
              onClick={() => router.push("/study")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
            >
              Weiter zur Studie
            </button>
            <button onClick={restart} className="w-full text-sm text-gray-400 underline">
              Stattdessen neu starten
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-gray-600 text-sm leading-relaxed">
              In dieser Studie liest du mehrere kurze Rezepte laut vor. Deine Aufnahme wird automatisch in Text
              umgewandelt und daraus ein Rezept erstellt. Anschließend beurteilst du, ob das erstellte Rezept
              korrekt ist. Am Ende bitten wir dich um ein paar kurze Angaben zu deiner Person. Die Teilnahme ist
              freiwillig, deine Daten werden anonymisiert für Forschungszwecke im Rahmen einer Universitätsstudie
              ausgewertet.
            </p>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              Ich bin mit der Teilnahme und der anonymisierten Auswertung meiner Daten einverstanden.
            </label>

            {!micGranted ? (
              <button
                onClick={requestMic}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-bold"
              >
                Mikrofonzugriff erlauben
              </button>
            ) : (
              <p className="text-sm text-green-700">✓ Mikrofonzugriff erteilt</p>
            )}

            {micError && <p className="text-sm text-red-600">{micError}</p>}

            <button
              onClick={startStudy}
              disabled={!consentChecked || !micGranted || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white py-4 rounded-xl font-bold text-lg"
            >
              {loading ? "Wird gestartet…" : "Studie starten"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
