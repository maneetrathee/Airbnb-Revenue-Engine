"""
Pricing Engine — Layer 4: Smarter Pricing Logic
================================================
Replaces the simple 3-band occupancy logic with a multi-signal model:

  Signal 1: Base RevPAR price       — market average ADR for the neighborhood
  Signal 2: Occupancy adjustment    — DROP / HOLD / RAISE based on occ%
  Signal 3: Lead time decay         — discount increases as date approaches empty
  Signal 4: Competitor pressure     — respond to neighborhood price movements
  Signal 5: Length-of-stay discount — longer stays get automatic discounts
  Signal 6: Last-minute surge       — high occ% + close date = scarcity premium

All signals are composable — each returns a multiplier that stacks.
Final price is always clamped to the host's guardrails.
"""

from sqlalchemy import create_engine, text
from datetime import datetime, date, timedelta
from dataclasses import dataclass, field
from typing import Optional
import logging

logger = logging.getLogger("pricing_engine")

DB_URL = "postgresql://localhost:5432/airbnb_engine"
engine = create_engine(DB_URL)


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class PricingContext:
    """Everything the engine needs to price a property for a given date."""
    neighborhood:    str
    target_date:     date
    min_price:       float = 30.0
    max_price:       float = 500.0
    nights_requested: int  = 1       # for length-of-stay discounts


@dataclass
class PricingSignal:
    """One pricing signal — its multiplier and the reason for it."""
    name:       str
    multiplier: float        # 1.0 = no change, 0.88 = -12%, 1.10 = +10%
    reason:     str
    magnitude:  str = "neutral"  # "positive" | "negative" | "neutral"


@dataclass
class PricingResult:
    """The full output of the pricing engine for one property/date."""
    base_price:       float
    final_price:      float
    signals:          list[PricingSignal] = field(default_factory=list)
    occupancy_rate:   float = 0.0
    data_source:      str   = "demand_proxy"
    clamped:          bool  = False
    clamp_reason:     str   = ""

    @property
    def total_multiplier(self) -> float:
        m = 1.0
        for s in self.signals:
            m *= s.multiplier
        return round(m, 4)

    @property
    def summary(self) -> str:
        parts = [s.reason for s in self.signals if s.multiplier != 1.0]
        return " | ".join(parts) if parts else "Standard rate — no adjustments"


# ── Market data fetcher ───────────────────────────────────────────────────────

def _get_market_data(neighborhood: str) -> dict:
    """
    Pulls avg nightly rate, occupancy, and month-over-month price change
    for a neighborhood. Uses calendar data if available, falls back to proxy.
    """
    with engine.connect() as conn:
        # Check if we have real calendar data
        cal_count = conn.execute(text("""
            SELECT COUNT(*) FROM monthly_metrics
            WHERE neighborhood = :n AND total_days > 0
        """), {"n": neighborhood}).scalar() or 0

        if cal_count > 0:
            # Real data: get latest month + previous month for competitor tracking
            rows = conn.execute(text("""
                SELECT
                    month,
                    AVG(estimated_revenue / NULLIF(total_days, 0)) AS avg_price,
                    AVG(occupancy_rate) AS occupancy
                FROM monthly_metrics
                WHERE neighborhood = :n AND total_days > 0
                GROUP BY month
                ORDER BY month DESC
                LIMIT 2
            """), {"n": neighborhood}).fetchall()

            if not rows:
                return _proxy_market_data(neighborhood, conn)

            latest = rows[0]
            prev   = rows[1] if len(rows) > 1 else None

            # Month-over-month price change (competitor pressure signal)
            mom_change = 0.0
            if prev and prev.avg_price and latest.avg_price:
                mom_change = (float(latest.avg_price) - float(prev.avg_price)) / float(prev.avg_price)

            return {
                "avg_price":   float(latest.avg_price or 0),
                "occupancy":   float(latest.occupancy or 50),
                "mom_change":  mom_change,   # month-over-month % change in competitor prices
                "data_source": "calendar",
            }

        else:
            return _proxy_market_data(neighborhood, conn)


