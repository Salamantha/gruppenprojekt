import os
import whisper

# Define where your audio files are, and where you want the text files to go
audio_directory = "./"  # Change this if your mp3s are in a specific folder
output_directory = "./transcriptions"

# Create the output directory if it doesn't exist
os.makedirs(output_directory, exist_ok=True)

# Load the Whisper model 
# 'base' is fast and uses minimal RAM. If you need higher accuracy, change to 'small' or 'medium'.
print("Loading Whisper model...")
model = whisper.load_model("medium")

# Iterate through all files in your directory
for filename in os.listdir(audio_directory):
    if filename.endswith(".m4a"):
        file_path = os.path.join(audio_directory, filename)
        print(f"Transcribing: {filename}...")
        
        # Perform the transcription
        # fp16=False prevents a warning if you are running this on a CPU instead of a GPU
        result = model.transcribe(file_path, fp16=False) 
        
        # Create a text file with the same name as the MP3
        output_filename = filename.replace(".m4a", ".txt")
        output_path = os.path.join(output_directory, output_filename)
        
        # Save the transcribed text
        with open(output_path, "w", encoding="utf-8") as text_file:
            text_file.write(result["text"].strip())
            
        print(f"Saved: {output_filename}")

print("\nAll 25 files have been transcribed successfully!")