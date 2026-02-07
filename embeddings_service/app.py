from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from fastembed import TextEmbedding

MODEL_NAME = "BAAI/bge-small-en-v1.5"
model = TextEmbedding(model_name=MODEL_NAME)

app = FastAPI()

class EmbedRequest(BaseModel):
    inputs: List[str]

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}

@app.post("/embed")
def embed(req: EmbedRequest):
    embeddings = list(model.embed(req.inputs))
    return {"embeddings": [embedding.tolist() for embedding in embeddings]}
