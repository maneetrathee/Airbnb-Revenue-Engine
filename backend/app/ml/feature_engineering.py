import pandas as pd
import numpy as np
import os

DATA_DIR     = "/Users/maneetrathee/Desktop/Projects/Airbnb-Revenue-Engine/data"
LISTINGS_CSV = os.path.join(DATA_DIR, "listings.csv")


def load_training_data():
    print("Loading detailed listings.csv...")
    df = pd.read_csv(LISTINGS_CSV, low_memory=False)
    print(f"  {len(df):,} listings loaded, {len(df.columns)} columns")

    # Clean price — remove $ and commas
    df['price'] = (
        df['price']
        .astype(str)
        .str.replace(r'[\$,]', '', regex=True)
        .str.strip()
    )
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df = df[
        df['price'].notna() &
        (df['price'] > 10) &
        (df['price'] < 2000)
    ]
    print(f"  {len(df):,} listings after price filter (£10–£2000)")
    return df


def engineer_features(df):
    print("Engineering features...")

    # ── Room type ────────────────────────────────────────────────────────
    room_type_map = {
        'Entire home/apt': 1.0,
        'Private room':    0.45,
        'Hotel room':      0.6,
        'Shared room':     0.25,
    }
    df['room_type_score'] = df['room_type'].map(room_type_map).fillna(0.5)

    # ── Property type score ──────────────────────────────────────────────
    # Entire properties command premium over rooms
    df['is_entire_property'] = df['room_type'].eq('Entire home/apt').astype(int)

    # ── Host features ────────────────────────────────────────────────────
    df['host_is_superhost'] = (
        df['host_is_superhost'].eq('t').astype(int)
    )
    df['host_identity_verified'] = (
        df['host_identity_verified'].eq('t').astype(int)
    )
    df['instant_bookable'] = (
        df['instant_bookable'].eq('t').astype(int)
    )

    # ── Numeric fills ────────────────────────────────────────────────────
    df['accommodates']              = df['accommodates'].fillna(2)
    df['bedrooms']                  = df['bedrooms'].fillna(1)
    df['beds']                      = df['beds'].fillna(1)
    df['bathrooms']                 = df['bathrooms'].fillna(1)
    df['minimum_nights']            = df['minimum_nights'].fillna(1).clip(upper=30)
    df['availability_365']          = df['availability_365'].fillna(180)
    df['number_of_reviews']         = df['number_of_reviews'].fillna(0)
    df['number_of_reviews_ltm']     = df['number_of_reviews_ltm'].fillna(0)
    df['reviews_per_month']         = df['reviews_per_month'].fillna(0)
    df['review_scores_rating']      = df['review_scores_rating'].fillna(
                                          df['review_scores_rating'].median()
                                      )
    df['review_scores_location']    = df['review_scores_location'].fillna(
                                          df['review_scores_location'].median()
                                      )
    df['review_scores_cleanliness'] = df['review_scores_cleanliness'].fillna(
                                          df['review_scores_cleanliness'].median()
                                      )
    df['review_scores_value']       = df['review_scores_value'].fillna(
                                          df['review_scores_value'].median()
                                      )
    df['calculated_host_listings_count'] = (
        df['calculated_host_listings_count'].fillna(1)
    )
    df['estimated_occupancy_l365d'] = (
        df['estimated_occupancy_l365d'].fillna(
            df['estimated_occupancy_l365d'].median()
        )
    )
    df['estimated_revenue_l365d']   = (
        df['estimated_revenue_l365d'].fillna(
            df['estimated_revenue_l365d'].median()
        )
    )

    # ── Amenity count (proxy for listing quality) ────────────────────────
    df['amenity_count'] = (
        df['amenities']
        .fillna('[]')
        .apply(lambda x: len(str(x).split(',')))
    )

    # ── Response rate as numeric ─────────────────────────────────────────
    df['host_response_rate'] = (
        df['host_response_rate']
        .astype(str)
        .str.replace('%', '')
        .str.strip()
    )
    df['host_response_rate'] = pd.to_numeric(
        df['host_response_rate'], errors='coerce'
    ).fillna(50)

    # ── Acceptance rate as numeric ───────────────────────────────────────
    df['host_acceptance_rate'] = (
        df['host_acceptance_rate']
        .astype(str)
        .str.replace('%', '')
        .str.strip()
    )
    df['host_acceptance_rate'] = pd.to_numeric(
        df['host_acceptance_rate'], errors='coerce'
    ).fillna(50)

    # ── Location ─────────────────────────────────────────────────────────
    df['latitude']  = df['latitude'].fillna(df['latitude'].median())
    df['longitude'] = df['longitude'].fillna(df['longitude'].median())

    # ── Neighbourhood encoding ───────────────────────────────────────────
    df['neighbourhood_encoded'] = pd.Categorical(
        df['neighbourhood_cleansed'].fillna('Unknown')
    ).codes
    df['neighbourhood_group_encoded'] = pd.Categorical(
        df['neighbourhood_group_cleansed'].fillna('Unknown')
    ).codes

    # ── Neighbourhood aggregates (critical for cold-start) ───────────────
    neighbourhood_stats = df.groupby('neighbourhood_cleansed').agg(
        neighbourhood_median_price       = ('price', 'median'),
        neighbourhood_mean_price         = ('price', 'mean'),
        neighbourhood_avg_occupancy      = ('estimated_occupancy_l365d', 'mean'),
        neighbourhood_avg_revenue        = ('estimated_revenue_l365d', 'mean'),
        neighbourhood_listing_count      = ('id', 'nunique'),
        neighbourhood_avg_rating         = ('review_scores_rating', 'mean'),
        neighbourhood_avg_accommodates   = ('accommodates', 'mean'),
    ).reset_index()

    df = df.merge(
        neighbourhood_stats,
        on='neighbourhood_cleansed',
        how='left'
    )

    # ── Revenue per night estimate ────────────────────────────────────────
    df['revenue_per_night_est'] = (
        df['estimated_revenue_l365d'] /
        df['estimated_occupancy_l365d'].clip(lower=1)
    )

    print(f"Feature engineering complete. Shape: {df.shape}")
    return df


