from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json, os

from .predictor import predict_price, get_model

router = APIRouter(prefix="/api/v1/ml", tags=["ML"])

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")


class PredictRequest(BaseModel):
    neighbourhood:                  str
    room_type:                      str
    accommodates:                   int
    bedrooms:                       float
    beds:                           float
    bathrooms:                      float
    minimum_nights:                 int     = 1
    availability_365:               int     = 180
    number_of_reviews:              int     = 0
    number_of_reviews_ltm:          int     = 0
    reviews_per_month:              float   = 0.0
    review_scores_rating:           float   = 4.5
    review_scores_cleanliness:      float   = 4.5
    review_scores_location:         float   = 4.5
    review_scores_value:            float   = 4.5
    estimated_occupancy_l365d:      float   = 60.0
    estimated_revenue_l365d:        float   = 0.0
    amenity_count:                  int     = 20
    host_is_superhost:              bool    = False
    host_identity_verified:         bool    = True
    host_response_rate:             float   = 90.0
    host_acceptance_rate:           float   = 80.0
    calculated_host_listings_count: int     = 1
    instant_bookable:               bool    = False
    latitude:                       float
    longitude:                      float
    neighbourhood_median_price:     float
    neighbourhood_mean_price:       float
    neighbourhood_avg_occupancy:    float   = 60.0
    neighbourhood_avg_revenue:      float   = 0.0
    neighbourhood_listing_count:    int     = 100
    neighbourhood_avg_rating:       float   = 4.5
    neighbourhood_avg_accommodates: float   = 3.0


@router.post("/predict")
def predict(req: PredictRequest):
    try:
        result = predict_price(**req.dict())
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained yet.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
def get_metrics():
    metrics_path = os.path.join(MODEL_DIR, "model_metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="No trained model found.")
    with open(metrics_path) as f:
        return json.load(f)


@router.get("/status")
def model_status():
    metrics_path = os.path.join(MODEL_DIR, "model_metrics.json")
    if not os.path.exists(metrics_path):
        return {"status": "not_trained"}
    with open(metrics_path) as f:
        m = json.load(f)
    return {
        "status":       "ready",
        "trained_at":   m.get("trained_at"),
        "r2_score":     m.get("R2"),
        "mae":          m.get("MAE"),
        "rmse":         m.get("RMSE"),
        "mape":         m.get("MAPE"),
        "test_rows":    m.get("test_rows"),
        "features":     m.get("feature_columns"),
    }


@router.get("/neighbourhoods")
def get_neighbourhoods():
    """Returns all neighbourhoods the model knows about"""
    try:
        _, encoder, _ = get_model()
        return {"neighbourhoods": sorted(encoder.keys())}
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained yet.")
    
@router.get("/comparison")
def get_comparison():
    path = os.path.join(MODEL_DIR, "model_comparison.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No comparison data found.")
    with open(path) as f:
        return json.load(f)