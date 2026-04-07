import os
from dotenv import load_dotenv

load_dotenv()
"""
Investment Arbitrage Router — Feature 3
========================================
Answers: "Should I buy this property and put it on Airbnb?"

Endpoints:
  GET /api/v1/arbitrage/calculate  — full investment analysis
  GET /api/v1/arbitrage/scenarios  — pessimistic / base / optimistic breakdown
"""

from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import create_engine, text
from dataclasses import dataclass, field
from typing import Optional

router = APIRouter(prefix="/api/v1/arbitrage", tags=["Arbitrage"])

DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

# ── Constants ─────────────────────────────────────────────────────────────────

ROOM_TYPE_MODIFIERS = {
    "Entire home/apt": 1.00,
    "Private room":    0.45,
    "Shared room":     0.25,
}

# UK average long-let monthly rent as % of property value (annualised)
# Source: UK Finance / Rightmove 2024 averages
BTL_GROSS_YIELD_PCT = 4.2   # London average gross buy-to-let yield

RUNNING_COST_RATIO  = 0.20  # Platform fees (3%) + cleaning + maintenance = ~20% of revenue

SCENARIO_MULTIPLIERS = {
    "pessimistic": 0.72,   # Slow ramp-up, off-peak, bad reviews early
    "base":        1.00,   # Market average
    "optimistic":  1.22,   # Peak demand, Superhost, well-reviewed
}

SCENARIO_LABELS = {
    "pessimistic": "Conservative",
    "base":        "Base Case",
    "optimistic":  "Optimistic",
}


# ── Market data fetcher ───────────────────────────────────────────────────────

def _get_neighborhood_revpar(neighborhood: str) -> dict:
    """Pulls RevPAR, ADR, and occupancy from real market data."""
    with engine.connect() as conn:
        # Try calendar data first
        cal = conn.execute(text("""
            SELECT COUNT(*) FROM monthly_metrics
            WHERE neighborhood = :n AND total_days > 0
        """), {"n": neighborhood}).scalar() or 0

        if cal > 0:
            row = conn.execute(text("""
                SELECT
                    AVG(occupancy_rate) AS occupancy,
                    AVG(estimated_revenue / NULLIF(total_days,0)) AS adr,
                    AVG(
                        estimated_revenue / NULLIF(total_days,0)
                        * (occupancy_rate / 100.0)
                    ) AS revpar,
                    COUNT(DISTINCT listing_id) AS listing_count
                FROM monthly_metrics
                WHERE neighborhood = :n AND total_days > 0
            """), {"n": neighborhood}).fetchone()
            source = "calendar"
        else:
            row = conn.execute(text("""
                SELECT
                    AVG(LEAST(COALESCE(reviews_per_month,0)*2,20)/30.0*100) AS occupancy,
                    AVG(price_base) AS adr,
                    AVG(price_base * LEAST(COALESCE(reviews_per_month,0)*2,20)/30.0) AS revpar,
                    COUNT(*) AS listing_count
                FROM listings
                WHERE neighborhood = :n AND price_base > 0
            """), {"n": neighborhood}).fetchone()
            source = "demand_proxy"

    if not row or not row.adr:
        raise HTTPException(404, f"No market data found for '{neighborhood}'")

    return {
        "occupancy":     round(float(row.occupancy or 50), 1),
        "adr":           round(float(row.adr or 0), 2),
        "revpar":        round(float(row.revpar or 0), 2),
        "listing_count": int(row.listing_count or 0),
        "data_source":   source,
    }


# ── Core calculation ──────────────────────────────────────────────────────────

