from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer

# 1. Initialize API
app = FastAPI(
    title="Airbnb Revenue Engine API",
    version="2.0",
    description="AI-Powered Real Estate Investment Platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Global Resources (Load once when server starts)
DB_URL = "postgresql://localhost:5432/airbnb_engine"
engine = create_engine(DB_URL)

print("🤖 Loading AI Model for API...")
model = SentenceTransformer('all-MiniLM-L6-v2')

# 3. Endpoints
@app.get("/")
def read_root():
    return {"status": "✅ API Online", "module": "Sprint 2 - Intelligence Engine"}

@app.get("/api/v1/predict-price")
def predict_price(description: str = Query(..., description="Describe your property")):
    """
    Takes a text description, converts to vector, and finds similar properties to recommend a price.
    """
    # Step A: Convert text to vector
    query_vector = model.encode(description).tolist()
    vector_str = f"[{','.join(map(str, query_vector))}]"
    
    # Step B: Search Database (Filtering out NULL prices this time!)
    sql = text("""
        SELECT name, price_base, 
               round((1 - (description_embedding <=> :vec))::numeric, 3) AS similarity
        FROM listings
        WHERE description_embedding IS NOT NULL
        AND price_base IS NOT NULL
        ORDER BY description_embedding <=> :vec
        LIMIT 5;
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"vec": vector_str})
        
    if df.empty:
        return {"error": "Not enough processed data to predict price."}
        
    # Step C: Calculate metrics
    avg_price = df['price_base'].mean()
    matches = df.to_dict(orient="records")
    
    return {
        "query": description,
        "recommended_price": round(avg_price, 2),
        "similar_listings": matches
    }