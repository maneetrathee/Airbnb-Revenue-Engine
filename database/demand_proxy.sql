-- DEMAND PROXY LAYER (SDG 8: Economic Growth)
-- Purpose: Estimate "Occupancy" using Review Frequency when calendar data is missing.
-- Logic: Roughly 50% of guests leave a review. So (Reviews * 2) = Estimated Bookings.

DROP VIEW IF EXISTS demand_score;

CREATE VIEW demand_score AS
SELECT 
    l.id,
    l.neighborhood,
    l.price_base,
    COALESCE(l.reviews_per_month, 0) AS monthly_reviews,
    
    -- The "San Francisco" Demand Metric
    -- Formula: (Reviews per month * 2) gives estimated bookings.
    -- We cap it at 20 bookings/month to avoid mathematical outliers.
    LEAST(COALESCE(l.reviews_per_month, 0) * 2, 20) AS estimated_bookings_count,
    
    -- Economic Activity Score (Price * Estimated Bookings)
    (l.price_base * LEAST(COALESCE(l.reviews_per_month, 0) * 2, 20)) AS estimated_monthly_revenue_proxy

FROM listings l
WHERE l.price_base > 0;