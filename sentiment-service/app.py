from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

app = FastAPI()

model_name = "5CD-AI/Vietnamese-Sentiment-visobert"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

class TextRequest(BaseModel):
    text: str

@app.post("/api/v1/predict-sentiment")
@app.post("/api/v1/predict-sentiment")
def predict_sentiment(request: TextRequest):
    inputs = tokenizer(request.text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probabilities = torch.softmax(logits, dim=1)[0]

    labels = ["NEG", "POS", "NEU"]
    predicted_index = torch.argmax(probabilities).item()
    predicted_label = labels[predicted_index]
    confidence = probabilities[predicted_index].item()

    return {
        "label": predicted_label,
        "confidence": round(confidence, 4)  
    }

