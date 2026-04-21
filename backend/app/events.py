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

def _classify_day(d: date, holiday_dates: set, month_events: list) -> dict:
    """
    Classify a single date with full bridge day + long weekend logic.

    Patterns handled:
      - Bank holiday on any day → high (+40%)
      - Mon holiday → Fri-Mon long weekend, Fri/Sat/Sun all high (+45%)
      - Fri holiday → Fri-Sun long weekend, all high (+45%)
      - Thu holiday → Thu-Sun, Fri is bridge day → all high (+50%)
      - Mon+Thu holidays same week → Thu-Mon 5-day, Fri bridge → all high (+60%)
      - Regular Sat/Sun → medium (+15%)
      - Sat/Sun adjacent to any of the above → escalated automatically
    """
    date_str = d.strftime("%Y-%m-%d")
    weekday  = d.weekday()  # 0=Mon … 6=Sun

    events    = []
    tier      = "normal"
    surge_pct = 0
    tags      = []

    # ── Step 1: Direct bank holiday ──────────────────────────────────────────
    if date_str in holiday_dates:
        events.append(holiday_dates[date_str])
        tier      = "high"
        surge_pct = 40

    # ── Step 2: London curated events ────────────────────────────────────────
    for (eday, ename, etier) in month_events:
        if eday == d.day:
            events.append(ename)
            if etier == "high":
                tier      = "high"
                surge_pct = max(surge_pct, 35)
            elif etier == "medium" and tier == "normal":
                tier      = "medium"
                surge_pct = max(surge_pct, 18)

    # ── Step 3: Bridge day & long weekend detection ──────────────────────────
    # Helper: get surrounding dates
    def ds(delta): return (d + timedelta(days=delta)).strftime("%Y-%m-%d")

    is_bridge    = False
    long_weekend = False
    span_days    = 0  # how many days in the extended weekend

    if weekday == 0:  # Monday
        # Mon holiday → Sat-Mon = 3-day (already covered by holiday check)
        # Mon holiday + Thu holiday same week → Thu-Mon 5-day
        thu = ds(3)
        if date_str in holiday_dates:
            long_weekend = True
            span_days    = 3
            if thu in holiday_dates:
                span_days = 5
                tags.append("5-Day Weekend")
            else:
                tags.append("Long Weekend")

    elif weekday == 1:  # Tuesday
        # Tue holiday → Mon is bridge → Sat-Tue = 4-day
        mon = ds(-1)
        if date_str in holiday_dates and mon not in holiday_dates:
            is_bridge    = True   # Mon becomes bridge
            long_weekend = True
            span_days    = 4
            tags.append("Bridge Weekend (Mon bridge)")

    elif weekday == 3:  # Thursday
        # Thu holiday → Fri is bridge → Thu-Sun = 4-day
        fri = ds(1)
        mon = ds(4)
        if date_str in holiday_dates:
            long_weekend = True
            if mon in holiday_dates:
                span_days = 5
                tags.append("5-Day Weekend (Thu+Mon holidays)")
            else:
                span_days = 4
                tags.append("Bridge Weekend (Fri bridge)")

    elif weekday == 4:  # Friday
        # Fri holiday → Fri-Sun = 3-day long weekend
        # Fri is bridge if Thu was holiday
        thu = ds(-1)
        mon = ds(3)
        if date_str in holiday_dates:
            long_weekend = True
            span_days    = 3
            tags.append("Long Weekend")
        elif thu in holiday_dates:
            is_bridge    = True
            long_weekend = True
            span_days    = 4
            tags.append("Bridge Day")
            tier         = "high"
            surge_pct    = max(surge_pct, 50)
        if mon in holiday_dates:
            long_weekend = True
            span_days    = max(span_days, 4) if date_str in holiday_dates else 4
            tags.append("Long Weekend (Mon holiday)")
            tier         = "high"
            surge_pct    = max(surge_pct, 45)

    elif weekday == 5:  # Saturday
        fri = ds(-1)
        sun = ds(1)
        mon = ds(2)
        thu = ds(-2)
        if mon in holiday_dates or fri in holiday_dates:
            long_weekend = True
            span_days    = 3
            tags.append("Long Weekend")
            tier         = "high"
            surge_pct    = max(surge_pct, 40)
        if thu in holiday_dates:  # Thu holiday → bridge Fri → Thu-Sun
            long_weekend = True
            span_days    = 4
            tags.append("Extended Weekend")
            tier         = "high"
            surge_pct    = max(surge_pct, 48)
        if mon in holiday_dates and thu in holiday_dates:
            span_days    = 5
            tags.append("5-Day Weekend")
            surge_pct    = max(surge_pct, 58)

    elif weekday == 6:  # Sunday
        mon = ds(1)
        fri = ds(-2)
        thu = ds(-3)
        if mon in holiday_dates or fri in holiday_dates:
            long_weekend = True
            span_days    = 3
            tags.append("Long Weekend")
            tier         = "high"
            surge_pct    = max(surge_pct, 40)
        if thu in holiday_dates:
            long_weekend = True
            span_days    = 4
            tags.append("Extended Weekend")
            tier         = "high"
            surge_pct    = max(surge_pct, 48)
        if mon in holiday_dates and thu in holiday_dates:
            span_days    = 5
            tags.append("5-Day Weekend")
            surge_pct    = max(surge_pct, 58)

    # ── Step 4: Span-based surge scaling ─────────────────────────────────────
    if long_weekend and tier != "high":
        tier = "high"
    if span_days == 3 and not surge_pct:
        surge_pct = 40
    elif span_days == 4:
        surge_pct = max(surge_pct, 50)
    elif span_days >= 5:
        surge_pct = max(surge_pct, 60)

    # ── Step 5: Regular weekend fallback (Sat=5, Sun=6) ──────────────────────
    if weekday in [5, 6] and tier == "normal":
        tier      = "medium"
        surge_pct = 15
    elif weekday in [5, 6] and tier == "medium":
        surge_pct = max(surge_pct, 20)

    return {
        "date":      date_str,
        "day":       d.day,
        "weekday":   d.strftime("%a"),
        "tier":      tier,
        "surge_pct": surge_pct,
        "events":    events,
        "tags":      tags,
        "is_bridge": is_bridge,
        "span_days": span_days,
    }

@router.get("/holidays")
async def get_holidays(year: int = Query(2026)):
    holidays = await fetch_uk_holidays(year)
    return {"year": year, "holidays": holidays}

@router.get("/surge")
async def get_surge_calendar(
    neighborhood: str = Query("Westminster"),
    year:         int = Query(2026),
    month:        int = Query(...),
):
    holidays     = await fetch_uk_holidays(year)
    # Include adjacent months' holidays for edge detection (e.g. Dec 31 → Jan 1)
    prev_year    = year if month > 1 else year - 1
    next_year    = year if month < 12 else year + 1
    prev_month_h = await fetch_uk_holidays(prev_year)
    next_month_h = await fetch_uk_holidays(next_year)

    all_holidays  = holidays + prev_month_h + next_month_h
    holiday_dates = {h["date"]: h["name"] for h in all_holidays}

    month_events  = LONDON_EVENTS.get(month, [])
    days_in_month = calendar.monthrange(year, month)[1]

    result = []
    for day in range(1, days_in_month + 1):
        d    = date(year, month, day)
        info = _classify_day(d, holiday_dates, month_events)
        result.append(info)

    return {
        "neighborhood": neighborhood,
        "year":         year,
        "month":        month,
        "days":         result,
    }
