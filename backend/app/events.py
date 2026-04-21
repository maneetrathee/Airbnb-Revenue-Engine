"""
Events & Holiday Surge API — v5
Bell curve centered on Sat/Sun. Clusters detected by scanning fixed
Mon/Fri/Thu/Tue around each week's anchor Saturday.
"""

from fastapi import APIRouter, Query
import httpx
from datetime import date, timedelta
import calendar

router = APIRouter(prefix="/api/v1/events", tags=["Events"])

LONDON_EVENTS = {
    1:  [(1,  "New Year's Day",            "high")],
    2:  [(14, "Valentine's Day",           "medium")],
    3:  [(17, "St Patrick's Day Parade",   "medium")],
    4:  [(1,  "Easter Weekend",            "high"),
         (20, "London Marathon",           "high")],
    5:  [(25, "Chelsea Flower Show",       "medium")],
    6:  [(14, "Trooping the Colour",       "high"),
         (21, "Royal Ascot",               "medium"),
         (28, "Glastonbury",               "medium")],
    7:  [(4,  "Wimbledon Finals",          "high"),
         (12, "Notting Hill Carnival Prep","medium")],
    8:  [(25, "Notting Hill Carnival",     "high"),
         (26, "Notting Hill Carnival",     "high")],
    9:  [(1,  "London Fashion Week",       "high"),
         (15, "Open House London",         "medium")],
    10: [(31, "Halloween",                 "medium")],
    11: [(5,  "Bonfire Night",             "medium"),
         (11, "Remembrance Sunday",        "medium"),
         (15, "Winter Wonderland Opens",   "medium")],
    12: [(24, "Christmas Eve",             "high"),
         (25, "Christmas Day",             "high"),
         (26, "Boxing Day",                "high"),
         (31, "New Year's Eve",            "high")],
}

# Confirmed England & Wales bank holidays per year
HARDCODED_HOLIDAYS = {
    2025: [
        {"date": "2025-01-01", "name": "New Year's Day"},
        {"date": "2025-04-18", "name": "Good Friday"},
        {"date": "2025-04-21", "name": "Easter Monday"},
        {"date": "2025-05-05", "name": "Early May Bank Holiday"},
        {"date": "2025-05-26", "name": "Spring Bank Holiday"},
        {"date": "2025-08-25", "name": "Summer Bank Holiday"},
        {"date": "2025-12-25", "name": "Christmas Day"},
        {"date": "2025-12-26", "name": "Boxing Day"},
    ],
    2026: [
        {"date": "2026-01-01", "name": "New Year's Day"},
        {"date": "2026-04-03", "name": "Good Friday"},
        {"date": "2026-04-06", "name": "Easter Monday"},
        {"date": "2026-05-04", "name": "Early May Bank Holiday"},
        {"date": "2026-05-25", "name": "Spring Bank Holiday"},
        {"date": "2026-08-31", "name": "Summer Bank Holiday"},
        {"date": "2026-12-25", "name": "Christmas Day"},
        {"date": "2026-12-28", "name": "Boxing Day (substitute)"},
    ],
    2027: [
        {"date": "2027-01-01", "name": "New Year's Day"},
        {"date": "2027-04-02", "name": "Good Friday"},
        {"date": "2027-04-05", "name": "Easter Monday"},
        {"date": "2027-05-03", "name": "Early May Bank Holiday"},
        {"date": "2027-05-31", "name": "Spring Bank Holiday"},
        {"date": "2027-08-30", "name": "Summer Bank Holiday"},
        {"date": "2027-12-27", "name": "Christmas Day (substitute)"},
        {"date": "2027-12-28", "name": "Boxing Day (substitute)"},
    ],
}

async def fetch_uk_holidays(year: int) -> list:
    try:
        url = (
            f"https://openholidaysapi.org/PublicHolidays"
            f"?countryIsoCode=GB&languageIsoCode=EN"
            f"&validFrom={year}-01-01&validTo={year}-12-31"
        )
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data:  # Only use if non-empty
                    return [
                        {
                            "date": h["startDate"],
                            "name": h["name"][0]["text"] if h.get("name") else "Bank Holiday",
                        }
                        for h in data
                        if h.get("startDate", "").startswith(str(year))
                    ]
    except Exception:
        pass
    # Always fall back to hardcoded if API empty or fails
    return HARDCODED_HOLIDAYS.get(year, HARDCODED_HOLIDAYS[2026])


def _sat_of_week(d: date) -> date:
    """Return the Saturday of the weekend containing d.
    Mon-Sat → that week's Saturday
    Sun     → previous Saturday (same weekend)
    """
    wd = d.weekday()  # Mon=0 … Sun=6
    if wd == 6:       # Sunday → go back 1 day to Saturday
        return d - timedelta(days=1)
    return d + timedelta(days=(5 - wd))


