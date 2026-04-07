import os
from dotenv import load_dotenv

load_dotenv()
"""
RevPAR & Occupancy Router
Endpoints:
  GET /api/v1/revpar/summary      → KPIs for a neighborhood
  GET /api/v1/revpar/trend        → Monthly RevPAR trend (chart data)
  GET /api/v1/revpar/optimize     → Pricing recommendation (hold vs. drop)
"""

from fastapi import APIRouter, Query, HTTPException
import pandas as pd
from sqlalchemy import create_engine, text

router = APIRouter(prefix="/api/v1/revpar", tags=["RevPAR"])

DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)


# ─────────────────────────────────────────────
# HELPER: Check if monthly_metrics has real data for a neighborhood.
# If calendar data exists → use it. Otherwise fall back to demand_score.
# ─────────────────────────────────────────────
def _has_calendar_data(neighborhood: str) -> bool:
    sql = text("""
        SELECT COUNT(*) FROM monthly_metrics
        WHERE neighborhood = :n AND total_days > 0
    """)
    with engine.connect() as conn:
        count = conn.execute(sql, {"n": neighborhood}).scalar()
    return (count or 0) > 0


# ─────────────────────────────────────────────
# ENDPOINT 1: Summary KPIs
# Returns: avg_nightly_rate, occupancy_rate, revpar, total_listings, data_source
# ─────────────────────────────────────────────
@router.get("/summary")
def get_revpar_summary(neighborhood: str = Query(..., description="Neighborhood name")):
    use_calendar = _has_calendar_data(neighborhood)

    if use_calendar:
        # Pull from the real monthly_metrics view (calendar-based)
        sql = text("""
            SELECT
                AVG(mm.estimated_revenue / NULLIF(mm.total_days, 0)) AS avg_nightly_rate,
                AVG(mm.occupancy_rate)                                AS occupancy_rate,
                -- RevPAR = total revenue / total available nights (correct definition)
                AVG(mm.estimated_revenue / NULLIF(mm.total_days, 0)) AS revpar,
                COUNT(DISTINCT mm.listing_id)                         AS total_listings
            FROM monthly_metrics mm
            WHERE mm.neighborhood = :n
              AND mm.total_days > 0
        """)
        data_source = "calendar"
    else:
        # Fallback: demand_score view (reviews-proxy)
        sql = text("""
            SELECT
                AVG(price_base)                              AS avg_nightly_rate,
                -- Proxy occupancy: capped estimated bookings / 30 days
                AVG(
                    LEAST(estimated_bookings_count, 30) / 30.0 * 100
                )                                            AS occupancy_rate,
                AVG(
                    price_base
                    * (LEAST(estimated_bookings_count, 30) / 30.0)
                )                                            AS revpar,
                COUNT(*)                                     AS total_listings
            FROM demand_score
            WHERE neighborhood = :n
        """)
        data_source = "demand_proxy"

    with engine.connect() as conn:
        row = pd.read_sql(sql, conn, params={"n": neighborhood})

    if row.empty or row["avg_nightly_rate"].isna().all():
        raise HTTPException(status_code=404, detail=f"No data found for neighborhood: {neighborhood}")

    return {
        "neighborhood": neighborhood,
        "data_source": data_source,
        "avg_nightly_rate": round(float(row["avg_nightly_rate"].iloc[0] or 0), 2),
        "occupancy_rate":   round(float(row["occupancy_rate"].iloc[0] or 0), 2),
        "revpar":           round(float(row["revpar"].iloc[0] or 0), 2),
        "total_listings":   int(row["total_listings"].iloc[0] or 0),
    }


# ─────────────────────────────────────────────
# ENDPOINT 2: Monthly Trend (for chart)
# Returns list of { month, occupancy_rate, revpar, avg_nightly_rate }
# ─────────────────────────────────────────────
@router.get("/trend")
def get_revpar_trend(neighborhood: str = Query(..., description="Neighborhood name")):
    use_calendar = _has_calendar_data(neighborhood)

    if use_calendar:
        sql = text("""
            SELECT
                month,
                ROUND(AVG(occupancy_rate)::numeric, 2)          AS occupancy_rate,
                ROUND(AVG(
                    estimated_revenue / NULLIF(total_days, 0)
                )::numeric, 2)                                   AS revpar,
                ROUND(AVG(
                    estimated_revenue / NULLIF(total_days, 0)
                )::numeric, 2)                                   AS avg_nightly_rate
            FROM monthly_metrics
            WHERE neighborhood = :n
              AND total_days > 0
            GROUP BY month
            ORDER BY month ASC
        """)
        data_source = "calendar"
    else:
        # Proxy: we can't do a real time-series without calendar data,
        # so we return a single "current" snapshot labelled as today's month.
        sql = text("""
            SELECT
                TO_CHAR(NOW(), 'YYYY-MM')                         AS month,
                ROUND(AVG(
                    LEAST(estimated_bookings_count, 30) / 30.0 * 100
                )::numeric, 2)                                    AS occupancy_rate,
                ROUND(AVG(
                    price_base * (LEAST(estimated_bookings_count, 30) / 30.0)
                )::numeric, 2)                                    AS revpar,
                ROUND(AVG(price_base)::numeric, 2)                AS avg_nightly_rate
            FROM demand_score
            WHERE neighborhood = :n
        """)
        data_source = "demand_proxy"

    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"n": neighborhood})

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No trend data for: {neighborhood}")

    return {
        "neighborhood": neighborhood,
        "data_source": data_source,
        "trend": df.to_dict(orient="records"),
    }


