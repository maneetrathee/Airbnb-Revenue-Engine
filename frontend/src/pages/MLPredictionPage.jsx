import { useState, useEffect } from "react";
import {
  Brain,
  TrendingUp,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const API = "http://127.0.0.1:8000/api/v1/ml";

const ROOM_TYPES = [
  "Entire home/apt",
  "Private room",
  "Hotel room",
  "Shared room",
];

export default function MLPredictionPage() {
  const [neighbourhoods, setNeighbourhoods] = useState([]);
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    neighbourhood: "Westminster",
    room_type: "Entire home/apt",
    accommodates: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    amenity_count: 25,
    minimum_nights: 2,
    availability_365: 180,
    number_of_reviews: 30,
    number_of_reviews_ltm: 10,
    reviews_per_month: 1.5,
    review_scores_rating: 4.7,
    review_scores_cleanliness: 4.8,
    review_scores_location: 4.9,
    review_scores_value: 4.6,
    estimated_occupancy_l365d: 65,
    estimated_revenue_l365d: 15000,
    host_is_superhost: false,
    host_identity_verified: true,
    host_response_rate: 95,
    host_acceptance_rate: 85,
    calculated_host_listings_count: 1,
    instant_bookable: false,
    latitude: 51.4994,
    longitude: -0.1248,
    neighbourhood_median_price: 150,
    neighbourhood_mean_price: 175,
    neighbourhood_avg_occupancy: 65,
    neighbourhood_avg_revenue: 18000,
    neighbourhood_listing_count: 1200,
    neighbourhood_avg_rating: 4.6,
    neighbourhood_avg_accommodates: 3.2,
  });

  useEffect(() => {
    fetch(`${API}/neighbourhoods`)
      .then((r) => r.json())
      .then((d) => setNeighbourhoods(d.neighbourhoods || []));

    fetch(`${API}/status`)
      .then((r) => r.json())
      .then(setModelStatus);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const predict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Prediction failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="text-blue-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ML Price Prediction
          </h1>
          <p className="text-sm text-gray-500">
            LightGBM model trained on 61,686 London listings
          </p>
        </div>
      </div>

      {/* Model Stats Banner */}
      {modelStatus?.status === "ready" && (
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "R² Score",
              value: modelStatus.r2_score,
              suffix: "",
              color: "text-green-600",
            },
            {
              label: "MAE",
              value: `£${modelStatus.mae}`,
              suffix: "",
              color: "text-blue-600",
            },
            {
              label: "RMSE",
              value: `£${modelStatus.rmse}`,
              suffix: "",
              color: "text-purple-600",
            },
            {
              label: "MAPE",
              value: `${modelStatus.mape}%`,
              suffix: "",
              color: "text-orange-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border p-4 text-center"
            >
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Form */}
        <div className="col-span-2 bg-white rounded-xl border p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Property Details</h2>

          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">
                Neighbourhood
              </label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.neighbourhood}
                onChange={(e) => set("neighbourhood", e.target.value)}
              >
                {neighbourhoods.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Room Type
              </label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.room_type}
                onChange={(e) => set("room_type", e.target.value)}
              >
                {ROOM_TYPES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 — Size */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Accommodates", key: "accommodates", min: 1, max: 16 },
              { label: "Bedrooms", key: "bedrooms", min: 0, max: 10 },
              { label: "Beds", key: "beds", min: 1, max: 16 },
              { label: "Bathrooms", key: "bathrooms", min: 1, max: 8 },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-600">
                  {f.label}
                </label>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Row 3 — Reviews */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Reviews", key: "number_of_reviews", step: 1 },
              {
                label: "Reviews (12mo)",
                key: "number_of_reviews_ltm",
                step: 1,
              },
              { label: "Reviews/Month", key: "reviews_per_month", step: 0.1 },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-600">
                  {f.label}
                </label>
                <input
                  type="number"
                  step={f.step}
                  min={0}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Row 4 — Review Scores */}
          <div>
            <label className="text-xs font-medium text-gray-600">
              Review Scores
            </label>
            <div className="grid grid-cols-4 gap-4 mt-1">
              {[
                { label: "Overall", key: "review_scores_rating" },
                { label: "Cleanliness", key: "review_scores_cleanliness" },
                { label: "Location", key: "review_scores_location" },
                { label: "Value", key: "review_scores_value" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500">{f.label}</label>
                  <input
                    type="number"
                    step={0.1}
                    min={1}
                    max={5}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={form[f.key]}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Row 5 — Host & Booking */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">
                Response Rate %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.host_response_rate}
                onChange={(e) =>
                  set("host_response_rate", Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Acceptance Rate %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.host_acceptance_rate}
                onChange={(e) =>
                  set("host_acceptance_rate", Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Amenity Count
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.amenity_count}
                onChange={(e) => set("amenity_count", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Row 6 — Toggles */}
          <div className="flex gap-6">
            {[
              { label: "Superhost", key: "host_is_superhost" },
              { label: "Identity Verified", key: "host_identity_verified" },
              { label: "Instant Bookable", key: "instant_bookable" },
            ].map((f) => (
              <label
                key={f.key}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form[f.key]}
                  onChange={(e) => set(f.key, e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">{f.label}</span>
              </label>
            ))}
          </div>

          {/* Row 7 — Market signals */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-600">
                Neighbourhood Market Signals
              </span>
              <span className="text-xs text-gray-400">
                (auto-filled for known neighbourhoods)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Median Price £", key: "neighbourhood_median_price" },
                { label: "Mean Price £", key: "neighbourhood_mean_price" },
                {
                  label: "Avg Occupancy %",
                  key: "neighbourhood_avg_occupancy",
                },
                { label: "Avg Revenue £", key: "neighbourhood_avg_revenue" },
                { label: "Listing Count", key: "neighbourhood_listing_count" },
                { label: "Avg Rating", key: "neighbourhood_avg_rating" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500">{f.label}</label>
                  <input
                    type="number"
                    step={0.1}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"
                    value={form[f.key]}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Predict Button */}
          <button
            onClick={predict}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Predicting..." : "Predict Price with ML Model"}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Result Panel */}
        <div className="space-y-4">
          {/* Prediction Result */}
          {result ? (
            <div className="bg-blue-600 rounded-xl p-6 text-white text-center">
              <div className="text-sm opacity-80 mb-1">
                Predicted Nightly Price
              </div>
              <div className="text-5xl font-bold mb-1">
                £{result.predicted_price}
              </div>
              <div className="text-sm opacity-70">
                {result.neighbourhood} · {result.room_type}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-green-300 text-sm">
                <CheckCircle size={14} />
                Model R² {result.model_r2} · MAE £{result.model_mae}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center border-2 border-dashed border-gray-200">
              <Brain size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">
                Fill in the property details and click predict
              </p>
            </div>
          )}

          {/* Model Info */}
          {modelStatus?.status === "ready" && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Info size={14} />
                Model Information
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Algorithm</span>
                  <span className="font-medium">LightGBM</span>
                </div>
                <div className="flex justify-between">
                  <span>Training samples</span>
                  <span className="font-medium">49,348</span>
                </div>
                <div className="flex justify-between">
                  <span>Test samples</span>
                  <span className="font-medium">
                    {modelStatus.test_rows?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Features</span>
                  <span className="font-medium">
                    {modelStatus.features?.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Trained</span>
                  <span className="font-medium">
                    {modelStatus.trained_at
                      ? modelStatus.trained_at.slice(0, 4) +
                        "-" +
                        modelStatus.trained_at.slice(4, 6) +
                        "-" +
                        modelStatus.trained_at.slice(6, 8)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="bg-white rounded-xl border p-4 space-y-2">
            <div className="text-sm font-medium text-gray-700">
              How it works
            </div>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Trained on 61,686 London Airbnb listings</li>
              <li>• 36 features: size, location, reviews, host quality</li>
              <li>• Works for brand new listings with no history</li>
              <li>• Neighbourhood signals enable cold-start prediction</li>
              <li>• R² of 0.7774 — explains 78% of price variance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
