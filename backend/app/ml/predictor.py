import joblib
import numpy as np
import pandas as pd
import os
import json
from datetime import date

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")

_model                 = None
_neighbourhood_encoder = None
_metrics               = None


def _load_model():
    global _model, _neighbourhood_encoder, _metrics

    model_path   = os.path.join(MODEL_DIR, "lightgbm_price_model.pkl")
    encoder_path = os.path.join(MODEL_DIR, "neighbourhood_encoder.pkl")
    metrics_path = os.path.join(MODEL_DIR, "model_metrics.json")

    if not os.path.exists(model_path):
        raise FileNotFoundError("Model not trained yet. Run train_model.py first.")

    _model                 = joblib.load(model_path)
    _neighbourhood_encoder = joblib.load(encoder_path)

    with open(metrics_path) as f:
        _metrics = json.load(f)

    print("ML model loaded.")


def get_model():
    if _model is None:
        _load_model()
    return _model, _neighbourhood_encoder, _metrics


def predict_price(
    neighbourhood: str,
    room_type: str,
    accommodates: int,
    bedrooms: float,
    beds: float,
    bathrooms: float,
    minimum_nights: int,
    availability_365: int,
    number_of_reviews: int,
    number_of_reviews_ltm: int,
    reviews_per_month: float,
    review_scores_rating: float,
    review_scores_cleanliness: float,
    review_scores_location: float,
    review_scores_value: float,
    estimated_occupancy_l365d: float,
    estimated_revenue_l365d: float,
    amenity_count: int,
    host_is_superhost: bool,
    host_identity_verified: bool,
    host_response_rate: float,
    host_acceptance_rate: float,
    calculated_host_listings_count: int,
    instant_bookable: bool,
    latitude: float,
    longitude: float,
    # Neighbourhood market signals
    neighbourhood_median_price: float,
    neighbourhood_mean_price: float,
    neighbourhood_avg_occupancy: float,
    neighbourhood_avg_revenue: float,
    neighbourhood_listing_count: int,
    neighbourhood_avg_rating: float,
    neighbourhood_avg_accommodates: float,
) -> dict:

    model, neighbourhood_encoder, metrics = get_model()

    # Encode room type
    room_type_map = {
        'Entire home/apt': 1.0,
        'Private room':    0.45,
        'Hotel room':      0.6,
        'Shared room':     0.25,
    }
    room_type_score    = room_type_map.get(room_type, 0.5)
    is_entire_property = int(room_type == 'Entire home/apt')

    # Encode neighbourhood
    neighbourhood_encoded       = neighbourhood_encoder.get(neighbourhood, 0)
    neighbourhood_group_encoded = 0  # default, not critical

    # Revenue per night estimate
    revenue_per_night_est = (
        estimated_revenue_l365d / max(estimated_occupancy_l365d, 1)
    )

    features = pd.DataFrame([{
        'room_type_score':                   room_type_score,
        'is_entire_property':                is_entire_property,
        'accommodates':                      accommodates,
        'bedrooms':                          bedrooms,
        'beds':                              beds,
        'bathrooms':                         bathrooms,
        'amenity_count':                     amenity_count,
        'minimum_nights':                    min(minimum_nights, 30),
        'availability_365':                  availability_365,
        'instant_bookable':                  int(instant_bookable),
        'host_is_superhost':                 int(host_is_superhost),
        'host_identity_verified':            int(host_identity_verified),
        'host_response_rate':                host_response_rate,
        'host_acceptance_rate':              host_acceptance_rate,
        'calculated_host_listings_count':    calculated_host_listings_count,
        'number_of_reviews':                 number_of_reviews,
        'number_of_reviews_ltm':             number_of_reviews_ltm,
        'reviews_per_month':                 reviews_per_month,
        'review_scores_rating':              review_scores_rating,
        'review_scores_cleanliness':         review_scores_cleanliness,
        'review_scores_location':            review_scores_location,
        'review_scores_value':               review_scores_value,
        'estimated_occupancy_l365d':         estimated_occupancy_l365d,
        'estimated_revenue_l365d':           estimated_revenue_l365d,
        'revenue_per_night_est':             revenue_per_night_est,
        'latitude':                          latitude,
        'longitude':                         longitude,
        'neighbourhood_encoded':             neighbourhood_encoded,
        'neighbourhood_group_encoded':       neighbourhood_group_encoded,
        'neighbourhood_median_price':        neighbourhood_median_price,
        'neighbourhood_mean_price':          neighbourhood_mean_price,
        'neighbourhood_avg_occupancy':       neighbourhood_avg_occupancy,
        'neighbourhood_avg_revenue':         neighbourhood_avg_revenue,
        'neighbourhood_listing_count':       neighbourhood_listing_count,
        'neighbourhood_avg_rating':          neighbourhood_avg_rating,
        'neighbourhood_avg_accommodates':    neighbourhood_avg_accommodates,
    }])

    predicted_price = float(model.predict(features)[0])
    predicted_price = max(predicted_price, 10.0)

    return {
        "predicted_price":              round(predicted_price, 2),
        "neighbourhood":                neighbourhood,
        "room_type":                    room_type,
        "accommodates":                 accommodates,
        "model_r2":                     metrics.get("R2"),
        "model_mae":                    metrics.get("MAE"),
        "model_trained_at":             metrics.get("trained_at"),
    }