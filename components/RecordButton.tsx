"use client";

import { useRef, useState } from "react";

interface RecordButtonProps {
  disabled?: boolean;
  onRecordingComplete: (blob: Blob, mimeType: string, durationMs: number) => void;
}

const MAX_RECORDING_MS = 90_000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

export default function RecordButton({ disabled, onRecordingComplete }: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecording = () => {
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        const durationMs = Date.now() - startTimeRef.current;
        stream.getTracks().forEach((track) => track.stop());
        onRecordingComplete(blob, finalMimeType, durationMs);
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
      stopTimeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      setError("Mikrofonzugriff nicht möglich. Bitte erlaube den Zugriff in den Browsereinstellungen.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={isRecording ? stopRecording : startRecording}
        aria-label={isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
        className={`h-24 w-24 rounded-full text-white text-3xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
          isRecording ? "bg-red-500 animate-pulse scale-105" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isRecording ? "■" : "●"}
      </button>
      <p className="text-sm text-gray-500 text-center">
        {isRecording ? "Aufnahme läuft — antippen zum Stoppen" : "Antippen, um die Aufnahme zu starten"}
      </p>
      {error && <p className="text-sm text-red-600 text-center max-w-xs">{error}</p>}
    </div>
  );
}
