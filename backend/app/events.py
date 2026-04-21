"""
Events & Holiday Surge API
Parabola centered on Sat/Sun — holidays either side build UP to the weekend peak.

Mon holiday:   Fri+25% → Sat+45% → Sun+45% → Mon+35%
Thu holiday:   Thu+35% → Fri+45% → Sat+50% → Sun+45% → Mon+35%
5-day(Thu+Mon): Thu+40% → Fri+50% → Sat+60% → Sun+60% → Mon+50% → Tue+40%
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

def _collect_anchors(year: int, month: int, holiday_dates: dict) -> dict:
    """All high-significance dates with their base scores."""
    anchors = {}
    days_in_month = calendar.monthrange(year, month)[1]
    for day in range(1, days_in_month + 1):
        d  = date(year, month, day)
        ds = d.strftime("%Y-%m-%d")
        if ds in holiday_dates:
            anchors[ds] = {"score": 60, "name": holiday_dates[ds]}
        else:
            for (eday, ename, etier) in LONDON_EVENTS.get(month, []):
                if eday == day:
                    anchors[ds] = {
                        "score": 55 if etier == "high" else 25,
                        "name":  ename
                    }
    return anchors

def _detect_cluster(d: date, holiday_dates: dict) -> dict:
    """
    Detect what kind of extended weekend cluster this date belongs to.
    Returns cluster info: type, span_dates, peak_score
    
    Cluster types:
      "none"     - standalone day
      "weekend"  - regular Sat/Sun
      "3day"     - Mon or Fri holiday → 3-day weekend
      "4day"     - Thu holiday (bridge Fri) OR Tue holiday (bridge Mon)
      "5day"     - Thu + Mon holidays
    """
    wd = d.weekday()  # 0=Mon … 6=Sun

    def ds(delta):
        return (d + timedelta(days=delta)).strftime("%Y-%m-%d")

    def is_hol(delta):
        return ds(delta) in holiday_dates

    # Find the Saturday of this week (or next)
    days_to_sat = (5 - wd) % 7
    sat = d + timedelta(days=days_to_sat)
    sun = sat + timedelta(days=1)
    mon = sat + timedelta(days=2)
    fri = sat - timedelta(days=1)
    thu = sat - timedelta(days=2)
    tue = sat + timedelta(days=3)

    sat_ds = sat.strftime("%Y-%m-%d")
    sun_ds = sun.strftime("%Y-%m-%d")
    mon_ds = mon.strftime("%Y-%m-%d")
    fri_ds = fri.strftime("%Y-%m-%d")
    thu_ds = thu.strftime("%Y-%m-%d")
    tue_ds = tue.strftime("%Y-%m-%d")
    d_ds   = d.strftime("%Y-%m-%d")

    mon_hol = mon_ds in holiday_dates
    fri_hol = fri_ds in holiday_dates
    thu_hol = thu_ds in holiday_dates
    tue_hol = tue_ds in holiday_dates

    # 5-day: Thu holiday + Mon holiday
    if thu_hol and mon_hol:
        cluster_dates = {thu_ds, fri_ds, sat_ds, sun_ds, mon_ds}
        if d_ds in cluster_dates:
            return {"type": "5day", "dates": cluster_dates,
                    "label": "5-Day Weekend", "peak": 60}

    # 4-day: Thu holiday (Fri is bridge)
    if thu_hol and not mon_hol:
        cluster_dates = {thu_ds, fri_ds, sat_ds, sun_ds}
        if d_ds in cluster_dates:
            return {"type": "4day", "dates": cluster_dates,
                    "label": "4-Day Weekend (Thu holiday)", "peak": 50}

    # 4-day: Tue holiday (Mon is bridge)
    if tue_hol and not fri_hol:
        cluster_dates = {sat_ds, sun_ds, mon_ds, tue_ds}
        if d_ds in cluster_dates:
            return {"type": "4day", "dates": cluster_dates,
                    "label": "4-Day Weekend (Tue holiday)", "peak": 50}

    # 3-day: Mon holiday
    if mon_hol and not thu_hol:
        cluster_dates = {sat_ds, sun_ds, mon_ds}
        if d_ds in cluster_dates:
            return {"type": "3day", "dates": cluster_dates,
                    "label": "Long Weekend (Mon holiday)", "peak": 45}

    # 3-day: Fri holiday
    if fri_hol and not tue_hol:
        cluster_dates = {fri_ds, sat_ds, sun_ds}
        if d_ds in cluster_dates:
            return {"type": "3day", "dates": cluster_dates,
                    "label": "Long Weekend (Fri holiday)", "peak": 45}

    # Regular weekend
    if d_ds in {sat_ds, sun_ds}:
        return {"type": "weekend", "dates": {sat_ds, sun_ds},
                "label": "", "peak": 15}

    return {"type": "none", "dates": set(), "label": "", "peak": 0}

def _surge_for_day(d: date, cluster: dict, holiday_dates: dict) -> tuple:
    """
    Returns (surge_pct, tier) using bell curve centered on Sat/Sun.
    
    The curve shape per cluster type:
    
    weekend:          Sat+15%  Sun+15%
    3day (Mon hol):   Sat+45%  Sun+45%  Mon+35%
    3day (Fri hol):   Fri+35%  Sat+45%  Sun+45%
    4day (Thu hol):   Thu+35%  Fri+45%  Sat+50%  Sun+45%  (Mon plain)  — wait Mon not in 4day
                      Actually: Thu+35% Fri+45% Sat+50% Sun+45%
    4day (Tue hol):   Sat+45%  Sun+50%  Mon+45%  Tue+35%
    5day:             Thu+40%  Fri+50%  Sat+60%  Sun+60%  Mon+50%  Tue+40%
    """
    wd    = d.weekday()
    d_ds  = d.strftime("%Y-%m-%d")
    ctype = cluster["type"]

    if ctype == "none":
        return 0, "normal"

    if ctype == "weekend":
        return 15, "medium"

    # Find Sat of this cluster's week
    days_to_sat = (5 - wd) % 7
    sat = d + timedelta(days=days_to_sat)
    sun = sat + timedelta(days=1)

    sat_ds = sat.strftime("%Y-%m-%d")
    sun_ds = sun.strftime("%Y-%m-%d")
    mon_ds = (sat + timedelta(days=2)).strftime("%Y-%m-%d")
    fri_ds = (sat - timedelta(days=1)).strftime("%Y-%m-%d")
    thu_ds = (sat - timedelta(days=2)).strftime("%Y-%m-%d")
    tue_ds = (sat + timedelta(days=3)).strftime("%Y-%m-%d")

    # Bell curve lookup tables
    curves = {
        # 3-day Mon holiday: Sat peak, Sun peak, Mon shoulder
        "3day_mon": {sat_ds: 45, sun_ds: 45, mon_ds: 35},
        # 3-day Fri holiday: Fri shoulder, Sat peak, Sun peak
        "3day_fri": {fri_ds: 35, sat_ds: 45, sun_ds: 45},
        # 4-day Thu holiday: Thu shoulder, Fri ramp, Sat peak, Sun ramp-down
        "4day_thu": {thu_ds: 35, fri_ds: 45, sat_ds: 50, sun_ds: 45},
        # 4-day Tue holiday: Sat ramp, Sun peak, Mon ramp-down, Tue shoulder
        "4day_tue": {sat_ds: 45, sun_ds: 50, mon_ds: 45, tue_ds: 35},
        # 5-day: full bell Thu→Tue
        "5day":     {thu_ds: 40, fri_ds: 50, sat_ds: 60, sun_ds: 60, mon_ds: 50, tue_ds: 40},
    }

    # Determine which curve to use
    if ctype == "5day":
        curve = curves["5day"]
    elif ctype == "4day":
        if thu_ds in cluster["dates"]:
            curve = curves["4day_thu"]
        else:
            curve = curves["4day_tue"]
    elif ctype == "3day":
        if mon_ds in cluster["dates"]:
            curve = curves["3day_mon"]
        else:
            curve = curves["3day_fri"]
    else:
        curve = {}

    surge_pct = curve.get(d_ds, 0)

    # Fallback: if somehow not in curve but in cluster, give minimum
    if surge_pct == 0 and d_ds in cluster["dates"]:
        surge_pct = 20

    # Tier
    if surge_pct >= 45:
        tier = "high"
    elif surge_pct >= 20:
        tier = "medium"
    else:
        tier = "normal"

    return surge_pct, tier

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
    holidays = await fetch_uk_holidays(year)
    prev_h   = await fetch_uk_holidays(year - 1)
    next_h   = await fetch_uk_holidays(year + 1)
    holiday_dates = {h["date"]: h["name"] for h in holidays + prev_h + next_h}

    days_in_month = calendar.monthrange(year, month)[1]
    result        = []

    for day in range(1, days_in_month + 1):
        d        = date(year, month, day)
        date_str = d.strftime("%Y-%m-%d")

        cluster   = _detect_cluster(d, holiday_dates)
        surge_pct, tier = _surge_for_day(d, cluster, holiday_dates)

        # Curated London events can bump up independently
        events = []
        if date_str in holiday_dates:
            events.append(holiday_dates[date_str])

        for (eday, ename, etier) in LONDON_EVENTS.get(month, []):
            if eday == day:
                events.append(ename)
                if etier == "high" and surge_pct < 35:
                    surge_pct = 35
                    tier = "high"
                elif etier == "medium" and surge_pct < 18:
                    surge_pct = 18
                    tier = "medium"

        tags = []
        if cluster["label"]:
            tags.append(cluster["label"])
        if cluster["type"] in ["4day", "5day"]:
            days_to_sat = (5 - d.weekday()) % 7
            fri_ds = (d + timedelta(days=days_to_sat - 1)).strftime("%Y-%m-%d")
            if date_str == fri_ds and date_str not in holiday_dates:
                tags.append("Bridge Day")

        result.append({
            "date":       date_str,
            "day":        day,
            "weekday":    d.strftime("%a"),
            "tier":       tier,
            "surge_pct":  surge_pct,
            "events":     events,
            "tags":       tags,
            "cluster":    cluster["type"],
        })

    return {
        "neighborhood": neighborhood,
        "year":         year,
        "month":        month,
        "days":         result,
    }
