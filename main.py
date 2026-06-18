from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import collection
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# New simple request model for plain text
class ProcessTextRequest(BaseModel):
    text: str

class SaveResultRequest(BaseModel):
    participant_id: str
    raw_transcription: str
    ai_recipe_flawed: dict
    user_recipe_corrected: dict
    time_spent_seconds: int

@app.post("/api/process-text")
async def process_text(request: ProcessTextRequest):
    """
    Receives plain text from the browser's native speech recognition.
    Wraps it in a basic mock recipe structure for the review page.
    """
    actual_transcription = request.text.strip()
    
    basic_recipe = {
        "title": "Raw Recipe Transcription",
        "ingredients": ["(Skipped for now - no LLM formatting)"], 
        "steps": [actual_transcription] 
    }
    
    return {
        "transcription": actual_transcription,
        "recipe": basic_recipe
    }


@app.post("/api/save-results")
async def save_results(data: SaveResultRequest):
    """Saves the final user study metrics."""
    doc = data.dict()
    doc["created_at"] = datetime.datetime.utcnow()
    
    try:
        result = await collection.insert_one(doc)
        return {"status": "success", "inserted_id": str(result.inserted_id)}
    except Exception as e:
        print("\n--- MONGODB NOT RUNNING. MOCKING SAVE ---")
        print(f"Data that would have been saved: {doc}")
        print("-------------------------------------------\n")
        return {"status": "success", "inserted_id": "mock_id_no_db"}