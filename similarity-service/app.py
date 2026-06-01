import logging

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, util

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("similarity-service")

MODEL_NAME = "BAAI/bge-m3"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

logger.info("Loading model %s on device=%s ...", MODEL_NAME, DEVICE)
model = SentenceTransformer(MODEL_NAME, device=DEVICE)
logger.info("Model loaded.")

app = FastAPI(title="BGE-M3 Similarity Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimilarityRequest(BaseModel):
    user_answer: str = Field(default="")
    reference_answer: str = Field(default="")


class SimilarityResponse(BaseModel):
    similarity_score: float


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "device": DEVICE}


@app.post("/api/v1/similarity", response_model=SimilarityResponse)
def similarity(req: SimilarityRequest):
    user_answer = (req.user_answer or "").strip()
    reference_answer = (req.reference_answer or "").strip()

    if not user_answer or not reference_answer:
        return SimilarityResponse(similarity_score=0.0)

    try:
        embeddings = model.encode(
            [user_answer, reference_answer],
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        cosine = util.cos_sim(embeddings[0], embeddings[1]).item()
        # Cosine of normalized embeddings is in [-1, 1]; clamp to [0, 1].
        score = max(0.0, min(1.0, cosine))
        return SimilarityResponse(similarity_score=round(score, 4))
    except Exception:
        logger.exception("Failed to compute similarity")
        return JSONResponse(
            status_code=500,
            content={"detail": "similarity computation failed"},
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
