import pandas as pd
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text
import time
import os
from dotenv import load_dotenv

load_dotenv()

# 1. Setup Database Connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

# 2. Load the AI Model
print("🤖 Loading AI Model...")
model = SentenceTransformer('all-MiniLM-L6-v2') 

def generate_embeddings():
    print("🧠 Fetching Listings for AI Processing...")
    
    # We grab 100 rows that have a NAME but NO embedding yet
    query = """
    SELECT id, name 
    FROM listings 
    WHERE name IS NOT NULL 
    AND description_embedding IS NULL
    LIMIT 100;
    """
    
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)
        
    if df.empty:
        print("✅ All listings already processed!")
        return

    print(f"🔄 Reading and encoding {len(df)} properties...")
    
    # 3. Convert Text to Vectors (Using the 'name' column)
    text_data = df['name'].tolist()
    embeddings = model.encode(text_data, show_progress_bar=True)
    
    # 4. Save back to the Vector Database
    print("💾 Saving AI embeddings to PostgreSQL...")
    with engine.begin() as conn:
        for index, row in df.iterrows():
            listing_id = row['id']
            # Convert numpy array to a string format Postgres understands
            vector_str = f"[{','.join(map(str, embeddings[index]))}]"
            
            sql = text("UPDATE listings SET description_embedding = :vec WHERE id = :id")
            conn.execute(sql, {"vec": vector_str, "id": listing_id})
            
    print(f"🎉 Success! Processed and saved {len(df)} listings.")

if __name__ == "__main__":
    generate_embeddings()