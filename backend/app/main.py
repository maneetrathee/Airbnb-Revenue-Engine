from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta, date
import logging
import os
from dotenv import load_dotenv

from app.revpar import router as revpar_router
from app.smart_sync import router as sync_router
from app.properties import router as properties_router
from app.scheduler import create_scheduler, get_scheduler_status, run_nightly_sync
from app.pricing_engine import PricingContext, calculate_price, calculate_forecast
from app.ml.ml_router import router as ml_router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

scheduler = create_scheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting APScheduler (3 jobs: sync, daily digest, weekly report)...")
    scheduler.start()
    status = get_scheduler_status(scheduler)
    for job in status.get("jobs", []):
        logger.info(f"  → {job['name']}: next run {job['next_run']}")
    yield
    scheduler.shutdown(wait=False)

app = FastAPI(title="Airbnb Revenue Engine API", version="4.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(revpar_router)
app.include_router(sync_router)
app.include_router(properties_router)
app.include_router(ml_router)

DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

# ── Ensure email column exists in sync_settings ───────────────────────────────
def _ensure_email_column():
    with engine.begin() as conn:
        conn.execute(text("""
            ALTER TABLE sync_settings
            ADD COLUMN IF NOT EXISTS email TEXT;
        """))

try:
    _ensure_email_column()
except Exception:
    pass  # Table may not exist yet on first run

# ── Scheduler status ──────────────────────────────────────────────────────────
@app.get("/api/v1/sync/status")
def get_sync_status():
    status = get_scheduler_status(scheduler)
    with engine.connect() as conn:
        active = conn.execute(text("""
            SELECT COUNT(*) FROM properties p
            JOIN property_sync_settings pss ON p.id = pss.property_id
            LEFT JOIN sync_settings gs ON p.user_id = gs.user_id
            WHERE p.neighborhood IS NOT NULL
              AND ((pss.use_global=true AND gs.enabled=true) OR
                   (pss.use_global=false AND pss.enabled=true))
        """)).scalar()
    status["active_properties"] = int(active or 0)
    return status

@app.post("/api/v1/sync/run-all")
def trigger_all_syncs():
    run_nightly_sync()
    return {"success": True, "message": "Sync triggered for all active properties."}

# ── Email: save user email + send test ───────────────────────────────────────
class EmailUpdate(BaseModel):
    email: str

@app.post("/api/v1/users/{user_id}/email")
def save_user_email(user_id: str, body: EmailUpdate):
    """Save the user's notification email address."""
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE sync_settings SET email = :email WHERE user_id = :uid
        """), {"email": body.email, "uid": user_id})
    return {"success": True}

@app.post("/api/v1/users/{user_id}/test-email")
def send_test_email(user_id: str):
    """
    Sends a test daily digest immediately to the user's saved email.
    Useful for verifying Resend is configured correctly.
    """
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT email FROM sync_settings WHERE user_id = :uid"
        ), {"uid": user_id}).fetchone()

    if not row or not row.email:
        raise HTTPException(400, "No email saved for this user. Save email first via POST /api/v1/users/{user_id}/email")

    from app.email_digest import send_daily_digest
    success = send_daily_digest(row.email, user_id)

    if success:
        return {"success": True, "message": f"Test email sent to {row.email}"}
    else:
        raise HTTPException(500, "Failed to send email. Check RESEND_API_KEY in your .env file.")

# ── Pricing forecast endpoints ────────────────────────────────────────────────
@app.get("/api/v1/pricing/forecast")
def smart_forecast(
    neighborhood: str = Query(...),
    days:         int   = Query(7),
    min_price:    float = Query(30),
    max_price:    float = Query(500),
    nights:       int   = Query(1),
):
    forecast = calculate_forecast(neighborhood, min_price, max_price, days, nights)
    return {"neighborhood": neighborhood, "nights_requested": nights, "forecast": forecast}

@app.get("/api/v1/pricing/check")
def price_check(
    neighborhood: str   = Query(...),
    target_date:  str   = Query(..., description="YYYY-MM-DD"),
    min_price:    float = Query(30),
    max_price:    float = Query(500),
    nights:       int   = Query(1),
):
    try:
        d = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date. Use YYYY-MM-DD.")

    ctx    = PricingContext(neighborhood=neighborhood, target_date=d,
                            min_price=min_price, max_price=max_price, nights_requested=nights)
    result = calculate_price(ctx)
    return {
        "neighborhood":     neighborhood,
        "date":             target_date,
        "base_price":       result.base_price,
        "final_price":      result.final_price,
        "total_multiplier": result.total_multiplier,
        "occupancy_rate":   result.occupancy_rate,
        "data_source":      result.data_source,
        "clamped":          result.clamped,
        "clamp_reason":     result.clamp_reason,
        "signals":          [{"name": s.name, "multiplier": s.multiplier,
                               "reason": s.reason, "magnitude": s.magnitude}
                              for s in result.signals],
        "summary":          result.summary,
    }

# ── predict-price (enriched with pricing engine) ──────────────────────────────
_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading AI Model...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

@app.get("/api/v1/predict-price")
def predict_price(description: str = Query(...)):
    model        = get_model()
    query_vector = model.encode(description).tolist()
    vector_str   = f"[{','.join(map(str, query_vector))}]"

    sql = text("""
        SELECT name, price_base, latitude, longitude, neighborhood,
               round((1 - (description_embedding <=> :vec))::numeric, 3) AS similarity
        FROM listings
        WHERE description_embedding IS NOT NULL
          AND price_base IS NOT NULL AND latitude IS NOT NULL
        ORDER BY description_embedding <=> :vec LIMIT 5
    """)
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"vec": vector_str})

    if df.empty:
        return {"error": "Not enough processed data to predict price."}

    base_price   = float(df['price_base'].mean())
    neighborhood = df['neighborhood'].mode()[0] if 'neighborhood' in df.columns else None

    if neighborhood:
        forecast = calculate_forecast(neighborhood, 30, 9999, 7, 1)
        for day in forecast:
            ratio      = base_price / day["base_price"] if day["base_price"] > 0 else 1
            day["price"] = round(day["price"] * ratio, 2)
            day["tags"]  = [day["summary"][:45]] if day["summary"] else ["Standard Rate"]
    else:
        forecast = []
        today    = datetime.now()
        for i in range(7):
            t = today + timedelta(days=i)
            modifier, tags = 1.0, []
            if t.weekday() in [4,5]: modifier += 0.15; tags.append("Weekend (+15%)")
            if t.month in [6,7,8]:  modifier += 0.20; tags.append("Summer Peak (+20%)")
            elif t.month in [11,12]: modifier += 0.10; tags.append("Holiday Demand (+10%)")
            if not tags: tags.append("Standard Rate")
            forecast.append({"date": t.strftime("%b %d"), "day": t.strftime("%a"),
                             "price": round(base_price * modifier, 2), "tags": tags})

    return {"query": description, "base_price": round(base_price, 2),
            "similar_listings": df.to_dict(orient="records"), "forecast": forecast}


# ── Arbitrage router (Feature 3) ──────────────────────────────────────────────
from app.arbitrage import router as arbitrage_router
from app.events import router as events_router
from app.ical import router as ical_router
from app.competitors import router as competitors_router
from app.sentiment import router as sentiment_router
app.include_router(arbitrage_router)
app.include_router(events_router)
app.include_router(ical_router)
app.include_router(competitors_router)
app.include_router(sentiment_router)