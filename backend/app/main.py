from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer
from datetime import datetime, timedelta

# 1. Initialize API
app = FastAPI(
    title="Airbnb Revenue Engine API",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Global Resources
DB_URL = "postgresql://localhost:5432/airbnb_engine"
engine = create_engine(DB_URL)

print("🤖 Loading AI Model for API...")
model = SentenceTransformer('all-MiniLM-L6-v2')

# 3. Endpoints
@app.get("/api/v1/predict-price")
def predict_price(description: str = Query(..., description="Describe your property")):
    
    # A: Vector Search
    query_vector = model.encode(description).tolist()
    vector_str = f"[{','.join(map(str, query_vector))}]"
    
    # REAL DATA QUERY: Pulling actual latitude and longitude
    sql = text("""
        SELECT name, price_base, latitude, longitude,
               round((1 - (description_embedding <=> :vec))::numeric, 3) AS similarity
        FROM listings
        WHERE description_embedding IS NOT NULL
        AND price_base IS NOT NULL
        AND latitude IS NOT NULL
        ORDER BY description_embedding <=> :vec
        LIMIT 5;
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"vec": vector_str})
        
    if df.empty:
        return {"error": "Not enough processed data to predict price."}
        
    # B: Calculate Base Price
    base_price = float(df['price_base'].mean())
    
    # C: Dynamic Pricing Algorithm (7-Day Forecast)
    forecast = []
    today = datetime.now()
    
    for i in range(7):
        target_date = today + timedelta(days=i)
        modifier = 1.0
        tags = []
        
        if target_date.weekday() in [4, 5]:
            modifier += 0.15
            tags.append("Weekend (+15%)")
            
        if target_date.month in [6, 7, 8]:
            modifier += 0.20
            tags.append("Summer Peak (+20%)")
        elif target_date.month in [11, 12]:
            modifier += 0.10
            tags.append("Holiday Demand (+10%)")
            
        if not tags:
            tags.append("Standard Rate")
            
        forecast.append({
            "date": target_date.strftime("%b %d"),
            "day": target_date.strftime("%a"),
            "price": round(base_price * modifier, 2),
            "tags": tags
        })
    
    return {
        "query": description,
        "base_price": round(base_price, 2),
        "similar_listings": df.to_dict(orient="records"), # Returning the REAL db records
        "forecast": forecast
    }