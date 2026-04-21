"""
Events & Holiday Surge API
GET /api/v1/events/holidays?year=2026
GET /api/v1/events/surge?neighborhood=Westminster&year=2026&month=8
"""

from fastapi import APIRouter, Query
import httpx
from datetime import date, timedelta
import calendar

router = APIRouter(prefix="/api/v1/events", tags=["Events"])

# Curated London major events by month (month -> list of (day, name, tier))
# tier: "high" | "medium"
LONDON_EVENTS = {
    1:  [(1, "New Year's Day", "high")],
    2:  [(14, "Valentine's Day", "medium")],
    3:  [(17, "St Patrick's Day Parade", "medium")],
    4:  [(1, "Easter Weekend", "high"), (20, "London Marathon", "high")],
    5:  [(1, "May Day", "high"), (26, "Spring Bank Holiday", "high"),
         (25, "Chelsea Flower Show", "medium")],
    6:  [(14, "Trooping the Colour", "high"), (21, "Royal Ascot", "medium"),
         (28, "Glastonbury", "medium")],
    7:  [(4, "Wimbledon Finals", "high"), (12, "Notting Hill Carnival Prep", "medium")],
    8:  [(25, "Notting Hill Carnival", "high"), (26, "Notting Hill Carnival", "high")],
    9:  [(1, "London Fashion Week", "high"), (15, "Open House London", "medium")],
    10: [(31, "Halloween", "medium")],
    11: [(5, "Bonfire Night", "medium"), (11, "Remembrance Sunday", "medium"),
         (15, "Winter Wonderland Opens", "medium")],
    12: [(24, "Christmas Eve", "high"), (25, "Christmas Day", "high"),
         (26, "Boxing Day", "high"), (31, "New Year's Eve", "high")],
}

async def fetch_uk_holidays(year: int) -> list:
    """Fetch UK bank holidays from Open Holidays API (free, no key needed)"""
    try:
        url = f"https://openholidaysapi.org/PublicHolidays?countryIsoCode=GB&languageIsoCode=EN&validFrom={year}-01-01&validTo={year}-12-31"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return [
                    {
                        "date": h["startDate"],
                        "name": h["name"][0]["text"] if h.get("name") else "Bank Holiday",
                        "tier": "high"
                    }
                    for h in data
                    if h.get("startDate", "").startswith(str(year))
                ]
    except Exception:
        pass

    # Fallback: hardcoded 2026 UK bank holidays
    return [
        {"date": "2026-01-01", "name": "New Year's Day", "tier": "high"},
        {"date": "2026-04-03", "name": "Good Friday", "tier": "high"},
        {"date": "2026-04-06", "name": "Easter Monday", "tier": "high"},
        {"date": "2026-05-04", "name": "Early May Bank Holiday", "tier": "high"},
        {"date": "2026-05-25", "name": "Spring Bank Holiday", "tier": "high"},
        {"date": "2026-08-31", "name": "Summer Bank Holiday", "tier": "high"},
        {"date": "2026-12-25", "name": "Christmas Day", "tier": "high"},
        {"date": "2026-12-28", "name": "Boxing Day (substitute)", "tier": "high"},
    ]

@router.get("/holidays")
async def get_holidays(year: int = Query(2026)):
    holidays = await fetch_uk_holidays(year)
    return {"year": year, "holidays": holidays}

@router.get("/surge")
async def get_surge_calendar(
    neighborhood: str = Query("Westminster"),
    year: int = Query(2026),
    month: int = Query(...),
):
    holidays = await fetch_uk_holidays(year)
    holiday_dates = {h["date"]: h["name"] for h in holidays}

    month_events = LONDON_EVENTS.get(month, [])
    days_in_month = calendar.monthrange(year, month)[1]

    result = []
    for day in range(1, days_in_month + 1):
        d = date(year, month, day)
        date_str = d.strftime("%Y-%m-%d")
        weekday = d.weekday()  # 0=Mon, 6=Sun

        events = []
        tier = "normal"
        surge_pct = 0

        # Bank holiday check
        if date_str in holiday_dates:
            events.append(holiday_dates[date_str])
            tier = "high"
            surge_pct = 40

        # London events check
        for (eday, ename, etier) in month_events:
            if eday == day:
                events.append(ename)
                if etier == "high":
                    tier = "high"
                    surge_pct = max(surge_pct, 35)
                elif etier == "medium" and tier == "normal":
                    tier = "medium"
                    surge_pct = max(surge_pct, 18)

        # Weekend uplift
        if weekday in [4, 5] and tier == "normal":  # Fri/Sat
            tier = "medium"
            surge_pct = 15
        elif weekday in [4, 5] and tier == "medium":
            surge_pct = max(surge_pct, 20)
        elif weekday in [4, 5] and tier == "high":
            surge_pct = max(surge_pct, 45)

        result.append({
            "date": date_str,
            "day": day,
            "weekday": d.strftime("%a"),
            "tier": tier,
            "surge_pct": surge_pct,
            "events": events,
        })

    return {
        "neighborhood": neighborhood,
        "year": year,
        "month": month,
        "days": result,
    }
