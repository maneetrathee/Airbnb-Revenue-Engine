import os
from dotenv import load_dotenv

load_dotenv()
"""
Properties Router
Endpoints:
  GET    /api/v1/properties/{user_id}                        → List all properties
  POST   /api/v1/properties/{user_id}                        → Add a property
  PUT    /api/v1/properties/{user_id}/{property_id}          → Edit a property
  DELETE /api/v1/properties/{user_id}/{property_id}          → Delete a property
  GET    /api/v1/properties/{property_id}/sync-settings      → Get per-property sync settings
  POST   /api/v1/properties/{property_id}/sync-settings      → Save per-property sync settings
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import create_engine, text
from datetime import datetime

router = APIRouter(prefix="/api/v1/properties", tags=["Properties"])

DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

# ── Create tables on startup ──────────────────────────────────────────────────
def ensure_tables():
    with engine.begin() as conn:
        # Core properties table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS properties (
                id           SERIAL PRIMARY KEY,
                user_id      TEXT NOT NULL,
                name         TEXT NOT NULL,
                address      TEXT,
                neighborhood TEXT,
                room_type    TEXT DEFAULT 'Entire home/apt',
                bedrooms     INTEGER DEFAULT 1,
                photo_url    TEXT,
                created_at   TIMESTAMP DEFAULT NOW(),
                updated_at   TIMESTAMP DEFAULT NOW()
            );
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_properties_user
            ON properties(user_id);
        """))

        # Per-property sync settings (overrides global)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS property_sync_settings (
                property_id  INTEGER PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
                enabled      BOOLEAN DEFAULT false,
                min_price    DECIMAL(10,2) DEFAULT 30.00,
                max_price    DECIMAL(10,2) DEFAULT 500.00,
                use_global   BOOLEAN DEFAULT true,
                updated_at   TIMESTAMP DEFAULT NOW()
            );
        """))

ensure_tables()

# ── Pydantic Models ───────────────────────────────────────────────────────────
class PropertyIn(BaseModel):
    name: str
    address: Optional[str] = ""
    neighborhood: Optional[str] = ""
    room_type: Optional[str] = "Entire home/apt"
    bedrooms: Optional[int] = 1
    photo_url: Optional[str] = ""

class PropertySyncIn(BaseModel):
    enabled: bool
    min_price: float
    max_price: float
    use_global: bool  # if True, ignore min/max and use global settings

# ── Helper: serialize a property row ─────────────────────────────────────────
def _serialize_property(row, sync=None):
    return {
        "id":           row.id,
        "user_id":      row.user_id,
        "name":         row.name,
        "address":      row.address or "",
        "neighborhood": row.neighborhood or "",
        "room_type":    row.room_type or "Entire home/apt",
        "bedrooms":     row.bedrooms or 1,
        "photo_url":    row.photo_url or "",
        "created_at":   row.created_at.isoformat() if row.created_at else None,
        "sync_settings": {
            "enabled":    sync.enabled    if sync else False,
            "min_price":  float(sync.min_price) if sync else 30.0,
            "max_price":  float(sync.max_price) if sync else 500.0,
            "use_global": sync.use_global if sync else True,
        }
    }

# ── ENDPOINT 1: List all properties for a user ────────────────────────────────
@router.get("/{user_id}")
def list_properties(user_id: str):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT p.*, ps.enabled, ps.min_price, ps.max_price, ps.use_global
            FROM properties p
            LEFT JOIN property_sync_settings ps ON p.id = ps.property_id
            WHERE p.user_id = :uid
            ORDER BY p.created_at DESC
        """), {"uid": user_id}).fetchall()

    return {
        "properties": [
            {
                "id":           r.id,
                "user_id":      r.user_id,
                "name":         r.name,
                "address":      r.address or "",
                "neighborhood": r.neighborhood or "",
                "room_type":    r.room_type or "Entire home/apt",
                "bedrooms":     r.bedrooms or 1,
                "photo_url":    r.photo_url or "",
                "created_at":   r.created_at.isoformat() if r.created_at else None,
                "sync_settings": {
                    "enabled":    r.enabled    if r.enabled is not None else False,
                    "min_price":  float(r.min_price) if r.min_price else 30.0,
                    "max_price":  float(r.max_price) if r.max_price else 500.0,
                    "use_global": r.use_global if r.use_global is not None else True,
                }
            }
            for r in rows
        ]
    }

