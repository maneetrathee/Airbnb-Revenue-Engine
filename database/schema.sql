-- 1. Setup Database
-- Note: You cannot run CREATE DATABASE inside a transaction block in some tools, 
-- but keeping it here for documentation is fine.
-- CREATE DATABASE airbnb_engine;
-- \c airbnb_engine;

-- 2. Clean Slate (Safety Check)
-- "CASCADE" deletes dependent tables (like market_history) automatically
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS market_history CASCADE;

-- 3. Create the Listings Table (Parent)
CREATE TABLE listings (
    id BIGINT PRIMARY KEY,
    name TEXT,
    neighborhood TEXT,
    room_type VARCHAR(50),
    price_base DECIMAL(10,2) -- Using DECIMAL is best for money
);

-- 4. Create the Market History Table (Child)
CREATE TABLE market_history (
    listing_id BIGINT REFERENCES listings(id),
    observation_date DATE,
    available BOOLEAN,
    current_price DECIMAL(10,2),
    PRIMARY KEY (listing_id, observation_date)
);

-- 5. PERFORMANCE INDEXES (Crucial for 35M rows)
-- Speeds up "Get me all data for February"
CREATE INDEX idx_history_date ON market_history(observation_date);

-- Speeds up "Get me all data for Listing X"
CREATE INDEX idx_history_listing ON market_history(listing_id);

-- Speeds up "Get me all listings in Westminster"
CREATE INDEX idx_listings_neighborhood ON listings(neighborhood);