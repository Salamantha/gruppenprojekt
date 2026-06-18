"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
  const router = useRouter();
  const [recipe, setRecipe] = useState({ title: "", ingredients: [], steps: [] });
  const [originalData, setOriginalData] = useState<any>(null);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    const dataString = localStorage.getItem("studyData");
    if (!dataString) {
      router.push("/"); // Kick back if no data
      return;
    }
    
    const data = JSON.parse(dataString);
    setOriginalData(data);
    setRecipe(data.recipe || { title: "", ingredients: [], steps: [] });
    setStartTime(Date.now()); // Start the proofreading timer
  }, [router]);

  const handleSave = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const participantId = "user_" + Math.floor(Math.random() * 10000); // Generate anon ID
    
    try {
      await fetch("http://localhost:8000/api/save-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participantId,
          raw_transcription: originalData?.transcription || "",
          ai_recipe_flawed: originalData?.recipe || {},
          user_recipe_corrected: recipe,
          time_spent_seconds: timeSpent
        })
      });

      alert(`Study completed! Took ${timeSpent} seconds. Data saved to MongoDB.`);
      localStorage.clear();
      router.push("/");
    } catch (error) {
      console.error("Failed to save", error);
    }
  };

  if (!originalData) return null;

  return (
    <div className="max-w-2xl mx-auto p-8 text-black bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Step 2: Proofread & Correct</h1>
      <p className="mb-8 text-gray-600">Please fix any errors the AI made in the recipe below.</p>
      
      <div className="space-y-6">
        <div>
          <label className="font-bold text-sm text-gray-700 uppercase tracking-wide">Recipe Title</label>
          <input 
            value={recipe.title} 
            onChange={e => setRecipe({...recipe, title: e.target.value})}
            className="w-full border-2 border-gray-200 p-3 rounded-lg mt-1 focus:border-blue-500 focus:outline-none"
          />
        </div>
        
        <div>
          <label className="font-bold text-sm text-gray-700 uppercase tracking-wide">Ingredients (Raw JSON editor)</label>
          <textarea 
            value={JSON.stringify(recipe.ingredients, null, 2)} 
            onChange={e => {
              try { setRecipe({...recipe, ingredients: JSON.parse(e.target.value)}) } 
              catch { /* ignore invalid JSON while typing */ }
            }}
            className="w-full border-2 border-gray-200 p-3 rounded-lg mt-1 h-40 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

         <div>
          <label className="font-bold text-sm text-gray-700 uppercase tracking-wide">Steps (Raw JSON editor)</label>
          <textarea 
            value={JSON.stringify(recipe.steps, null, 2)} 
            onChange={e => {
              try { setRecipe({...recipe, steps: JSON.parse(e.target.value)}) } 
              catch { /* ignore invalid JSON while typing */ }
            }}
            className="w-full border-2 border-gray-200 p-3 rounded-lg mt-1 h-40 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button 
          onClick={handleSave} 
          className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg mt-4 font-bold transition-colors"
        >
          Save & Finish Study
        </button>
      </div>
    </div>
  );
}