def _calculate_scenario(
    revpar:         float,
    multiplier:     float,
    purchase_price: float,
    ltv:            float,
    interest_rate:  float,
    repayment:      bool,
    room_modifier:  float,
) -> dict:
    """Runs the full P&L for one scenario."""

    # Revenue
    adj_revpar          = revpar * multiplier * room_modifier
    annual_revenue      = round(adj_revpar * 365, 2)
    running_costs       = round(annual_revenue * RUNNING_COST_RATIO, 2)
    net_revenue         = round(annual_revenue - running_costs, 2)

    # Mortgage
    loan_amount         = purchase_price * (ltv / 100)
    monthly_rate        = (interest_rate / 100) / 12

    if repayment and monthly_rate > 0:
        # Standard repayment formula over 25 years
        n = 300  # 25 years × 12
        monthly_mortgage = loan_amount * (monthly_rate * (1 + monthly_rate)**n) / ((1 + monthly_rate)**n - 1)
    else:
        # Interest-only
        monthly_mortgage = loan_amount * monthly_rate

    annual_mortgage     = round(monthly_mortgage * 12, 2)

    # Profit
    net_annual_profit   = round(net_revenue - annual_mortgage, 2)
    cap_rate            = round((net_annual_profit / purchase_price) * 100, 2) if purchase_price > 0 else 0
    gross_yield         = round((annual_revenue / purchase_price) * 100, 2) if purchase_price > 0 else 0
    payback_years       = round(purchase_price / net_annual_profit, 1) if net_annual_profit > 0 else None

    # Buy-to-let comparison
    btl_annual_rent     = round(purchase_price * (BTL_GROSS_YIELD_PCT / 100), 2)
    btl_net_profit      = round(btl_annual_rent * 0.75 - annual_mortgage, 2)  # ~25% costs for BTL
    btl_cap_rate        = round((btl_net_profit / purchase_price) * 100, 2)
    airbnb_premium      = round(net_annual_profit - btl_net_profit, 2)

    # Verdict
    if cap_rate >= 6:
        verdict = "Strong Buy"
        verdict_color = "green"
        verdict_detail = f"Cap rate of {cap_rate}% significantly outperforms the market. This property has strong short-let potential."
    elif cap_rate >= 3:
        verdict = "Viable"
        verdict_color = "amber"
        verdict_detail = f"Cap rate of {cap_rate}% is above the London BTL average of {BTL_GROSS_YIELD_PCT}%. Worth pursuing with active management."
    elif cap_rate >= 0:
        verdict = "Marginal"
        verdict_color = "orange"
        verdict_detail = f"Cap rate of {cap_rate}% is below the market average. Profitability depends heavily on occupancy and management."
    else:
        verdict = "Not Recommended"
        verdict_color = "red"
        verdict_detail = f"Negative cap rate at {cap_rate}%. Mortgage costs exceed projected Airbnb revenue at this purchase price."

    return {
        "annual_revenue":    annual_revenue,
        "running_costs":     running_costs,
        "net_revenue":       net_revenue,
        "annual_mortgage":   annual_mortgage,
        "monthly_mortgage":  round(monthly_mortgage, 2),
        "net_annual_profit": net_annual_profit,
        "cap_rate":          cap_rate,
        "gross_yield":       gross_yield,
        "payback_years":     payback_years,
        "btl_annual_rent":   btl_annual_rent,
        "btl_net_profit":    btl_net_profit,
        "btl_cap_rate":      btl_cap_rate,
        "airbnb_premium":    airbnb_premium,
        "verdict":           verdict,
        "verdict_color":     verdict_color,
        "verdict_detail":    verdict_detail,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/calculate")
def calculate_arbitrage(
    neighborhood:   str   = Query(..., description="London neighborhood name"),
    purchase_price: float = Query(..., description="Property purchase price in GBP"),
    room_type:      str   = Query("Entire home/apt", description="Room type"),
    ltv:            float = Query(75.0, description="Loan-to-value ratio as percentage (e.g. 75)"),
    interest_rate:  float = Query(5.5, description="Annual mortgage interest rate as percentage"),
    repayment:      bool  = Query(False, description="True = repayment mortgage, False = interest-only"),
):
    """
    Full investment arbitrage analysis with all three scenarios.
    Returns base case + pessimistic + optimistic breakdown,
    mortgage details, and buy-to-let comparison.
    """
    if purchase_price <= 0:
        raise HTTPException(400, "Purchase price must be greater than 0")
    if not 50 <= ltv <= 90:
        raise HTTPException(400, "LTV must be between 50% and 90%")
    if not 1 <= interest_rate <= 20:
        raise HTTPException(400, "Interest rate must be between 1% and 20%")

    room_modifier = ROOM_TYPE_MODIFIERS.get(room_type, 1.0)
    market        = _get_neighborhood_revpar(neighborhood)

    # Calculate all three scenarios
    scenarios = {}
    for key, multiplier in SCENARIO_MULTIPLIERS.items():
        scenarios[key] = {
            "label":      SCENARIO_LABELS[key],
            "multiplier": multiplier,
            **_calculate_scenario(
                revpar=market["revpar"],
                multiplier=multiplier,
                purchase_price=purchase_price,
                ltv=ltv,
                interest_rate=interest_rate,
                repayment=repayment,
                room_modifier=room_modifier,
            )
        }

    base = scenarios["base"]

    return {
        "inputs": {
            "neighborhood":   neighborhood,
            "purchase_price": purchase_price,
            "room_type":      room_type,
            "ltv":            ltv,
            "interest_rate":  interest_rate,
            "repayment":      repayment,
            "loan_amount":    round(purchase_price * (ltv / 100), 2),
        },
        "market": market,
        "base": base,
        "scenarios": scenarios,
        "summary": {
            "best_case_cap_rate":  scenarios["optimistic"]["cap_rate"],
            "base_case_cap_rate":  base["cap_rate"],
            "worst_case_cap_rate": scenarios["pessimistic"]["cap_rate"],
            "btl_cap_rate":        base["btl_cap_rate"],
            "airbnb_beats_btl":    base["net_annual_profit"] > base["btl_net_profit"],
            "airbnb_premium_pa":   base["airbnb_premium"],
        }
    }