# ── ENDPOINT 2: Add a property ────────────────────────────────────────────────
@router.post("/{user_id}")
def add_property(user_id: str, prop: PropertyIn):
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO properties (user_id, name, address, neighborhood, room_type, bedrooms, photo_url)
            VALUES (:uid, :name, :address, :neighborhood, :room_type, :bedrooms, :photo_url)
            RETURNING id
        """), {
            "uid":          user_id,
            "name":         prop.name,
            "address":      prop.address,
            "neighborhood": prop.neighborhood,
            "room_type":    prop.room_type,
            "bedrooms":     prop.bedrooms,
            "photo_url":    prop.photo_url,
        })
        property_id = result.fetchone().id

        # Create default sync settings for this property
        conn.execute(text("""
            INSERT INTO property_sync_settings (property_id, enabled, min_price, max_price, use_global)
            VALUES (:pid, false, 30.00, 500.00, true)
        """), {"pid": property_id})

    return {"success": True, "property_id": property_id}

# ── ENDPOINT 3: Edit a property ───────────────────────────────────────────────
@router.put("/{user_id}/{property_id}")
def edit_property(user_id: str, property_id: int, prop: PropertyIn):
    with engine.begin() as conn:
        result = conn.execute(text("""
            UPDATE properties
            SET name=:name, address=:address, neighborhood=:neighborhood,
                room_type=:room_type, bedrooms=:bedrooms, photo_url=:photo_url,
                updated_at=NOW()
            WHERE id=:pid AND user_id=:uid
            RETURNING id
        """), {
            "uid": user_id, "pid": property_id,
            "name": prop.name, "address": prop.address,
            "neighborhood": prop.neighborhood, "room_type": prop.room_type,
            "bedrooms": prop.bedrooms, "photo_url": prop.photo_url,
        })
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Property not found")

    return {"success": True}

# ── ENDPOINT 4: Delete a property ─────────────────────────────────────────────
@router.delete("/{user_id}/{property_id}")
def delete_property(user_id: str, property_id: int):
    with engine.begin() as conn:
        result = conn.execute(text("""
            DELETE FROM properties WHERE id=:pid AND user_id=:uid RETURNING id
        """), {"pid": property_id, "uid": user_id})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Property not found")

    return {"success": True}

# ── ENDPOINT 5: Get per-property sync settings ────────────────────────────────
@router.get("/{property_id}/sync-settings")
def get_property_sync(property_id: int):
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT * FROM property_sync_settings WHERE property_id = :pid
        """), {"pid": property_id}).fetchone()

    if not row:
        return {"enabled": False, "min_price": 30.0, "max_price": 500.0, "use_global": True}

    return {
        "enabled":    row.enabled,
        "min_price":  float(row.min_price),
        "max_price":  float(row.max_price),
        "use_global": row.use_global,
    }

# ── ENDPOINT 6: Save per-property sync settings ───────────────────────────────
@router.post("/{property_id}/sync-settings")
def save_property_sync(property_id: int, settings: PropertySyncIn):
    if settings.min_price >= settings.max_price:
        raise HTTPException(status_code=400, detail="min_price must be less than max_price")

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO property_sync_settings (property_id, enabled, min_price, max_price, use_global)
            VALUES (:pid, :enabled, :min_price, :max_price, :use_global)
            ON CONFLICT (property_id) DO UPDATE SET
                enabled    = EXCLUDED.enabled,
                min_price  = EXCLUDED.min_price,
                max_price  = EXCLUDED.max_price,
                use_global = EXCLUDED.use_global,
                updated_at = NOW()
        """), {
            "pid":       property_id,
            "enabled":   settings.enabled,
            "min_price": settings.min_price,
            "max_price": settings.max_price,
            "use_global": settings.use_global,
        })

    return {"success": True}

# ── Price Overrides ───────────────────────────────────────────────────────────
class PriceOverrideIn(BaseModel):
    listing_id: int
    override_date: str
    custom_price: float
    reason: Optional[str] = ""

def ensure_overrides_table():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS price_overrides (
                id            SERIAL PRIMARY KEY,
                listing_id    BIGINT REFERENCES listings(id),
                override_date DATE NOT NULL,
                custom_price  NUMERIC(10,2) NOT NULL,
                reason        TEXT,
                created_at    TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(listing_id, override_date)
            );
        """))

ensure_overrides_table()

@router.get("/{property_id}/overrides")
def get_overrides(property_id: int):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, listing_id, override_date, custom_price, reason
            FROM price_overrides
            WHERE listing_id = :pid
            ORDER BY override_date ASC
        """), {"pid": property_id}).fetchall()
    return {"overrides": [
        {
            "id": r.id,
            "listing_id": r.listing_id,
            "override_date": str(r.override_date),
            "custom_price": float(r.custom_price),
            "reason": r.reason or ""
        } for r in rows
    ]}

@router.post("/{property_id}/overrides")
def set_override(property_id: int, override: PriceOverrideIn):
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO price_overrides (listing_id, override_date, custom_price, reason)
            VALUES (:lid, :date, :price, :reason)
            ON CONFLICT (listing_id, override_date) DO UPDATE SET
                custom_price = EXCLUDED.custom_price,
                reason = EXCLUDED.reason
        """), {
            "lid": property_id,
            "date": override.override_date,
            "price": override.custom_price,
            "reason": override.reason
        })
    return {"success": True}

@router.delete("/{property_id}/overrides/{override_id}")
def delete_override(property_id: int, override_id: int):
    with engine.begin() as conn:
        result = conn.execute(text("""
            DELETE FROM price_overrides
            WHERE id = :oid AND listing_id = :pid
            RETURNING id
        """), {"oid": override_id, "pid": property_id})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Override not found")
    return {"success": True}
