-- FEATURE ENGINEERING LAYER
-- Purpose: Prepares raw data for Machine Learning models (Prophet/XGBoost)
-- Adds time-based features (Day of Week, Seasonality) directly in the database.

DROP VIEW IF EXISTS training_data;

CREATE VIEW training_data AS
SELECT 
    mh.listing_id,
    l.neighborhood,
    l.room_type,
    mh.observation_date,
    
    -- Target Variable (What we want to predict)
    -- Use the listing's base price if the calendar price is NULL
    COALESCE(mh.current_price, l.price_base) AS price,
    
    -- Feature 1: Day of Week (0=Sunday, 6=Saturday in some SQL dialects, let's use Text for clarity)
    TO_CHAR(mh.observation_date, 'Day') AS day_name,
    
    -- Feature 2: Is it a Weekend? (Friday, Saturday, Sunday often have higher demand)
    CASE 
        WHEN EXTRACT(ISODOW FROM mh.observation_date) IN (5, 6, 7) THEN 1 
        ELSE 0 
    END AS is_weekend,
    
    -- Feature 3: Seasonality (Month)
    EXTRACT(MONTH FROM mh.observation_date) AS month,
    
    -- Feature 4: Availability (1=Available, 0=Booked)
    CASE WHEN mh.available = 't' THEN 1 ELSE 0 END AS is_available

FROM market_history mh
JOIN listings l ON mh.listing_id = l.id
-- Filter: We only want data where we have a valid price to learn from
WHERE COALESCE(mh.current_price, l.price_base) > 0;