def _proxy_market_data(neighborhood: str, conn) -> dict:
    row = conn.execute(text("""
        SELECT
            AVG(price_base) AS avg_price,
            AVG(LEAST(COALESCE(reviews_per_month,0)*2,20)/30.0*100) AS occupancy
        FROM listings
        WHERE neighborhood = :n AND price_base > 0
    """), {"n": neighborhood}).fetchone()

    return {
        "avg_price":   float(row.avg_price or 80) if row else 80.0,
        "occupancy":   float(row.occupancy or 50)  if row else 50.0,
        "mom_change":  0.0,
        "data_source": "demand_proxy",
    }


# ── Individual signal calculators ─────────────────────────────────────────────

def signal_occupancy(occupancy: float) -> PricingSignal:
    """Classic 3-band occupancy adjustment."""
    if occupancy < 65:
        return PricingSignal("occupancy", 0.88, f"Low occupancy ({occupancy:.1f}%) — drop 12%", "negative")
    elif occupancy < 80:
        return PricingSignal("occupancy", 1.00, f"Healthy occupancy ({occupancy:.1f}%) — hold price", "neutral")
    else:
        return PricingSignal("occupancy", 1.10, f"High demand ({occupancy:.1f}%) — raise 10%", "positive")


def signal_lead_time(target_date: date, occupancy: float) -> PricingSignal:
    """
    Price decays as the booking date approaches with no booking.
    Exception: if occupancy is very high (>80%), lead time decay is suppressed
    because scarcity overrides urgency.
    """
    days_out = (target_date - date.today()).days

    # High occupancy market — suppress decay, scarcity rules
    if occupancy >= 80:
        return PricingSignal("lead_time", 1.00, f"{days_out}d out — scarcity suppresses decay", "neutral")

    if days_out >= 60:
        return PricingSignal("lead_time", 1.02, f"{days_out}d out — early bird premium (+2%)", "positive")
    elif days_out >= 30:
        return PricingSignal("lead_time", 1.00, f"{days_out}d out — standard window", "neutral")
    elif days_out >= 14:
        return PricingSignal("lead_time", 0.95, f"{days_out}d out — approaching (-5%)", "negative")
    elif days_out >= 7:
        return PricingSignal("lead_time", 0.90, f"{days_out}d out — urgency discount (-10%)", "negative")
    elif days_out >= 3:
        return PricingSignal("lead_time", 0.82, f"{days_out}d out — last week discount (-18%)", "negative")
    elif days_out >= 0:
        return PricingSignal("lead_time", 0.72, f"{days_out}d out — last minute deal (-28%)", "negative")
    else:
        # Past date — shouldn't be priced
        return PricingSignal("lead_time", 1.00, "Past date", "neutral")


def signal_competitor_pressure(mom_change: float) -> PricingSignal:
    """
    Responds to neighborhood-wide price movements month-over-month.
    If competitors raised prices 10%, you should too (partially).
    If they dropped, you should follow (partially — don't race to the bottom).
    """
    if mom_change > 0.08:
        return PricingSignal("competitor", 1.06, f"Competitors up {mom_change*100:.1f}% MoM — follow (+6%)", "positive")
    elif mom_change > 0.03:
        return PricingSignal("competitor", 1.03, f"Competitors up {mom_change*100:.1f}% MoM — slight follow (+3%)", "positive")
    elif mom_change < -0.08:
        return PricingSignal("competitor", 0.95, f"Competitors down {abs(mom_change)*100:.1f}% MoM — partial follow (-5%)", "negative")
    elif mom_change < -0.03:
        return PricingSignal("competitor", 0.98, f"Competitors down {abs(mom_change)*100:.1f}% MoM — hold mostly (-2%)", "negative")
    else:
        return PricingSignal("competitor", 1.00, "Competitor prices stable", "neutral")


