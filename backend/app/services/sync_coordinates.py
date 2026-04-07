import pandas as pd
from sqlalchemy import create_engine, text
import time
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

# Update this path to where your original CSV is stored!
csv_path = "/Users/maneetrathee/Desktop/Projects/Airbnb-Revenue-Engine/data/listings.csv" 

def sync_coordinates():
    print("📥 Loading CSV...")
    # We only read the 3 columns we care about to save RAM
    df = pd.read_csv(csv_path, usecols=['id', 'latitude', 'longitude'])
    df = df.dropna(subset=['id', 'latitude', 'longitude'])
    
    print(f"🔄 Syncing {len(df)} real coordinates to PostgreSQL...")
    start_time = time.time()
    
    with engine.begin() as conn:
        # 1. Fast bulk insert into a temporary table
        print("   -> Creating temp staging table...")
        df.to_sql('temp_coords', conn, if_exists='replace', index=False)
        
        # 2. Perform a massive SQL JOIN update
        print("   -> Merging coordinates into main listings table...")
        sql = text("""
            UPDATE listings l
            SET latitude = t.latitude,
                longitude = t.longitude
            FROM temp_coords t
            WHERE l.id = t.id;
        """)
        conn.execute(sql)
        
        # 3. Clean up
        conn.execute(text("DROP TABLE temp_coords;"))
        
    print(f"sync complete in {round(time.time() - start_time, 2)} seconds!")

if __name__ == "__main__":
    sync_coordinates()