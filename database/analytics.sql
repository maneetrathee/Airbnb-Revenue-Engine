-- ANALYTICS LAYER
-- Purpose: Aggregates raw 35M row time-series data into monthly business metrics.

-- 1. Drop view if it exists (handles schema changes)
DROP VIEW IF EXISTS monthly_metrics;

-- 2. Create the Master View
CREATE VIEW monthly_metrics AS
SELECT 
    l.id AS listing_id,
    l.neighborhood,
    TO_CHAR(mh.observation_date, 'YYYY-MM') AS month,
    
    -- Volume Metrics
    COUNT(*) AS total_days,
    SUM(CASE WHEN mh.available = false THEN 1 ELSE 0 END) AS days_booked,
    
    -- Performance Metrics (Occupancy Rate)
    ROUND(
        (SUM(CASE WHEN mh.available = false THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
    2) AS occupancy_rate,
    
    -- Financial Metrics (Estimated Revenue)
    -- Logic: If calendar price is NULL (common for booked days), fallback to listing's base price.
    SUM(
        CASE 
            WHEN mh.available = false THEN COALESCE(mh.current_price, l.price_base) 
            ELSE 0 
        END
    ) AS estimated_revenue

FROM listings l
JOIN market_history mh ON l.id = mh.listing_id
GROUP BY 1, 2, 3;