"""
iCal Live Sync
POST /api/v1/ical/sync          — save URL + fetch bookings
GET  /api/v1/ical/bookings/{id} — get bookings for a property
GET  /api/v1/ical/status/{id}   — last sync time + count
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from datetime import date, datetime
import httpx
import re
import os
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/api/v1/ical", tags=["iCal"])
DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

def ensure_tables():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ical_bookings (
                id          SERIAL PRIMARY KEY,
                property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
                start_date  DATE NOT NULL,
                end_date    DATE NOT NULL,
                summary     TEXT,
                uid         TEXT,
                synced_at   TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ical_urls (
                property_id INTEGER PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
                url         TEXT NOT NULL,
                last_synced TIMESTAMPTZ,
                booking_count INTEGER DEFAULT 0
            );
        """))

ensure_tables()

class ICalSyncRequest(BaseModel):
    property_id: int
    ical_url: str

def _parse_ics(content: str) -> list:
    """Parse VEVENT blocks from .ics content."""
    bookings = []
    events   = re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", content, re.DOTALL)

    for event in events:
        def get_field(name):
            m = re.search(rf"{name}[^:]*:(.*)", event)
            return m.group(1).strip() if m else ""

        dtstart  = get_field("DTSTART")
        dtend    = get_field("DTEND")
        summary  = get_field("SUMMARY")
        uid      = get_field("UID")

        # Skip blocked/unavailable non-booking entries
        if summary.upper() in ("AIRBNB (NOT AVAILABLE)", "NOT AVAILABLE", "BLOCKED"):
            continue

        try:
            # Handle both YYYYMMDD and YYYYMMDDTHHMMSSZ formats
            start = date(int(dtstart[:4]), int(dtstart[4:6]), int(dtstart[6:8]))
            end   = date(int(dtend[:4]),   int(dtend[4:6]),   int(dtend[6:8]))
            if start < end:  # skip zero-length events
                bookings.append({
                    "start_date": start,
                    "end_date":   end,
                    "summary":    summary[:200] if summary else "Booking",
                    "uid":        uid[:200] if uid else "",
                })
        except Exception:
            continue

    return bookings

@router.post("/sync")
async def sync_ical(req: ICalSyncRequest):
    # Fetch the .ics file
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(req.ical_url)
            if resp.status_code != 200:
                raise HTTPException(400, f"Could not fetch iCal URL (HTTP {resp.status_code})")
            content = resp.text
    except httpx.RequestError as e:
        raise HTTPException(400, f"Failed to fetch iCal: {str(e)}")

    if "BEGIN:VCALENDAR" not in content:
        raise HTTPException(400, "URL does not appear to be a valid iCal feed")

    bookings = _parse_ics(content)

    # Save URL and upsert bookings
    with engine.begin() as conn:
        # Save/update URL
        conn.execute(text("""
            INSERT INTO ical_urls (property_id, url, last_synced, booking_count)
            VALUES (:pid, :url, NOW(), :count)
            ON CONFLICT (property_id) DO UPDATE SET
                url = EXCLUDED.url,
                last_synced = NOW(),
                booking_count = EXCLUDED.booking_count
        """), {"pid": req.property_id, "url": req.ical_url, "count": len(bookings)})

        # Clear old bookings for this property
        conn.execute(text(
            "DELETE FROM ical_bookings WHERE property_id = :pid"
        ), {"pid": req.property_id})

        # Insert fresh bookings
        for b in bookings:
            conn.execute(text("""
                INSERT INTO ical_bookings (property_id, start_date, end_date, summary, uid)
                VALUES (:pid, :start, :end, :summary, :uid)
            """), {
                "pid":     req.property_id,
                "start":   b["start_date"],
                "end":     b["end_date"],
                "summary": b["summary"],
                "uid":     b["uid"],
            })

    return {
        "success":       True,
        "property_id":   req.property_id,
        "bookings_found": len(bookings),
        "synced_at":     datetime.now().isoformat(),
    }

@router.get("/bookings/{property_id}")
def get_bookings(property_id: int, year: int = 2026, month: int = 1):
    """Return booked date ranges for a property in a given month."""
    import calendar as cal
    days_in_month = cal.monthrange(year, month)[1]
    month_start   = date(year, month, 1)
    month_end     = date(year, month, days_in_month)

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT start_date, end_date, summary
            FROM ical_bookings
            WHERE property_id = :pid
              AND start_date <= :end
              AND end_date   >= :start
            ORDER BY start_date
        """), {"pid": property_id, "start": month_start, "end": month_end}).fetchall()

    # Expand each booking into individual booked dates
    booked_dates = set()
    for row in rows:
        d = max(row.start_date, month_start)
        while d < min(row.end_date, month_end + __import__('datetime').timedelta(days=1)):
            booked_dates.add(d.strftime("%Y-%m-%d"))
            d = d + __import__('datetime').timedelta(days=1)

    return {
        "property_id":  property_id,
        "year":         year,
        "month":        month,
        "booked_dates": sorted(list(booked_dates)),
        "bookings":     [
            {
                "start_date": str(r.start_date),
                "end_date":   str(r.end_date),
                "summary":    r.summary,
            } for r in rows
        ],
    }

@router.get("/status/{property_id}")
def get_status(property_id: int):
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT url, last_synced, booking_count
            FROM ical_urls WHERE property_id = :pid
        """), {"pid": property_id}).fetchone()

    if not row:
        return {"property_id": property_id, "configured": False}

    return {
        "property_id":   property_id,
        "configured":    True,
        "url":           row.url,
        "last_synced":   row.last_synced.isoformat() if row.last_synced else None,
        "booking_count": row.booking_count,
    }
