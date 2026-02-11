import streamlit as st
import pandas as pd
from sqlalchemy import create_engine
import seaborn as sns
import matplotlib.pyplot as plt

# 1. Database Connection
# We cache this so it doesn't reload every time you click a button
@st.cache_resource
def get_db_engine():
    return create_engine("postgresql://localhost:5432/airbnb_engine")

engine = get_db_engine()

# 2. Page Configuration
st.set_page_config(page_title="Airbnb Revenue Engine", page_icon="📈", layout="wide")

st.title("Airbnb Revenue Engine")
##st.markdown("### SDG 9: Innovation & Infrastructure Analytics")

# 3. Sidebar - The "Control Panel"
st.sidebar.header("Filter Options")

# Load Neighborhoods for the Dropdown
neighborhood_query = "SELECT DISTINCT neighborhood FROM listings ORDER BY 1"
neighborhoods = pd.read_sql(neighborhood_query, engine)['neighborhood'].tolist()
selected_neighborhood = st.sidebar.selectbox("Select Neighborhood", neighborhoods)

# 4. Main KPIs - The "Executive Summary"
# We query the 'demand_score' view for the selected neighborhood
kpi_query = f"""
SELECT 
    COUNT(*) as total_listings,
    AVG(price_base) as avg_price,
    AVG(estimated_monthly_revenue_proxy) as avg_revenue,
    AVG(monthly_reviews) as avg_reviews
FROM demand_score
WHERE neighborhood = '{selected_neighborhood}'
"""
kpi_df = pd.read_sql(kpi_query, engine)

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Listings", f"{kpi_df['total_listings'][0]:,.0f}")
col2.metric("Avg. Nightly Price", f"£{kpi_df['avg_price'][0]:,.2f}")
col3.metric("Est. Monthly Revenue", f"£{kpi_df['avg_revenue'][0]:,.2f}")
col4.metric("Reviews/Month", f"{kpi_df['avg_reviews'][0]:.2f}")

st.divider()

# 5. Innovation Potential - Correlation Heatmap (The "Feb 11 Task")
st.subheader("Market Innovation Signals (Correlation Matrix)")
st.write("Analyzing how Price, Reviews, and Revenue interact to identify efficiency gaps.")

# Fetch data for correlation (Top 500 listings in the area to keep it fast)
corr_query = f"""
SELECT price_base as Price, monthly_reviews as Reviews, estimated_bookings_count as Bookings, estimated_monthly_revenue_proxy as Revenue
FROM demand_score
WHERE neighborhood = '{selected_neighborhood}'
LIMIT 500
"""
corr_df = pd.read_sql(corr_query, engine)

if not corr_df.empty:
    fig, ax = plt.subplots(figsize=(10, 4))
    sns.heatmap(corr_df.corr(), annot=True, cmap='coolwarm', fmt=".2f", ax=ax)
    st.pyplot(fig)
else:
    st.warning("Not enough data to generate correlation heatmap.")

# 6. Price Distribution
st.subheader(f"Price Distribution in {selected_neighborhood}")
dist_query = f"SELECT price_base FROM listings WHERE neighborhood = '{selected_neighborhood}' AND price_base < 1000"
dist_df = pd.read_sql(dist_query, engine)

st.bar_chart(dist_df['price_base'].value_counts().sort_index())

st.divider()

# 7. Time Series Analysis (Fixed: Aggregated by Neighborhood)
st.subheader(f"📅 Occupancy & Price Trends in {selected_neighborhood}")

# THE FIX: We added "AVG()" and "GROUP BY month" to smooth the line
trend_query = f"""
SELECT 
    month, 
    AVG(occupancy_rate) as occupancy_rate, 
    AVG(estimated_revenue) as estimated_revenue 
FROM monthly_metrics 
WHERE neighborhood = '{selected_neighborhood}'
AND total_days > 0
GROUP BY month
ORDER BY month ASC
"""
trend_df = pd.read_sql(trend_query, engine)

if not trend_df.empty:
    tab1, tab2 = st.tabs(["📈 Occupancy Rate", "💷 Est. Revenue"])
    
    with tab1:
        # We specify the x-axis (index) explicitly to avoid confusion
        st.line_chart(trend_df.set_index("month")["occupancy_rate"])
        st.caption("Average occupancy percentage for the entire neighborhood.")
        
    with tab2:
        st.line_chart(trend_df.set_index("month")["estimated_revenue"])
        st.caption("Average monthly revenue per listing.")
else:
    st.info("No trend data available for this neighborhood.")