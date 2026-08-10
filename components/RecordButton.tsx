"use client";

import { useEffect, useRef, useState } from "react";

interface RecordButtonProps {
  disabled?: boolean;
  onRecordingComplete: (blob: Blob, mimeType: string, durationMs: number) => void;
}

const MAX_RECORDING_MS = 60_000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function RecordButton({ disabled, onRecordingComplete }: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [remainingMs, setRemainingMs] = useState(MAX_RECORDING_MS);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  const stopRecording = () => {
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
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
      setRemainingMs(MAX_RECORDING_MS);
      stopTimeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
      tickIntervalRef.current = setInterval(() => {
        setRemainingMs(MAX_RECORDING_MS - (Date.now() - startTimeRef.current));
      }, 250);
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
      {isRecording ? (
        <p className="text-sm text-gray-500 text-center">
          Aufnahme läuft — noch <span className="font-mono font-semibold">{formatRemaining(remainingMs)}</span>{" "}
          (antippen zum vorzeitigen Stoppen)
        </p>
      ) : (
        <p className="text-sm text-gray-500 text-center">
          Antippen, um die Aufnahme zu starten (maximal 1 Minute)
        </p>
      )}
      {error && <p className="text-sm text-red-600 text-center max-w-xs">{error}</p>}
    </div>
  );
}
