import pandas as pd
from sqlalchemy import create_engine, text

def run_qa_checks():
    print("🕵️‍♀️ Starting System Diagnostics (QA Check)...")
    
    # 1. Connect to Database
    try:
        engine = create_engine("postgresql://localhost:5432/airbnb_engine")
        conn = engine.connect()
        print("   ✅ Database Connection: ACTIVE")
    except Exception as e:
        print(f"   ❌ Database Connection: FAILED ({e})")
        return

    # 2. Check Raw Data (Listings)
    try:
        count = pd.read_sql("SELECT COUNT(*) FROM listings", conn).iloc[0,0]
        if count > 0:
            print(f"   ✅ Raw Data Integrity: PASS ({count:,} listings loaded)")
        else:
            print("   ❌ Raw Data Integrity: FAIL (Table is empty)")
    except:
        print("   ❌ Raw Data Integrity: FAIL (Table missing)")

    # 3. Check External Data (Holidays)
    try:
        holidays = pd.read_sql("SELECT COUNT(*) FROM public_holidays", conn).iloc[0,0]
        if holidays > 0:
            print(f"   ✅ External API Data: PASS ({holidays} holidays cached)")
        else:
            print("   ⚠️ External API Data: WARNING (0 holidays found. Did you run ingest_holidays.py?)")
    except:
        print("   ❌ External API Data: FAIL (Table missing)")

    # 4. Check Analytical Views (The "Brain")
    try:
        # We try to query the view to ensure the SQL logic is valid
        view_test = pd.read_sql("SELECT * FROM demand_score LIMIT 5", conn)
        if not view_test.empty:
            print("   ✅ Analytical Engine (Views): PASS (Demand Score logic is valid)")
        else:
            print("   ❌ Analytical Engine: FAIL (View returned no data)")
    except Exception as e:
        print(f"   ❌ Analytical Engine: FAIL ({e})")

    conn.close()
    print("\n🎯 QA Cycle Complete.")

if __name__ == "__main__":
    run_qa_checks()