def _classify_week(sat: date, holiday_dates: dict) -> dict:
    """
    Given a Saturday, classify the extended weekend type and return
    a surge curve mapping date_str → surge_pct.
    """
    sun = sat + timedelta(days=1)
    mon = sat + timedelta(days=2)
    fri = sat - timedelta(days=1)
    thu = sat - timedelta(days=2)
    tue = sat + timedelta(days=3)

    def ds(d): return d.strftime("%Y-%m-%d")

    mon_hol = ds(mon) in holiday_dates
    fri_hol = ds(fri) in holiday_dates
    thu_hol = ds(thu) in holiday_dates
    tue_hol = ds(tue) in holiday_dates

    # 5-day: Thu + Mon holidays
    if thu_hol and mon_hol:
        return {
            "type": "5day", "label": "5-Day Weekend",
            "curve": {
                ds(thu): 40, ds(fri): 50,
                ds(sat): 60, ds(sun): 60,
                ds(mon): 50, ds(tue): 40,
            },
        }

    # 4-day: Thu holiday → Fri bridge
    if thu_hol:
        return {
            "type": "4day_thu", "label": "4-Day Weekend",
            "curve": {
                ds(thu): 35, ds(fri): 45,
                ds(sat): 50, ds(sun): 45,
            },
        }

    # 4-day: Tue holiday → Mon bridge
    if tue_hol:
        return {
            "type": "4day_tue", "label": "4-Day Weekend",
            "curve": {
                ds(sat): 45, ds(sun): 50,
                ds(mon): 45, ds(tue): 35,
            },
        }

    # 3-day: Mon holiday
    if mon_hol:
        return {
            "type": "3day_mon", "label": "Long Weekend",
            "curve": {
                ds(sat): 45, ds(sun): 45, ds(mon): 35,
            },
        }

    # 3-day: Fri holiday
    if fri_hol:
        return {
            "type": "3day_fri", "label": "Long Weekend",
            "curve": {
                ds(fri): 35, ds(sat): 45, ds(sun): 45,
            },
        }

    # Regular weekend
    return {
        "type": "weekend", "label": "",
        "curve": {ds(sat): 15, ds(sun): 15},
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
    h_cur  = await fetch_uk_holidays(year)
    h_prev = await fetch_uk_holidays(year - 1)
    h_next = await fetch_uk_holidays(year + 1)
    holiday_dates = {h["date"]: h["name"] for h in h_cur + h_prev + h_next}

    days_in_month = calendar.monthrange(year, month)[1]

    # Collect all Saturdays covering this month (+ spillover weeks)
    saturdays = set()
    first = date(year, month, 1)
    last  = date(year, month, days_in_month)
    for day in range(1, days_in_month + 1):
        saturdays.add(_sat_of_week(date(year, month, day)))
    saturdays.add(_sat_of_week(first - timedelta(days=7)))
    saturdays.add(_sat_of_week(last  + timedelta(days=7)))

    # Build surge map from each week's curve
    surge_map   = {}
    cluster_map = {}
    for sat in saturdays:
        week = _classify_week(sat, holiday_dates)
        for ds, pct in week["curve"].items():
            if ds not in surge_map or pct > surge_map[ds]:
                surge_map[ds]   = pct
                cluster_map[ds] = week

    # Build result
    result = []
    for day in range(1, days_in_month + 1):
        d        = date(year, month, day)
        date_str = d.strftime("%Y-%m-%d")
        wd       = d.weekday()

        surge_pct = surge_map.get(date_str, 0)
        cluster   = cluster_map.get(date_str, {"type": "none", "label": ""})

        # Collect event labels
        events = []
        if date_str in holiday_dates:
            events.append(holiday_dates[date_str])
        for (eday, ename, etier) in LONDON_EVENTS.get(month, []):
            if eday == day and ename not in events:
                events.append(ename)
                if etier == "high"   and surge_pct < 35: surge_pct = 35
                if etier == "medium" and surge_pct < 18: surge_pct = 18

        # Tier
        if surge_pct >= 45:   tier = "high"
        elif surge_pct >= 15: tier = "medium"
        else:                 tier = "normal"

        # Tags
        tags = []
        if cluster["label"]:
            tags.append(cluster["label"])
        if cluster["type"] == "4day_thu" and wd == 4 and date_str not in holiday_dates:
            tags.append("Bridge Day")
        if cluster["type"] == "4day_tue" and wd == 0 and date_str not in holiday_dates:
            tags.append("Bridge Day")

        result.append({
            "date":      date_str,
            "day":       day,
            "weekday":   d.strftime("%a"),
            "tier":      tier,
            "surge_pct": surge_pct,
            "events":    events,
            "tags":      tags,
            "cluster":   cluster["type"],
        })

    return {
        "neighborhood": neighborhood,
        "year":         year,
        "month":        month,
        "days":         result,
    }
