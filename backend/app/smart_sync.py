import os
from dotenv import load_dotenv

load_dotenv()
"""
Smart Sync Router — now powered by pricing_engine.py
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from datetime import datetime
from app.pricing_engine import PricingContext, calculate_price
from datetime import date

router = APIRouter(prefix="/api/v1/sync", tags=["SmartSync"])
DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

def ensure_tables():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sync_settings (
                user_id     TEXT PRIMARY KEY,
                enabled     BOOLEAN DEFAULT false,
                min_price   DECIMAL(10,2) DEFAULT 30.00,
                max_price   DECIMAL(10,2) DEFAULT 500.00,
                neighborhood TEXT,
                updated_at  TIMESTAMP DEFAULT NOW()
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sync_logs (
                id          SERIAL PRIMARY KEY,
                user_id     TEXT NOT NULL,
                action      TEXT NOT NULL,
                details     TEXT,
                status      TEXT DEFAULT 'success',
                created_at  TIMESTAMP DEFAULT NOW()
            );
        """))

ensure_tables()

class SyncSettings(BaseModel):
    enabled: bool
    min_price: float
    max_price: float
    neighborhood: str

@router.get("/settings/{user_id}")
def get_settings(user_id: str):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT * FROM sync_settings WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()
    if not row:
        return {"user_id": user_id, "enabled": False, "min_price": 30.00,
                "max_price": 500.00, "neighborhood": "", "updated_at": None}
    return {"user_id": row.user_id, "enabled": row.enabled,
            "min_price": float(row.min_price), "max_price": float(row.max_price),
            "neighborhood": row.neighborhood or "", "updated_at": row.updated_at.isoformat() if row.updated_at else None}

@router.post("/settings/{user_id}")
def save_settings(user_id: str, settings: SyncSettings):
    if settings.min_price >= settings.max_price:
        raise HTTPException(400, "min_price must be less than max_price")
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO sync_settings (user_id, enabled, min_price, max_price, neighborhood, updated_at)
            VALUES (:uid, :enabled, :min, :max, :n, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                enabled=EXCLUDED.enabled, min_price=EXCLUDED.min_price,
                max_price=EXCLUDED.max_price, neighborhood=EXCLUDED.neighborhood, updated_at=NOW()
        """), {"uid": user_id, "enabled": settings.enabled, "min": settings.min_price,
               "max": settings.max_price, "n": settings.neighborhood})
        conn.execute(text("""
            INSERT INTO sync_logs (user_id, action, details, status) VALUES (:uid, :a, :d, 'success')
        """), {"uid": user_id,
               "action": "Auto-sync ENABLED" if settings.enabled else "Auto-sync DISABLED",
               "details": f"Guardrails: £{settings.min_price}–£{settings.max_price} | Area: {settings.neighborhood}"})
    return {"success": True}

@router.post("/trigger/{user_id}")
def trigger_sync(user_id: str):
    settings = get_settings(user_id)
    if not settings["enabled"]:
        raise HTTPException(400, "Auto-sync is disabled.")
    if not settings["neighborhood"]:
        raise HTTPException(400, "No neighborhood configured.")

    # Use the full pricing engine for today's date
    ctx = PricingContext(
        neighborhood=settings["neighborhood"],
        target_date=date.today(),
        min_price=settings["min_price"],
        max_price=settings["max_price"],
    )
    result = calculate_price(ctx)

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO sync_logs (user_id, action, details, status) VALUES (:uid, :a, :d, 'success')
        """), {"uid": user_id,
               "action": f"Sync complete — {result.summary}",
               "details": f"Base: £{result.base_price} → Final: £{result.final_price} | {result.clamp_reason or 'Within guardrails'} | Source: {result.data_source}"})

    return {
        "success": True,
        "neighborhood": settings["neighborhood"],
        "occupancy_rate": result.occupancy_rate,
        "base_price": result.base_price,
        "final_price": result.final_price,
        "signals": [{"name": s.name, "reason": s.reason, "multiplier": s.multiplier} for s in result.signals],
        "summary": result.summary,
        "clamped": result.clamped,
        "synced_at": datetime.now().isoformat(),
    }

@router.get("/logs/{user_id}")
def get_logs(user_id: str):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT action, details, status, created_at FROM sync_logs
            WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20
        """), {"uid": user_id}).fetchall()
    return {"logs": [{"action": r.action, "details": r.details,
                      "status": r.status, "created_at": r.created_at.isoformat()} for r in rows]}