from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import collection
import datetime

app = FastAPI()

# Allow Next.js frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Update this to your Vercel URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SaveResultRequest(BaseModel):
    participant_id: str
    raw_transcription: str
    ai_recipe_flawed: dict
    user_recipe_corrected: dict
    time_spent_seconds: int

@app.post("/api/process-audio")
async def process_audio(audio: UploadFile = File(...)):
    """
    Receives the .webm audio file. 
    Currently returns MOCK data so you can build the UI. 
    Replace this later with Whisper API + LLM API calls.
    """
    # 1. Save or stream 'audio.file' to Whisper here...
    mock_transcription = "so first you take two cups of flour and mix it with water then bake it"
    
    # 2. Pass transcription to LLM to structure and inject mistakes here...
    mock_flawed_recipe = {
        "title": "Simple Bread",
        "ingredients": ["2 cups flour", "10 gallons water"], # Intentional mistake
        "steps": ["Mix flour and water", "Bake at 500 degrees for 5 minutes"] # Intentional mistake
    }
    
    return {
        "transcription": mock_transcription,
        "recipe": mock_flawed_recipe
    }

@app.post("/api/save-results")
async def save_results(data: SaveResultRequest):
    """Saves the final user study metrics to MongoDB."""
    doc = data.dict()
    doc["created_at"] = datetime.datetime.utcnow()
    
    result = await collection.insert_one(doc)
    return {"status": "success", "inserted_id": str(result.inserted_id)}

# Run locally using: uvicorn main:app --reload