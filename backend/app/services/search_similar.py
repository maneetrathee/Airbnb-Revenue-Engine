import pandas as pd
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# 1. Setup
DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

print("🤖 Loading AI Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

def find_similar_listings(query_text, limit=5):
    print(f"\n🔍 Searching for: '{query_text}'")
    
    # 2. Convert the user's search text into a vector
    query_vector = model.encode(query_text).tolist()
    vector_str = f"[{','.join(map(str, query_vector))}]"
    
    # 3. Search Postgres using Cosine Distance (<=>)
    # This mathematically finds the closest listings!
    sql = text("""
        SELECT name, price_base, 
               round((1 - (description_embedding <=> :vec))::numeric, 3) AS similarity
        FROM listings
        WHERE description_embedding IS NOT NULL
        ORDER BY description_embedding <=> :vec
        LIMIT :limit;
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"vec": vector_str, "limit": limit})
        
    print("\n🎯 Top Matches:")
    if df.empty:
        print("No results found.")
    else:
        print(df.to_string(index=False))
        
    # Calculate Cold Start Recommended Price
    if not df.empty and df['price_base'].notna().any():
        avg_price = df['price_base'].mean()
        print(f"\n💡 Cold Start Recommended Price: £{avg_price:.2f} per night")

if __name__ == "__main__":
    # Feel free to change this text to test different vibes!
    test_query = "Cozy and quiet private room"
    find_similar_listings(test_query)