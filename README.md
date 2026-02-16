# 🇬🇧 London Airbnb Revenue Engine (LARE)

## 📌 Project Status: Sprint 1 Complete (Data Foundation)

**Objective:** Build an Enterprise-Grade Data Warehouse to analyze 35M+ real estate data points.

### 🏗 System Architecture (Sprint 1)

1.  **Data Warehouse:** PostgreSQL 14 (Local)
2.  **ETL Pipeline:** Python (Pandas + SQLAlchemy) for batch processing.
3.  **External Intelligence:** Integrated `Nager.Date` API for dynamic Holiday Data ingestion (2010-2027).
4.  **Analytics Engine:** SQL Views (`demand_score`, `monthly_metrics`) for real-time aggregation.
5.  **Visualization:** Streamlit Dashboard with Correlation Heatmaps & 3D Geospatial Maps.

### 📊 Key Metrics

- **Total Listings:** ~90,000+
- **Historical Data Points:** ~35 Million
- **Data Integrity:** Validated via `qa_check.py` automated suite.

### 🚀 Next Steps (Sprint 2)

- Transition to Microservices Architecture (FastAPI + React).
- Implement Vector Search for "Cold Start" Pricing.
