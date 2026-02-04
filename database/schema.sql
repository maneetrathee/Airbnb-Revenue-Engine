-- Create the project database
CREATE DATABASE airbnb_engine;

-- Switch to the new database
\c airbnb_engine;

-- Create the listings table
CREATE TABLE listings (
    id BIGINT PRIMARY KEY,
    name TEXT,
    neighborhood TEXT,
    room_type VARCHAR(50),
    price_base DECIMAL(10,2)
);

-- Create the market history table
CREATE TABLE market_history (
    listing_id BIGINT REFERENCES listings(id),
    observation_date DATE,
    available BOOLEAN,
    current_price DECIMAL(10,2),
    PRIMARY KEY (listing_id, observation_date)
);