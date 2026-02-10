import pandas as pd
from sqlalchemy import create_engine
import os

# Connection setup
DB_URL = "postgresql://localhost:5432/airbnb_engine"
engine = create_engine(DB_URL)

def ingest_listings():
    file_path = 'data/listings.csv'
    
    if not os.path.exists(file_path):
        print(f" Error: {file_path} not found.")
        return

    print(" Script started. Reading CSV...")
    df = pd.read_csv(file_path)
    print(f" Found {len(df)} rows in CSV.")

    # Data Cleaning: Remove $ and , from price
    if 'price' in df.columns:
        print(" Cleaning price column...")
        df['price'] = df['price'].astype(str).str.replace('[\$,]', '', regex=True).astype(float)
    
    # Map the columns exactly as they appear in your 'head' output
    rename_map = {
        'id': 'id',
        'name': 'name',
        'neighbourhood': 'neighborhood', # Matches your CSV 'neighbourhood'
        'room_type': 'room_type',
        'price': 'price_base',
        'reviews_per_month': 'reviews_per_month'
    }
    
    # Filter and rename
    df_final = df[list(rename_map.keys())].rename(columns=rename_map)
    print(" Data mapping complete. First 3 rows:")
    print(df_final.head(3))

    # Load into Postgres
    try:
        print("out sending to Database...")
        # 'replace' will drop the empty table and recreate it correctly
        df_final.to_sql('listings', engine, if_exists='replace', index=False)
        print(f" SUCCESS! Ingested {len(df_final)} listings into PostgreSQL.")
    except Exception as e:
        print(f" Database Error: {e}")

# THIS PART IS CRUCIAL - It tells Python to actually run the function
if __name__ == "__main__":
    ingest_listings()