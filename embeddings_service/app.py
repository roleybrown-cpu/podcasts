from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

MODEL_NAME = "BAAI/bge-small-en-v1.5"
model = SentenceTransformer(MODEL_NAME)

app = FastAPI()

class EmbedRequest(BaseModel):
    inputs: List[str]

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}

@app.post("/embed")
def embed(req: EmbedRequest):
    embeddings = model.encode(req.inputs, normalize_embeddings=True)
    return {"embeddings": embeddings.tolist()}
