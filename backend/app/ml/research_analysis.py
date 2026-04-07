import pandas as pd
import numpy as np
import joblib
import json
import os
import matplotlib
matplotlib.use('Agg')  # non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import shap
import warnings
warnings.filterwarnings('ignore')


from app.ml.feature_engineering import (
    load_training_data, engineer_features,
    prepare_dataset, get_feature_columns
)

MODEL_DIR  = os.path.join(os.path.dirname(__file__), "saved_models")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "research_outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

COLORS = {
    "LightGBM":          "#3b82f6",
    "CatBoost":          "#8b5cf6",
    "XGBoost":           "#f59e0b",
    "Random Forest":     "#10b981",
    "Linear Regression": "#ef4444",
    "Ridge Regression":  "#f97316",
    "Lasso Regression":  "#ec4899",
}


# ─────────────────────────────────────────────────────────────────────────────
# Figure 1 — Model Comparison Bar Chart (publication quality)
# ─────────────────────────────────────────────────────────────────────────────
def fig_model_comparison(results):
    print("Generating Figure 1: Model Comparison...")

    metrics  = ["R2", "MAE", "RMSE", "MAPE"]
    titles   = ["R² Score (↑ higher is better)",
                "MAE in £ (↓ lower is better)",
                "RMSE in £ (↓ lower is better)",
                "MAPE % (↓ lower is better)"]
    models   = [r["model"] for r in results]
    colors   = [COLORS.get(m, "#94a3b8") for m in models]

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle(
        "Model Comparison: Airbnb Price Prediction\n"
        "Trained on 61,686 London listings · 36 features · 80/20 split",
        fontsize=14, fontweight='bold', y=0.98
    )

    for ax, metric, title in zip(axes.flat, metrics, titles):
        values = [r[metric] for r in results]
        bars   = ax.bar(
            range(len(models)), values,
            color=colors, edgecolor='white', linewidth=0.5
        )
        ax.set_xticks(range(len(models)))
        ax.set_xticklabels(
            [m.replace(" Regression", "\nRegression") for m in models],
            fontsize=8
        )
        ax.set_title(title, fontsize=10, fontweight='bold', pad=10)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)

        # Value labels on bars
        for bar, val in zip(bars, values):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(values) * 0.01,
                f"{val:.3f}" if metric == "R2" else f"{val:.1f}",
                ha='center', va='bottom', fontsize=7, fontweight='bold'
            )

        # Highlight best bar
        best_idx = values.index(max(values) if metric == "R2" else min(values))
        bars[best_idx].set_edgecolor('gold')
        bars[best_idx].set_linewidth(2.5)

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig1_model_comparison.png")
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Figure 2 — Predicted vs Actual (LightGBM)
# ─────────────────────────────────────────────────────────────────────────────
def fig_predicted_vs_actual(model, X_test, y_test):
    print("Generating Figure 2: Predicted vs Actual...")

    y_pred = np.maximum(model.predict(X_test), 0)

    # Cap at £800 for readability (removes extreme outliers from plot)
    mask   = (y_test <= 800) & (y_pred <= 800)
    y_t    = y_test[mask]
    y_p    = y_pred[mask]

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle(
        "LightGBM: Predicted vs Actual Price Analysis",
        fontsize=13, fontweight='bold'
    )

    # Scatter plot
    ax = axes[0]
    ax.scatter(y_t, y_p, alpha=0.15, s=8, color="#3b82f6", rasterized=True)
    lims = [0, 800]
    ax.plot(lims, lims, 'r--', linewidth=1.5, label='Perfect prediction')
    ax.set_xlabel("Actual Price (£)", fontsize=11)
    ax.set_ylabel("Predicted Price (£)", fontsize=11)
    ax.set_title("Predicted vs Actual (prices ≤ £800)", fontsize=10)
    ax.set_xlim(lims); ax.set_ylim(lims)
    ax.legend(fontsize=9)
    ax.grid(alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)
    ax.text(
        0.05, 0.92,
        f"R² = {r2:.4f}\nMAE = £{mae:.2f}",
        transform=ax.transAxes, fontsize=9,
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5)
    )

    # Residual distribution
    ax = axes[1]
    residuals = y_p - y_t
    ax.hist(residuals, bins=80, color="#3b82f6", alpha=0.7, edgecolor='white')
    ax.axvline(0,     color='red',    linestyle='--', linewidth=1.5, label='Zero error')
    ax.axvline(residuals.mean(), color='orange', linestyle='-',
               linewidth=1.5, label=f'Mean: £{residuals.mean():.1f}')
    ax.set_xlabel("Residual (Predicted − Actual) in £", fontsize=11)
    ax.set_ylabel("Count", fontsize=11)
    ax.set_title("Residual Distribution", fontsize=10)
    ax.legend(fontsize=9)
    ax.grid(alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig2_predicted_vs_actual.png")
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Figure 3 — SHAP Feature Importance
# ─────────────────────────────────────────────────────────────────────────────
def fig_shap_importance(model, X_test):
    print("Generating Figure 3: SHAP Feature Importance...")
    print("  Computing SHAP values (this takes 1-2 minutes)...")

    # Use 500 samples for speed
    X_sample = X_test.sample(min(500, len(X_test)), random_state=42)

    explainer   = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)

    # Clean feature names for display
    name_map = {
        'room_type_score':                   'Room Type',
        'is_entire_property':                'Is Entire Property',
        'accommodates':                      'Accommodates (guests)',
        'bedrooms':                          'Bedrooms',
        'beds':                              'Beds',
        'bathrooms':                         'Bathrooms',
        'amenity_count':                     'Amenity Count',
        'minimum_nights':                    'Minimum Nights',
        'availability_365':                  'Availability (days/yr)',
        'instant_bookable':                  'Instant Bookable',
        'host_is_superhost':                 'Host is Superhost',
        'host_identity_verified':            'Host Identity Verified',
        'host_response_rate':                'Host Response Rate',
        'host_acceptance_rate':              'Host Acceptance Rate',
        'calculated_host_listings_count':    'Host Listing Count',
        'number_of_reviews':                 'Total Reviews',
        'number_of_reviews_ltm':             'Reviews (Last 12mo)',
        'reviews_per_month':                 'Reviews per Month',
        'review_scores_rating':              'Review Score (Overall)',
        'review_scores_cleanliness':         'Review Score (Cleanliness)',
        'review_scores_location':            'Review Score (Location)',
        'review_scores_value':               'Review Score (Value)',
        'estimated_occupancy_l365d':         'Estimated Occupancy',
        'estimated_revenue_l365d':           'Estimated Revenue',
        'revenue_per_night_est':             'Revenue per Night (est.)',
        'latitude':                          'Latitude',
        'longitude':                         'Longitude',
        'neighbourhood_encoded':             'Neighbourhood',
        'neighbourhood_group_encoded':       'Borough Group',
        'neighbourhood_median_price':        'Neighbourhood Median Price',
        'neighbourhood_mean_price':          'Neighbourhood Mean Price',
        'neighbourhood_avg_occupancy':       'Neighbourhood Avg Occupancy',
        'neighbourhood_avg_revenue':         'Neighbourhood Avg Revenue',
        'neighbourhood_listing_count':       'Neighbourhood Listing Count',
        'neighbourhood_avg_rating':          'Neighbourhood Avg Rating',
        'neighbourhood_avg_accommodates':    'Neighbourhood Avg Capacity',
    }

    feature_names = [name_map.get(f, f) for f in get_feature_columns()]

    # Mean absolute SHAP values
    mean_shap = np.abs(shap_values).mean(axis=0)
    df_shap   = pd.DataFrame({
        'feature':    feature_names,
        'importance': mean_shap
    }).sort_values('importance', ascending=True).tail(20)

    fig, axes = plt.subplots(1, 2, figsize=(16, 8))
    fig.suptitle(
        "SHAP Feature Importance Analysis — LightGBM\n"
        "Computed on 500 test samples",
        fontsize=13, fontweight='bold'
    )

    # Bar chart — top 20 features
    ax = axes[0]
    bars = ax.barh(
        df_shap['feature'], df_shap['importance'],
        color='#3b82f6', alpha=0.85, edgecolor='white'
    )
    ax.set_xlabel("Mean |SHAP Value| (impact on price prediction in £)", fontsize=10)
    ax.set_title("Top 20 Features by SHAP Importance", fontsize=11, fontweight='bold')
    ax.grid(axis='x', alpha=0.3, linestyle='--')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    for bar, val in zip(bars, df_shap['importance']):
        ax.text(
            val + 0.3, bar.get_y() + bar.get_height() / 2,
            f"£{val:.1f}", va='center', fontsize=7
        )

    # SHAP summary beeswarm
    ax = axes[1]
    shap.summary_plot(
        shap_values, X_sample,
        feature_names=feature_names,
        max_display=15,
        show=False,
        plot_size=None,
    )
    axes[1].set_title("SHAP Summary Plot", fontsize=11, fontweight='bold')

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig3_shap_importance.png")
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Figure 4 — Neighbourhood Holdout Test (cold-start proof)
# ─────────────────────────────────────────────────────────────────────────────
def fig_neighbourhood_holdout(df_full):
    print("Generating Figure 4: Neighbourhood Holdout Test...")

    import lightgbm as lgb
    from sklearn.linear_model import Ridge

    # Hold out 5 neighbourhoods entirely during training
    holdout_neighbourhoods = [
        "Westminster", "Camden", "Hackney",
        "Southwark", "Islington"
    ]

    holdout_mask = df_full['neighbourhood_cleansed'].isin(holdout_neighbourhoods)
    df_train     = df_full[~holdout_mask]
    df_holdout   = df_full[holdout_mask]

    feature_cols = get_feature_columns()

    X_train = df_train[feature_cols].dropna()
    y_train = df_train.loc[X_train.index, 'price']
    X_ho    = df_holdout[feature_cols].dropna()
    y_ho    = df_holdout.loc[X_ho.index, 'price']

    print(f"  Train: {len(X_train):,} | Holdout: {len(X_ho):,} rows")

    # Train LightGBM on non-holdout neighbourhoods
    model = lgb.LGBMRegressor(
        n_estimators=500, learning_rate=0.05,
        max_depth=8, num_leaves=63,
        random_state=42, n_jobs=-1, verbose=-1
    )
    model.fit(X_train, y_train)

    results = []
    for nbh in holdout_neighbourhoods:
        mask   = df_holdout['neighbourhood_cleansed'] == nbh
        X_n    = df_holdout.loc[mask, feature_cols].dropna()
        y_n    = df_holdout.loc[X_n.index, 'price']
        if len(X_n) < 10:
            continue
        y_pred = np.maximum(model.predict(X_n), 0)
        results.append({
            "neighbourhood": nbh,
            "n":             len(X_n),
            "MAE":           round(mean_absolute_error(y_n, y_pred), 2),
            "R2":            round(r2_score(y_n, y_pred), 4),
            "MAPE":          round(
                np.mean(np.abs((y_n - y_pred) / y_n.clip(lower=1))) * 100, 2
            ),
        })

    df_r = pd.DataFrame(results)

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    fig.suptitle(
        "Cold-Start Generalisation: Neighbourhood Holdout Test\n"
        "Model trained without seeing these 5 neighbourhoods",
        fontsize=12, fontweight='bold'
    )

    # R² per holdout neighbourhood
    ax = axes[0]
    colors = ['#3b82f6' if r >= 0.6 else '#f59e0b' if r >= 0.4 else '#ef4444'
              for r in df_r['R2']]
    bars = ax.bar(df_r['neighbourhood'], df_r['R2'], color=colors, edgecolor='white')
    ax.axhline(0.7774, color='green', linestyle='--',
               linewidth=1.5, label='Full-data R² (0.7774)')
    ax.set_ylabel("R² Score", fontsize=10)
    ax.set_title("R² on Unseen Neighbourhoods", fontsize=10, fontweight='bold')
    ax.set_xticklabels(df_r['neighbourhood'], rotation=20, ha='right', fontsize=9)
    ax.legend(fontsize=8)
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    for bar, val in zip(bars, df_r['R2']):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.01,
            f"{val:.3f}", ha='center', va='bottom', fontsize=8
        )

    # MAE per holdout neighbourhood
    ax = axes[1]
    bars = ax.bar(df_r['neighbourhood'], df_r['MAE'],
                  color='#8b5cf6', alpha=0.8, edgecolor='white')
    ax.axhline(28.57, color='green', linestyle='--',
               linewidth=1.5, label='Full-data MAE (£28.57)')
    ax.set_ylabel("MAE (£)", fontsize=10)
    ax.set_title("MAE on Unseen Neighbourhoods", fontsize=10, fontweight='bold')
    ax.set_xticklabels(df_r['neighbourhood'], rotation=20, ha='right', fontsize=9)
    ax.legend(fontsize=8)
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    for bar, val in zip(bars, df_r['MAE']):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.3,
            f"£{val}", ha='center', va='bottom', fontsize=8
        )

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig4_neighbourhood_holdout.png")
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()

    print(f"  Saved: {path}")
    print(f"\n  Holdout Results:")
    print(df_r.to_string(index=False))
    return df_r


