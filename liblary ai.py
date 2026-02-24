import whisper
import pyttsx3
import sounddevice as sd
import numpy as np

# Load Whisper model
model = whisper.load_model("base")

# Record audio
duration = 5  # seconds
sample_rate = 16000
print("Speak now...")
audio = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1)
sd.wait()

# Convert to text
result = model.transcribe(np.squeeze(audio))
print("You said:", result["text"])

# Respond with voice
engine = pyttsx3.init()
engine.say("You said " + result["text"])
engine.runAndWait()