def get_feature_columns():
    return [
        # Property size & type
        'room_type_score',
        'is_entire_property',
        'accommodates',
        'bedrooms',
        'beds',
        'bathrooms',
        'amenity_count',

        # Booking rules
        'minimum_nights',
        'availability_365',
        'instant_bookable',

        # Host quality
        'host_is_superhost',
        'host_identity_verified',
        'host_response_rate',
        'host_acceptance_rate',
        'calculated_host_listings_count',

        # Review signals
        'number_of_reviews',
        'number_of_reviews_ltm',
        'reviews_per_month',
        'review_scores_rating',
        'review_scores_cleanliness',
        'review_scores_location',
        'review_scores_value',

        # Occupancy & revenue signals (from Inside Airbnb estimates)
        'estimated_occupancy_l365d',
        'estimated_revenue_l365d',
        'revenue_per_night_est',

        # Location
        'latitude',
        'longitude',
        'neighbourhood_encoded',
        'neighbourhood_group_encoded',

        # Neighbourhood market signals (key for cold-start)
        'neighbourhood_median_price',
        'neighbourhood_mean_price',
        'neighbourhood_avg_occupancy',
        'neighbourhood_avg_revenue',
        'neighbourhood_listing_count',
        'neighbourhood_avg_rating',
        'neighbourhood_avg_accommodates',
    ]


def prepare_dataset(df):
    feature_cols = get_feature_columns()
    X = df[feature_cols].copy()
    y = df['price'].copy()

    mask = X.notna().all(axis=1)
    X = X[mask]
    y = y[mask]

    print(f"Final dataset: {len(X):,} rows, {len(X.columns)} features")
    return X, y