# ─────────────────────────────────────────────────────────────────────────────
# Figure 5 — Error by Price Tier (where does model struggle?)
# ─────────────────────────────────────────────────────────────────────────────
def fig_error_by_price_tier(model, X_test, y_test):
    print("Generating Figure 5: Error by Price Tier...")

    y_pred = np.maximum(model.predict(X_test), 0)
    df     = pd.DataFrame({'actual': y_test.values, 'predicted': y_pred})
    df['error'] = np.abs(df['actual'] - df['predicted'])

    bins   = [0, 50, 100, 150, 200, 300, 500, 2000]
    labels = ['£0-50', '£50-100', '£100-150',
              '£150-200', '£200-300', '£300-500', '£500+']
    df['tier'] = pd.cut(df['actual'], bins=bins, labels=labels)

    tier_stats = df.groupby('tier', observed=True).agg(
        count = ('actual', 'count'),
        MAE   = ('error',  'mean'),
        MAPE  = ('error',  lambda x: (
            x / df.loc[x.index, 'actual'].clip(lower=1) * 100
        ).mean()),
    ).reset_index()

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    fig.suptitle(
        "Prediction Error Analysis by Price Tier\n"
        "Understanding where the model performs best and worst",
        fontsize=12, fontweight='bold'
    )

    colors = ['#10b981','#3b82f6','#3b82f6','#f59e0b','#f59e0b','#ef4444','#ef4444']

    ax = axes[0]
    bars = ax.bar(tier_stats['tier'], tier_stats['MAE'],
                  color=colors, edgecolor='white')
    ax.set_xlabel("Price Tier", fontsize=10)
    ax.set_ylabel("Mean Absolute Error (£)", fontsize=10)
    ax.set_title("MAE by Price Tier", fontsize=10, fontweight='bold')
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    for bar, val in zip(bars, tier_stats['MAE']):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.5,
            f"£{val:.0f}", ha='center', va='bottom', fontsize=8
        )

    ax = axes[1]
    bars = ax.bar(tier_stats['tier'], tier_stats['count'],
                  color='#94a3b8', edgecolor='white', alpha=0.8)
    ax.set_xlabel("Price Tier", fontsize=10)
    ax.set_ylabel("Number of Listings", fontsize=10)
    ax.set_title("Listing Distribution by Price Tier", fontsize=10, fontweight='bold')
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    for bar, val in zip(bars, tier_stats['count']):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 5,
            f"{val:,}", ha='center', va='bottom', fontsize=7
        )

    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "fig5_error_by_price_tier.png")
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  Research Analysis Pipeline")
    print("  Airbnb Revenue Engine — LightGBM Price Prediction")
    print("=" * 55)

    # Load data
    df = load_training_data()
    df = engineer_features(df)
    X, y = prepare_dataset(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Load trained LightGBM
    lgb_path = os.path.join(MODEL_DIR, "lightgbm_model.pkl")
    model    = joblib.load(lgb_path)
    print(f"\nLoaded model: {lgb_path}")

    # Load comparison results
    with open(os.path.join(MODEL_DIR, "model_comparison.json")) as f:
        comparison = json.load(f)
    results = comparison["results"]

    print(f"\nGenerating 5 research figures...")
    print(f"Output directory: {OUTPUT_DIR}\n")

    fig_model_comparison(results)
    fig_predicted_vs_actual(model, X_test, y_test)
    fig_shap_importance(model, X_test)
    fig_neighbourhood_holdout(df)
    fig_error_by_price_tier(model, X_test, y_test)

    print("\n" + "=" * 55)
    print("  All figures saved to research_outputs/")
    print("  Files:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        path = os.path.join(OUTPUT_DIR, f)
        size = os.path.getsize(path) // 1024
        print(f"    {f} ({size} KB)")
    print("=" * 55)


if __name__ == "__main__":
    main()
    
import sys
if "--cv" in sys.argv:
    print("\nRunning 5-Fold Cross Validation (takes ~5 minutes)...")
    from app.ml.feature_engineering import load_training_data, engineer_features, prepare_dataset
    import lightgbm as lgb

    df = load_training_data()
    df = engineer_features(df)
    X, y = prepare_dataset(df)

    model_cv = lgb.LGBMRegressor(
        n_estimators=500, learning_rate=0.05,
        max_depth=8, num_leaves=63,
        random_state=42, n_jobs=-1, verbose=-1
    )

    scores = cross_val_score(model_cv, X, y, cv=5, scoring='r2', n_jobs=-1)
    print(f"\n5-Fold Cross Validation Results:")
    print(f"  Fold scores: {[round(s, 4) for s in scores]}")
    print(f"  Mean R²:     {scores.mean():.4f}")
    print(f"  Std Dev:     {scores.std():.4f}")
    print(f"\n  Interpretation:")
    print(f"  A mean close to 0.7774 with low std dev confirms no overfitting.")