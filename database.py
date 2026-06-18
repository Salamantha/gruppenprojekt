from motor.motor_asyncio import AsyncIOMotorClient
import os

# Defaults to local MongoDB, but Vercel/Render will pass a real MONGO_URL
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)

# Database: recipe_study | Collection: results
db = client.recipe_study
collection = db.results