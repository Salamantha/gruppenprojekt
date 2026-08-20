"use client";

import { useRef, useState } from "react";
import AudioPreview from "@/components/AudioPreview";
import { pickSupportedMimeType } from "@/lib/audio";

const TEST_RECORDING_MS = 5_000;

type Phase = "idle" | "recording" | "recorded";

export default function MicTest() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [heard, setHeard] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chunksRef = useRef<Blob[]>([]);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTest = async () => {
    setError(null);
    setHeard(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        setBlob(new Blob(chunksRef.current, { type: finalMimeType }));
        stream.getTracks().forEach((track) => track.stop());
        setPhase("recorded");
      };

      recorder.start();
      setPhase("recording");
      stopTimeoutRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, TEST_RECORDING_MS);
    } catch {
      setError("Mikrofonzugriff nicht möglich. Bitte erlaube den Zugriff in den Browsereinstellungen.");
    }
  };

  const retry = () => {
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    setBlob(null);
    setHeard(null);
    setPhase("idle");
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
      <p className="font-semibold text-gray-900 mb-1">Mikrofon-Test</p>
      <p className="text-sm text-gray-600 mb-3">
        Sag kurz etwas — die Aufnahme wird dir direkt vorgespielt, damit du sicher sein kannst, dass dein Mikrofon
        funktioniert. Diese Aufnahme wird nirgendwo hochgeladen.
      </p>

      {phase === "idle" && (
        <button
          type="button"
          onClick={startTest}
          className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold"
        >
          Mikrofon testen (5 Sekunden)
        </button>
      )}

      {phase === "recording" && <p className="text-sm text-blue-600 font-semibold animate-pulse">Nimmt auf…</p>}

      {phase === "recorded" && blob && (
        <div className="space-y-3">
          <AudioPreview blob={blob} />
          {heard === null && (
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Konntest du dich hören?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHeard(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setHeard(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Nein
                </button>
              </div>
            </div>
          )}
          {heard === true && <p className="text-sm text-green-700">✓ Mikrofon funktioniert.</p>}
          {heard === false && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="font-semibold">Ein paar Dinge, die helfen können:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Windows-Sound-Einstellungen → Eingabe: ist das richtige Mikrofon ausgewählt? Bewegt sich der Pegel-Balken, wenn du sprichst?</li>
                <li>Prüfe im Browser die Mikrofon-Berechtigung für diese Seite (Symbol links neben der Adresse) — ist evtl. ein falsches/virtuelles Gerät ausgewählt?</li>
                <li>Ist das Mikrofon an einem anderen Gerät (Headset, Webcam) angeschlossen, das gerade nicht aktiv ist?</li>
              </ul>
            </div>
          )}
          <button type="button" onClick={retry} className="text-sm text-gray-500 underline">
            Nochmal testen
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
