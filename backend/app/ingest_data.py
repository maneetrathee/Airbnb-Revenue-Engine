import pandas as pd
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/airbnb_engine")
engine = create_engine(DB_URL)

def ingest_listings():
    file_path = 'data/listings.csv'
    
    if not os.path.exists(file_path):
        print(f" Error: {file_path} not found.")
        return

    print(" Script started. Reading CSV...")
    df = pd.read_csv(file_path)
    print(f" Found {len(df)} rows in CSV.")

    if 'price' in df.columns:
        print(" Cleaning price column...")
        df['price'] = df['price'].astype(str).str.replace('[\$,]', '', regex=True)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')

    rename_map = {
        'id': 'id',
        'name': 'name',
        'neighbourhood_cleansed': 'neighborhood',
        'room_type': 'room_type',
        'price': 'price_base',
        'reviews_per_month': 'reviews_per_month'
    }

    df_final = df[list(rename_map.keys())].rename(columns=rename_map)
    print(" Data mapping complete. First 3 rows:")
    print(df_final.head(3))

    try:
        print(" Sending to Database (upsert mode)...")
        with engine.begin() as conn:
            conn.execute(text("TRUNCATE listings CASCADE"))
            print(" Table cleared.")

        df_final.to_sql('listings', engine, if_exists='append', index=False, method='multi', chunksize=500)
        print(f" SUCCESS! Ingested {len(df_final)} listings into PostgreSQL.")

    except Exception as e:
        print(f" Database Error: {e}")

if __name__ == "__main__":
    ingest_listings()