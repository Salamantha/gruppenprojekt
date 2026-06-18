"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
  const router = useRouter();
  const [originalData, setOriginalData] = useState<any>(null);
  const [startTime, setStartTime] = useState(0);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  const titleRef = useRef<HTMLDivElement>(null);
  const ingredientsRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dataString = localStorage.getItem("studyData");
    if (!dataString) {
      router.push("/");
      return;
    }
    
    const data = JSON.parse(dataString);
    setOriginalData(data);
    setStartTime(Date.now());

    // NATIVE INJECTION: We put the HTML directly into the DOM once on load.
    // React will now ignore these divs during re-renders, protecting your highlights!
    const recipe = data.recipe || { title: "", ingredients: [], steps: [] };
    
    if (titleRef.current) {
      titleRef.current.innerHTML = recipe.title;
    }
    if (ingredientsRef.current) {
      ingredientsRef.current.innerHTML = recipe.ingredients.map((i: string) => `<div class="mb-2">• ${i}</div>`).join("");
    }
    if (stepsRef.current) {
      stepsRef.current.innerHTML = recipe.steps.map((s: string, idx: number) => `<div class="mb-4"><strong>${idx + 1}.</strong> ${s}</div>`).join("");
    }
  }, [router]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setToolbarPos({
        top: rect.top + window.scrollY - 50,
        left: rect.left + window.scrollX + (rect.width / 2),
      });
    } else {
      setToolbarPos(null);
    }
  };

  const handleMarkMistake = (e: React.MouseEvent) => {
    e.preventDefault(); 
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const markNode = document.createElement("mark");
    
    markNode.className = "bg-red-200 text-red-900 rounded px-1 cursor-pointer hover:bg-red-300 transition-colors";
    markNode.title = "Click to remove highlight";
    
    markNode.onclick = function(this: HTMLElement) {
      const parent = this.parentNode;
      if (!parent) return;
      while (this.firstChild) {
        parent.insertBefore(this.firstChild, this);
      }
      parent.removeChild(this);
    };

    try {
      range.surroundContents(markNode);
    } catch (err) {
      const extracted = range.extractContents();
      markNode.appendChild(extracted);
      range.insertNode(markNode);
    }

    setToolbarPos(null); // This no longer wipes out the highlight!
    selection.removeAllRanges(); 
  };

  const handleSave = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const participantId = "user_" + Math.floor(Math.random() * 10000); 

    const finalRecipeHtml = {
      title: titleRef.current?.innerHTML || "",
      ingredients: ingredientsRef.current?.innerHTML || "",
      steps: stepsRef.current?.innerHTML || ""
    };
    
    try {
      await fetch("http://localhost:8000/api/save-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participantId,
          raw_transcription: originalData?.transcription || "",
          ai_recipe_flawed: originalData?.recipe || {},
          user_recipe_corrected: finalRecipeHtml, 
          time_spent_seconds: timeSpent
        })
      });

      alert(`Study completed! Took ${timeSpent} seconds. Data sent to backend.`);
      localStorage.clear();
      router.push("/");
    } catch (error) {
      console.error("Failed to save", error);
    }
  };

  return (
    <div 
      className="bg-gray-50 min-h-screen py-10 text-black"
      onMouseUp={handleSelection} 
      onKeyUp={handleSelection} 
    >
      <div className="max-w-3xl mx-auto p-10 bg-white shadow-xl rounded-2xl border border-gray-100 relative">
        
        {toolbarPos && (
          <div 
            className="absolute z-50 transform -translate-x-1/2"
            style={{ top: toolbarPos.top, left: toolbarPos.left }}
          >
            <button
              onMouseDown={handleMarkMistake}
              className="bg-red-600 text-white px-5 py-2 rounded-lg shadow-xl text-sm font-bold hover:bg-red-700 transition-transform active:scale-95 flex items-center gap-2"
            >
              <span>Mark as Error</span>
            </button>
            <div className="w-3 h-3 bg-red-600 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
          </div>
        )}

        <header className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Step 2: Spot the AI Mistakes</h1>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mt-4">
            <p className="font-medium">
              <strong>Instructions:</strong> Read through the recipe below. If you spot an error made by the AI, 
              <strong> highlight the text with your mouse</strong> and click "Mark as Error".
            </p>
          </div>
        </header>
        
        <div className="space-y-8 text-lg">
          <div>
            <label className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3 block">Recipe Title</label>
            {/* Removed dangerouslySetInnerHTML - Let the ref handle it completely natively */}
            <div ref={titleRef} className="w-full p-4 text-2xl font-bold bg-gray-50 rounded-lg border border-gray-100" />
          </div>
          
          <div>
            <label className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3 block">Ingredients</label>
            <div ref={ingredientsRef} className="w-full p-6 bg-gray-50 rounded-lg border border-gray-100 leading-relaxed" />
          </div>

           <div>
            <label className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3 block">Instructions</label>
            <div ref={stepsRef} className="w-full p-6 bg-gray-50 rounded-lg border border-gray-100 leading-relaxed" />
          </div>

          <button 
            onClick={handleSave} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl mt-8 font-bold text-lg shadow-md transition-all active:scale-[0.98]"
          >
            Submit Results
          </button>
        </div>
      </div>
    </div>
  );
}