# ─────────────────────────────────────────────
# ENDPOINT 3: Pricing Optimization Recommendation
# Core logic:
#   Occupancy < 65%  → drop price (losing money to vacancy)
#   65% ≤ occ < 80%  → hold (balanced market)
#   occ ≥ 80%        → raise price (demand exceeds supply)
#
# Returns: action, reasoning, current_revpar, projected_revpar, price_delta_pct
# ─────────────────────────────────────────────
@router.get("/optimize")
def get_pricing_recommendation(neighborhood: str = Query(..., description="Neighborhood name")):
    summary = get_revpar_summary(neighborhood)

    occ   = summary["occupancy_rate"]   # e.g. 72.5
    adr   = summary["avg_nightly_rate"] # e.g. 120.00
    revpar = summary["revpar"]

    # ── Decision logic ──────────────────────────────────────────
    if occ < 65:
        # Vacancy is costing money. Drop 12% to fill nights.
        # At 65% occ a £108 rate beats £120 × 55% occupancy.
        price_delta_pct = -12
        new_adr = adr * (1 + price_delta_pct / 100)
        new_occ = min(occ + 15, 95)   # realistic uplift after price drop
        action = "DROP_PRICE"
        reasoning = (
            f"Occupancy is low at {occ:.1f}%. Dropping price by 12% typically "
            f"fills 10–15 extra nights/month. At the new rate your projected "
            f"RevPAR improves because revenue from more bookings exceeds what "
            f"you'd earn holding firm with empty nights."
        )
    elif occ < 80:
        # Market is balanced — hold current pricing.
        price_delta_pct = 0
        new_adr = adr
        new_occ = occ
        action = "HOLD_PRICE"
        reasoning = (
            f"Occupancy is healthy at {occ:.1f}%. Your pricing is well-calibrated "
            f"for current demand. Holding avoids leaving money on the table from "
            f"premature discounting while not risking vacancy from over-pricing."
        )
    else:
        # High demand — raise price. Capture the surplus.
        price_delta_pct = +10
        new_adr = adr * (1 + price_delta_pct / 100)
        new_occ = max(occ - 5, 75)    # small drop expected after price raise
        action = "RAISE_PRICE"
        reasoning = (
            f"Occupancy is strong at {occ:.1f}%. Demand exceeds typical supply. "
            f"Raising price by 10% will cost ~5% occupancy but the higher ADR "
            f"more than compensates, lifting your RevPAR."
        )

    current_revpar_inline = round(adr * (occ / 100), 2)
    projected_revpar = round(new_adr * (new_occ / 100), 2)
    revpar_uplift = round(projected_revpar - current_revpar_inline, 2)

    return {
        "neighborhood":     neighborhood,
        "action":           action,           # "DROP_PRICE" | "HOLD_PRICE" | "RAISE_PRICE"
        "reasoning":        reasoning,
        "price_delta_pct":  price_delta_pct,
        "current": {
            "adr":          round(adr, 2),
            "occupancy_rate": round(occ, 2),
            "revpar":       current_revpar_inline,
        },
        "projected": {
            "adr":          round(new_adr, 2),
            "occupancy_rate": round(new_occ, 2),
            "revpar":       round(projected_revpar, 2),
            "revpar_uplift": revpar_uplift,
        },
    }


# ─────────────────────────────────────────────
# ENDPOINT 4: List all neighborhoods (for the frontend dropdown)
# ─────────────────────────────────────────────
@router.get("/neighborhoods")
def get_neighborhoods():
    sql = text("SELECT DISTINCT neighborhood FROM listings WHERE neighborhood IS NOT NULL ORDER BY 1")
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn)
    return {"neighborhoods": df["neighborhood"].tolist()}