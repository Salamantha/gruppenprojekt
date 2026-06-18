"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  // NEW: A ref to permanently store finished sentences so they don't get erased
  const finalTranscriptRef = useRef(""); 
  const router = useRouter();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = "";

        // Loop through the results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            // If the browser says this chunk is finished (because you paused), save it permanently!
            finalTranscriptRef.current += event.results[i][0].transcript + " ";
          } else {
            // Otherwise, it's just the current word you are saying
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Display the permanent text + the current words being spoken
        setTranscript(finalTranscriptRef.current + interimTranscript);
      };
    } else {
      alert("Your browser does not support native speech recognition. Please use Chrome or Edge.");
    }
  }, []);

  const startRecording = () => {
    if (recognitionRef.current) {
      finalTranscriptRef.current = ""; // Clear memory on new recording
      setTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsLoading(true);

      try {
        const res = await fetch("http://localhost:8000/api/process-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcript }),
        });
        
        const data = await res.json();
        localStorage.setItem("studyData", JSON.stringify(data));
        router.push("/review");
      } catch (err) {
        console.error("Failed to process text", err);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 text-black">
      <h1 className="text-3xl font-bold mb-8">Step 1: Dictate Your Recipe</h1>
      
      <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[150px] mb-8">
        {transcript ? (
          <p className="text-lg leading-relaxed">{transcript}</p>
        ) : (
          <p className="text-gray-400 italic text-center mt-8">Your words will appear here as you speak...</p>
        )}
      </div>

      {isLoading ? (
        <p className="animate-pulse text-blue-600 font-semibold">Packaging recipe for review...</p>
      ) : (
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-8 py-4 rounded-full text-white font-bold transition-all shadow-md ${
            isRecording ? 'bg-red-500 animate-pulse scale-105' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      )}
    </div>
  );
}