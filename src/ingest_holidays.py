import requests
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime

# 1. Setup Database Connection
engine = create_engine("postgresql://localhost:5432/airbnb_engine")

def fetch_uk_holidays(start_year=2010, future_years=2):
    """
    Fetches Public Holidays for a wide range:
    - PAST: To match historical training data (e.g., 2010-2023)
    - FUTURE: To allow predictions for upcoming years (e.g., 2026, 2027)
    """
    current_year = datetime.now().year
    end_year = current_year + future_years
    
    # Generate range: 2010, 2011, ..., 2026, 2027
    years = list(range(start_year, end_year + 1))
    
    all_holidays = []
    print(f"Connecting to Public Holiday API for full history: {start_year} to {end_year}...")
    
    for year in years:
        url = f"https://date.nager.at/api/v3/publicholidays/{year}/GB"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                for holiday in data:
                    all_holidays.append({
                        "date": holiday['date'],
                        "name": holiday['name'],
                        "country_code": "GB"
                    })
                # Print a dot for each year to show progress without spamming
                print(f" {year}: Fetched {len(data)} holidays")
            else:
                print(f" {year}: No data found")
        except Exception as e:
            print(f" {year}: Network error ({e})")

    return pd.DataFrame(all_holidays)

if __name__ == "__main__":
    df = fetch_uk_holidays()
    
    if not df.empty:
        print(f"\n Saving {len(df)} total holidays to database...")
        # We replace the table so we have a clean, complete timeline
        df.to_sql('public_holidays', engine, if_exists='replace', index=False)
        print("Success! Your AI now understands holidays from 2010 to 2027.")
    else:
        print("No data found.")