import pandas as pd
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# Database Connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

def ingest_calendar():
    # Note: Pandas can read GZIP files directly, no need to unzip!
    file_path = 'data/calendar.csv.gz'
    
    if not os.path.exists(file_path):
        print(f" Error: {file_path} not found. Please check data/ folder.")
        return

    print(" Starting Calendar Ingestion (Chunked Mode)...")
    
    chunk_size = 10000  # Process 10k rows at a time
    total_rows = 0
    
    # Create an iterator to read the file in parts
    chunk_iterator = pd.read_csv(file_path, compression='gzip', chunksize=chunk_size)
    
    for i, chunk in enumerate(chunk_iterator):
        # 1. CLEANING
        # Convert 't'/'f' to True/False for Boolean column
        chunk['available'] = chunk['available'].map({'t': True, 'f': False})
        
        # Clean Price (Remove $ and ,)
        if 'price' in chunk.columns:
            chunk['price'] = chunk['price'].astype(str).str.replace('[\$,]', '', regex=True)
            chunk['price'] = pd.to_numeric(chunk['price'], errors='coerce') # Handle "nan" cleanly

        # 2. MAPPING
        # Map CSV columns to SQL Table columns
        rename_map = {
            'listing_id': 'listing_id',
            'date': 'observation_date',
            'available': 'available',
            'price': 'current_price'
        }
        
        # Select and Rename
        df_final = chunk[list(rename_map.keys())].rename(columns=rename_map)
        
        # 3. LOADING
        try:
            # Important: Use 'append' so we add to the table, don't delete it
            df_final.to_sql('market_history', engine, if_exists='append', index=False)
            
            total_rows += len(df_final)
            if i % 10 == 0:
                print(f"⏳ Processed {total_rows} rows...")
                
        except Exception as e:
            # If a chunk fails (e.g., listing_id doesn't exist in listings table), print but keep going
            print(f"⚠️ Chunk {i} Warning: {e}")
            continue

    print(f" COMPLETED! Ingested total of {total_rows} market history records.")

if __name__ == "__main__":
    ingest_calendar()