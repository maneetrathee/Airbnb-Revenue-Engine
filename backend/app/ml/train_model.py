import pandas as pd
import numpy as np
import joblib
import os
import json
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor
import lightgbm as lgb
import xgboost as xgb
from catboost import CatBoostRegressor

from app.ml.feature_engineering import (
    load_training_data, engineer_features,
    prepare_dataset, get_feature_columns
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)


def evaluate(model, X_test, y_test, name):
    y_pred = np.maximum(model.predict(X_test), 0)

    mae  = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2   = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test.clip(lower=1))) * 100

    print(f"\n{'='*45}")
    print(f"  {name}")
    print(f"  MAE:  £{mae:.2f}")
    print(f"  RMSE: £{rmse:.2f}")
    print(f"  R²:   {r2:.4f}")
    print(f"  MAPE: {mape:.2f}%")
    print(f"{'='*45}")

    return {
        "model": name,
        "MAE":   round(mae,  2),
        "RMSE":  round(rmse, 2),
        "R2":    round(r2,   4),
        "MAPE":  round(mape, 2),
    }


def train_all(X_train, y_train, X_test, y_test):
    results = []
    models  = {}

    # ── 1. Linear Regression ─────────────────────────────────────────────
    print("\nTraining Linear Regression...")
    m = LinearRegression()
    m.fit(X_train, y_train)
    results.append(evaluate(m, X_test, y_test, "Linear Regression"))
    models["linear_regression"] = m

    # ── 2. Ridge Regression ──────────────────────────────────────────────
    print("\nTraining Ridge Regression...")
    m = Ridge(alpha=10.0)
    m.fit(X_train, y_train)
    results.append(evaluate(m, X_test, y_test, "Ridge Regression"))
    models["ridge_regression"] = m

    # ── 3. Lasso Regression ──────────────────────────────────────────────
    print("\nTraining Lasso Regression...")
    m = Lasso(alpha=1.0, max_iter=5000)
    m.fit(X_train, y_train)
    results.append(evaluate(m, X_test, y_test, "Lasso Regression"))
    models["lasso_regression"] = m

    # ── 4. Random Forest ─────────────────────────────────────────────────
    print("\nTraining Random Forest...")
    m = RandomForestRegressor(
        n_estimators=300,
        max_depth=15,
        min_samples_leaf=5,
        n_jobs=-1,
        random_state=42,
    )
    m.fit(X_train, y_train)
    results.append(evaluate(m, X_test, y_test, "Random Forest"))
    models["random_forest"] = m

    # ── 5. XGBoost ───────────────────────────────────────────────────────
    print("\nTraining XGBoost...")
    m = xgb.XGBRegressor(
        n_estimators=1000,
        learning_rate=0.05,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
        early_stopping_rounds=50,
        eval_metric="rmse",
    )
    m.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=100)
    results.append(evaluate(m, X_test, y_test, "XGBoost"))
    models["xgboost"] = m

    # ── 6. LightGBM ──────────────────────────────────────────────────────
    print("\nTraining LightGBM...")
    m = lgb.LGBMRegressor(
        n_estimators=1000,
        learning_rate=0.05,
        max_depth=8,
        num_leaves=63,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    m.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)],
    )
    results.append(evaluate(m, X_test, y_test, "LightGBM"))
    models["lightgbm"] = m

    # ── 7. CatBoost ──────────────────────────────────────────────────────
    print("\nTraining CatBoost...")
    m = CatBoostRegressor(
        iterations=1000,
        learning_rate=0.05,
        depth=8,
        random_seed=42,
        early_stopping_rounds=50,
        verbose=100,
    )
    m.fit(X_train, y_train, eval_set=(X_test, y_test))
    results.append(evaluate(m, X_test, y_test, "CatBoost"))
    models["catboost"] = m

    return models, results


def save_all(models, results, neighbourhood_encoder):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save every model
    for name, model in models.items():
        path = os.path.join(MODEL_DIR, f"{name}_model.pkl")
        joblib.dump(model, path)
        print(f"Saved: {path}")

    # Save neighbourhood encoder
    joblib.dump(
        neighbourhood_encoder,
        os.path.join(MODEL_DIR, "neighbourhood_encoder.pkl")
    )

    # Save comparison results
    comparison = {
        "trained_at":      timestamp,
        "test_rows":       None,
        "feature_columns": get_feature_columns(),
        "results":         results,
        "best_model":      max(results, key=lambda x: x["R2"])["model"],
    }
    path = os.path.join(MODEL_DIR, "model_comparison.json")
    with open(path, "w") as f:
        json.dump(comparison, f, indent=2)
    print(f"\nComparison saved: {path}")

    # Also save LightGBM as the deployed model (best production choice)
    joblib.dump(
        models["lightgbm"],
        os.path.join(MODEL_DIR, "lightgbm_price_model.pkl")
    )

    # Save LightGBM metrics as model_metrics.json for existing API
    lgb_result = next(r for r in results if r["model"] == "LightGBM")
    lgb_result["trained_at"]      = timestamp
    lgb_result["feature_columns"] = get_feature_columns()
    with open(os.path.join(MODEL_DIR, "model_metrics.json"), "w") as f:
        json.dump(lgb_result, f, indent=2)

    return comparison


def print_comparison_table(results):
    print("\n")
    print("=" * 65)
    print(f"  {'MODEL':<28} {'MAE':>8} {'RMSE':>8} {'R²':>8} {'MAPE':>8}")
    print("=" * 65)
    sorted_results = sorted(results, key=lambda x: x["R2"], reverse=True)
    for r in sorted_results:
        print(
            f"  {r['model']:<28} "
            f"£{r['MAE']:>6.2f}  "
            f"£{r['RMSE']:>6.2f}  "
            f"{r['R2']:>6.4f}  "
            f"{r['MAPE']:>6.2f}%"
        )
    print("=" * 65)
    best = sorted_results[0]
    print(f"\n  Best model: {best['model']} (R² = {best['R2']})")
    print("=" * 65)


def main():
    # 1. Load and engineer
    df = load_training_data()
    df = engineer_features(df)

    # 2. Neighbourhood encoder
    neighbourhood_encoder = {
        name: code
        for code, name in enumerate(
            pd.Categorical(
                df['neighbourhood_cleansed'].fillna('Unknown')
            ).categories
        )
    }

    # 3. Prepare
    X, y = prepare_dataset(df)

    # 4. Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\nTrain: {len(X_train):,}  |  Test: {len(X_test):,}")

    # 5. Train all models
    models, results = train_all(X_train, y_train, X_test, y_test)

    # 6. Print comparison table
    print_comparison_table(results)

    # 7. Save everything
    comparison = save_all(models, results, neighbourhood_encoder)
    comparison["test_rows"] = len(X_test)

    print("\nAll models trained and saved.")


if __name__ == "__main__":
    main()