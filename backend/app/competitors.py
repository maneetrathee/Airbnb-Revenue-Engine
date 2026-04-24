"""
Competitor Monitoring Dashboard API
GET /api/v1/competitors/overview    — market position + percentiles
GET /api/v1/competitors/listings    — competitor listing table
GET /api/v1/competitors/distribution — price histogram
"""

from fastapi import APIRouter, Query
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/api/v1/competitors", tags=["Competitors"])
DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)


@router.get("/overview")
def get_overview(
    neighborhood: str   = Query(...),
    room_type:    str   = Query("Entire home/apt"),
    your_price:   float = Query(None),
    bedrooms:     int   = Query(None),
):
    with engine.connect() as conn:
        # Build filter
        filters = "WHERE neighborhood = :n AND room_type = :rt AND price_base > 0"
        params  = {"n": neighborhood, "rt": room_type}
        if bedrooms:
            filters += " AND bedrooms = :b"
            params["b"] = bedrooms

        row = conn.execute(text(f"""
            SELECT
                COUNT(*)                                    AS total_listings,
                ROUND(AVG(price_base)::numeric, 2)          AS avg_price,
                ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price_base)::numeric, 2) AS p25,
                ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price_base)::numeric, 2) AS median,
                ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price_base)::numeric, 2) AS p75,
                ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY price_base)::numeric, 2) AS p90,
                ROUND(MIN(price_base)::numeric, 2)          AS min_price,
                ROUND(MAX(price_base)::numeric, 2)          AS max_price
            FROM listings {filters}
        """), params).fetchone()

        # Occupancy from market_history if available
        occ_row = conn.execute(text("""
            SELECT
                ROUND(AVG(occupancy_rate)::numeric, 1) AS avg_occupancy,
                ROUND(AVG(estimated_revenue)::numeric, 2) AS avg_revenue
            FROM monthly_metrics mm
            JOIN listings l ON l.id = mm.listing_id
            WHERE l.neighborhood = :n AND l.room_type = :rt
        """), {"n": neighborhood, "rt": room_type}).fetchone()

    avg_occ     = float(occ_row.avg_occupancy) if occ_row and occ_row.avg_occupancy else None
    avg_rev     = float(occ_row.avg_revenue)   if occ_row and occ_row.avg_revenue   else None

    median      = float(row.median  or 0)
    p25         = float(row.p25     or 0)
    p75         = float(row.p75     or 0)
    p90         = float(row.p90     or 0)
    avg_price   = float(row.avg_price or 0)

    # Position analysis
    position    = None
    percentile  = None
    opportunity = None

    if your_price and median > 0:
        if your_price < p25:
            position   = "underpriced"
            percentile = 10
            opportunity = f"You're in the bottom 25% — similar listings charge £{median:.0f}/night. Consider raising to £{p75:.0f}."
        elif your_price < median:
            pct = int(((your_price - p25) / (median - p25)) * 25 + 25) if median != p25 else 40
            position   = "below_median"
            percentile = pct
            opportunity = f"You're below median. The top 25% charge £{p75:.0f}+/night while maintaining strong occupancy."
        elif your_price < p75:
            pct = int(((your_price - median) / (p75 - median)) * 25 + 50) if p75 != median else 60
            position   = "competitive"
            percentile = pct
            opportunity = f"Well positioned. Top performers charge £{p90:.0f}+. You could test a £{your_price * 1.1:.0f} price."
        else:
            position   = "premium"
            percentile = 85
            opportunity = f"You're in the top 25% of the market. Ensure your listing quality matches your premium positioning."

    return {
        "neighborhood":    neighborhood,
        "room_type":       room_type,
        "total_listings":  int(row.total_listings or 0),
        "avg_price":       avg_price,
        "min_price":       float(row.min_price or 0),
        "max_price":       float(row.max_price or 0),
        "percentiles": {
            "p25":    p25,
            "median": median,
            "p75":    p75,
            "p90":    p90,
        },
        "avg_occupancy":  avg_occ,
        "avg_revenue":    avg_rev,
        "your_price":     your_price,
        "position":       position,
        "percentile":     percentile,
        "opportunity":    opportunity,
    }


@router.get("/listings")
def get_listings(
    neighborhood: str = Query(...),
    room_type:    str = Query("Entire home/apt"),
    limit:        int = Query(20),
    sort:         str = Query("price_desc"),  # price_desc, price_asc, reviews_desc
):
    order = {
        "price_desc":    "price_base DESC",
        "price_asc":     "price_base ASC",
        "reviews_desc":  "reviews_per_month DESC NULLS LAST",
    }.get(sort, "price_base DESC")

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT
                id, name, price_base, bedrooms, room_type,
                reviews_per_month,
                ROUND(
                    LEAST(COALESCE(reviews_per_month,0)*2, 20) / 30.0 * 100,
                    1
                ) AS est_occupancy
            FROM listings
            WHERE neighborhood = :n
              AND room_type = :rt
              AND price_base > 0
            ORDER BY {order}
            LIMIT :lim
        """), {"n": neighborhood, "rt": room_type, "lim": limit}).fetchall()

    return {
        "listings": [
            {
                "id":              r.id,
                "name":            r.name,
                "price":           float(r.price_base),
                "bedrooms":        r.bedrooms,
                "reviews_per_month": float(r.reviews_per_month) if r.reviews_per_month else 0,
                "est_occupancy":   float(r.est_occupancy or 0),
                "airbnb_url":      f"https://www.airbnb.com/rooms/{r.id}",
            }
            for r in rows
        ]
    }


@router.get("/distribution")
def get_distribution(
    neighborhood: str = Query(...),
    room_type:    str = Query("Entire home/apt"),
    buckets:      int = Query(10),
):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT price_base FROM listings
            WHERE neighborhood = :n AND room_type = :rt
              AND price_base > 0 AND price_base < 2000
            ORDER BY price_base
        """), {"n": neighborhood, "rt": room_type}).fetchall()

    prices = [float(r.price_base) for r in rows]
    if not prices:
        return {"buckets": []}

    min_p   = min(prices)
    max_p   = max(prices)
    step    = (max_p - min_p) / buckets or 1
    hist    = [0] * buckets

    for p in prices:
        idx = min(int((p - min_p) / step), buckets - 1)
        hist[idx] += 1

    return {
        "buckets": [
            {
                "range_start": round(min_p + i * step),
                "range_end":   round(min_p + (i + 1) * step),
                "label":       f"£{round(min_p + i * step)}–£{round(min_p + (i+1) * step)}",
                "count":       hist[i],
            }
            for i in range(buckets)
        ],
        "total": len(prices),
        "min":   round(min_p),
        "max":   round(max_p),
    