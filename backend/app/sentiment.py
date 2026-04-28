"""
Sentiment Analysis API
GET  /api/v1/sentiment/neighbourhood?name=Westminster   — score breakdown
GET  /api/v1/sentiment/compare?a=Westminster&b=Camden   — side by side
GET  /api/v1/sentiment/rankings                         — all neighbourhoods ranked
POST /api/v1/sentiment/analyse-reviews                  — AI review analysis (Claude)
POST /api/v1/sentiment/score-description                — AI description scorer
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import httpx, os
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/api/v1/sentiment", tags=["Sentiment"])
DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

SCORE_FIELDS = [
    "review_scores_rating",
    "review_scores_cleanliness",
    "review_scores_checkin",
    "review_scores_communication",
    "review_scores_location",
    "review_scores_value",
    "review_scores_accuracy",
]

SCORE_LABELS = {
    "review_scores_rating":        "Overall",
    "review_scores_cleanliness":   "Cleanliness",
    "review_scores_checkin":       "Check-in",
    "review_scores_communication": "Communication",
    "review_scores_location":      "Location",
    "review_scores_value":         "Value",
    "review_scores_accuracy":      "Accuracy",
}

def _get_neighbourhood_scores(name: str) -> dict:
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT
                COUNT(*)                                              AS total,
                COUNT(review_scores_rating)                           AS reviewed,
                ROUND(AVG(review_scores_rating)::numeric,      3)    AS rating,
                ROUND(AVG(review_scores_cleanliness)::numeric,  3)   AS cleanliness,
                ROUND(AVG(review_scores_checkin)::numeric,      3)   AS checkin,
                ROUND(AVG(review_scores_communication)::numeric, 3)  AS communication,
                ROUND(AVG(review_scores_location)::numeric,     3)   AS location,
                ROUND(AVG(review_scores_value)::numeric,        3)   AS value,
                ROUND(AVG(review_scores_accuracy)::numeric,     3)   AS accuracy,
                ROUND(AVG(reviews_per_month)::numeric,          2)   AS reviews_per_month,
                ROUND(AVG(price_base)::numeric,                 2)   AS avg_price
            FROM listings
            WHERE neighborhood = :n
        """), {"n": name}).fetchone()

    if not row or not row.total:
        raise HTTPException(404, f"No data for '{name}'")

    return {
        "neighbourhood":    name,
        "total_listings":   int(row.total),
        "reviewed":         int(row.reviewed or 0),
        "avg_price":        float(row.avg_price or 0),
        "reviews_per_month": float(row.reviews_per_month or 0),
        "scores": {
            "Overall":       float(row.rating or 0),
            "Cleanliness":   float(row.cleanliness or 0),
            "Check-in":      float(row.checkin or 0),
            "Communication": float(row.communication or 0),
            "Location":      float(row.location or 0),
            "Value":         float(row.value or 0),
            "Accuracy":      float(row.accuracy or 0),
        }
    }

@router.get("/neighbourhood")
def get_neighbourhood_sentiment(name: str = Query(...)):
    return _get_neighbourhood_scores(name)

@router.get("/compare")
def compare_neighbourhoods(a: str = Query(...), b: str = Query(...)):
    return {
        "a": _get_neighbourhood_scores(a),
        "b": _get_neighbourhood_scores(b),
    }

@router.get("/rankings")
def get_rankings(metric: str = Query("Overall"), limit: int = Query(33)):
    col_map = {
        "Overall":       "review_scores_rating",
        "Cleanliness":   "review_scores_cleanliness",
        "Check-in":      "review_scores_checkin",
        "Communication": "review_scores_communication",
        "Location":      "review_scores_location",
        "Value":         "review_scores_value",
        "Accuracy":      "review_scores_accuracy",
    }
    col = col_map.get(metric, "review_scores_rating")

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT
                neighborhood,
                ROUND(AVG({col})::numeric, 3)              AS score,
                ROUND(AVG(review_scores_rating)::numeric, 3) AS overall,
                COUNT(*)                                    AS listings,
                COUNT({col})                                AS reviewed
            FROM listings
            WHERE {col} IS NOT NULL AND neighborhood IS NOT NULL
            GROUP BY neighborhood
            HAVING COUNT({col}) >= 20
            ORDER BY score DESC
            LIMIT :lim
        """), {"lim": limit}).fetchall()

    return {
        "metric": metric,
        "rankings": [
            {
                "rank":          i + 1,
                "neighbourhood": r.neighborhood,
                "score":         float(r.score),
                "overall":       float(r.overall),
                "listings":      int(r.listings),
                "reviewed":      int(r.reviewed),
            }
            for i, r in enumerate(rows)
        ]
    }

# ── AI endpoints ──────────────────────────────────────────────────────────────

class ReviewsRequest(BaseModel):
    reviews: str          # raw pasted review text
    neighbourhood: str = ""

class DescriptionRequest(BaseModel):
    description: str
    neighbourhood: str = ""

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

async def _call_claude(prompt: str, system: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key":         ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type":      "application/json",
            },
            json={
                "model":      "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "system":     system,
                "messages":   [{"role": "user", "content": prompt}],
            }
        )
        if resp.status_code != 200:
            raise HTTPException(500, f"Claude API error: {resp.text}")
        data = resp.json()
        return data["content"][0]["text"]

@router.post("/analyse-reviews")
async def analyse_reviews(req: ReviewsRequest):
    if not ANTHROPIC_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set")
    if len(req.reviews.strip()) < 50:
        raise HTTPException(400, "Please provide at least a few reviews to analyse")

    system = """You are an expert Airbnb host analyst. Analyse guest reviews and return ONLY a JSON object with exactly this structure:
{
  "sentiment_score": <number 1-10>,
  "summary": "<2 sentence overall summary>",
  "praise_themes": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "complaint_themes": ["<theme 1>", "<theme 2>"],
  "improvement_suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"],
  "guest_profile": "<who typically stays here>",
  "pricing_signal": "<are guests happy with value or mentioning price negatively>"
}
Return ONLY the JSON, no markdown, no explanation."""

    prompt = f"Analyse these Airbnb guest reviews:\n\n{req.reviews[:3000]}"
    if req.neighbourhood:
        prompt += f"\n\nThis listing is in {req.neighbourhood}."

    text_result = await _call_claude(prompt, system)

    import json
    try:
        return json.loads(text_result)
    except Exception:
        return {"raw": text_result, "parse_error": True}

@router.post("/score-description")
async def score_description(req: DescriptionRequest):
    if not ANTHROPIC_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set")
    if len(req.description.strip()) < 30:
        raise HTTPException(400, "Description too short")

    system = """You are an expert Airbnb copywriter. Score a listing description and return ONLY a JSON object:
{
  "overall_score": <number 1-10>,
  "scores": {
    "clarity": <1-10>,
    "emotional_appeal": <1-10>,
    "usp_strength": <1-10>,
    "local_context": <1-10>,
    "call_to_action": <1-10>
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "rewrite_suggestion": "<improved version of the first 2 sentences>",
  "missing_elements": ["<what's missing 1>", "<what's missing 2>"]
}
Return ONLY the JSON, no markdown, no explanation."""

    prompt = f"Score this Airbnb listing description:\n\n{req.description[:2000]}"
    if req.neighbourhood:
        prompt += f"\n\nThis listing is in {req.neighbourhood}, London."

    text_result = await _call_claude(prompt, system)

    import json
    try:
        return json.loads(text_result)
    except Exception:
        return {"raw": text_result, "parse_error": True}
