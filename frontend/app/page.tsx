"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const router = useRouter();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = []; // Reset chunks

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder.current) return;
    
    mediaRecorder.current.onstop = async () => {
      setIsLoading(true);
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      // Send audio to FastAPI backend
      const res = await fetch("http://localhost:8000/api/process-audio", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      // Store temporarily for the next page
      localStorage.setItem("studyData", JSON.stringify(data));
      router.push("/review");
    };

    mediaRecorder.current.stop();
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 text-black">
      <h1 className="text-3xl font-bold mb-8">Step 1: Dictate Your Recipe</h1>
      {isLoading ? (
        <p className="animate-pulse text-blue-600 font-semibold">Processing with AI (Transcription & Injecting Errors)...</p>
      ) : (
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-8 py-4 rounded-full text-white font-bold transition-all ${
            isRecording ? 'bg-red-500 animate-pulse scale-105' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      )}
    </div>
  );
}