def signal_length_of_stay(nights: int) -> PricingSignal:
    """Standard LOS discounts — longer stays fill gaps and reduce turnover costs."""
    if nights >= 28:
        return PricingSignal("los", 0.80, f"{nights}-night stay — monthly discount (-20%)", "negative")
    elif nights >= 14:
        return PricingSignal("los", 0.88, f"{nights}-night stay — extended discount (-12%)", "negative")
    elif nights >= 7:
        return PricingSignal("los", 0.92, f"{nights}-night stay — weekly discount (-8%)", "negative")
    else:
        return PricingSignal("los", 1.00, "Standard stay length", "neutral")


def signal_last_minute_surge(target_date: date, occupancy: float) -> PricingSignal:
    """
    High occupancy + close date = scarcity premium.
    Only fires when BOTH conditions are true — this is what PriceLabs calls
    'last minute surge' and it's the most profitable signal in the model.
    """
    days_out = (target_date - date.today()).days
    if days_out <= 7 and occupancy >= 80:
        return PricingSignal("surge", 1.15, f"Scarcity surge — {days_out}d out + {occupancy:.1f}% occ (+15%)", "positive")
    elif days_out <= 3 and occupancy >= 75:
        return PricingSignal("surge", 1.10, f"Late surge — {days_out}d out + {occupancy:.1f}% occ (+10%)", "positive")
    return PricingSignal("surge", 1.00, "No surge conditions", "neutral")


# ── Main engine entry point ───────────────────────────────────────────────────

def calculate_price(ctx: PricingContext) -> PricingResult:
    """
    Runs all 6 signals and returns a full PricingResult.
    This is the single function everything else calls.
    """
    # 1. Get market data
    market = _get_market_data(ctx.neighborhood)
    base   = market["avg_price"]
    occ    = market["occupancy"]

    if base <= 0:
        logger.warning(f"No market data for {ctx.neighborhood}")
        return PricingResult(
            base_price=ctx.min_price,
            final_price=ctx.min_price,
            data_source=market["data_source"]
        )

    # 2. Run all signals
    signals = [
        signal_occupancy(occ),
        signal_lead_time(ctx.target_date, occ),
        signal_competitor_pressure(market["mom_change"]),
        signal_length_of_stay(ctx.nights_requested),
        signal_last_minute_surge(ctx.target_date, occ),
    ]

    # 3. Compose — multiply all signal multipliers together
    composed = base
    for s in signals:
        composed *= s.multiplier

    # 4. Apply guardrails
    final = composed
    clamped = False
    clamp_reason = ""

    if composed < ctx.min_price:
        final = ctx.min_price
        clamped = True
        clamp_reason = f"Floor guardrail applied (AI wanted £{composed:.2f}, min is £{ctx.min_price})"
    elif composed > ctx.max_price:
        final = ctx.max_price
        clamped = True
        clamp_reason = f"Ceiling guardrail applied (AI wanted £{composed:.2f}, max is £{ctx.max_price})"

    return PricingResult(
        base_price=round(base, 2),
        final_price=round(final, 2),
        signals=signals,
        occupancy_rate=round(occ, 2),
        data_source=market["data_source"],
        clamped=clamped,
        clamp_reason=clamp_reason,
    )


def calculate_forecast(neighborhood: str, min_price: float, max_price: float,
                        days: int = 7, nights_requested: int = 1) -> list[dict]:
    """
    Generates a multi-day forecast using the full pricing engine.
    Replaces the simple weekend/season multiplier in main.py.
    """
    today = date.today()
    forecast = []

    for i in range(days):
        target = today + timedelta(days=i)
        ctx = PricingContext(
            neighborhood=neighborhood,
            target_date=target,
            min_price=min_price,
            max_price=max_price,
            nights_requested=nights_requested,
        )
        result = calculate_price(ctx)

        forecast.append({
            "date":       target.strftime("%b %d"),
            "day":        target.strftime("%a"),
            "price":      result.final_price,
            "base_price": result.base_price,
            "multiplier": result.total_multiplier,
            "signals":    [{"name": s.name, "multiplier": s.multiplier, "reason": s.reason, "magnitude": s.magnitude} for s in result.signals],
            "summary":    result.summary,
            "clamped":    result.clamped,
        })

    return forecast
