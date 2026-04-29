import { useState, useEffect } from "react";
import {
  Sparkles,
  Brain,
  FileText,
  SlidersHorizontal,
  Loader2,
  RefreshCw,
  WifiOff,
  TrendingUp,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import KPIGrid from "../components/dashboard/KPIGrid";
import Forecast from "../components/dashboard/Forecast";
import CompetitorList from "../components/dashboard/CompetitorList";
import CompetitorMap from "../components/dashboard/CompetitorMap";
import PropertyInput from "../components/dashboard/PropertyInput";

// ─── Shared style helpers ────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all";
const labelCls =
  "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

// ─── ML Structured Form ──────────────────────────────────────────────────────
const ROOM_TYPES = [
  "Entire home/apt",
  "Private room",
  "Hotel room",
  "Shared room",
];
const ML_API = import.meta.env.VITE_API_URL + "/api/v1/ml";

function MLForm() {
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
    fetch(`${ML_API}/neighbourhoods`)
      .then((r) => r.json())
      .then((d) => setNeighbourhoods(d.neighbourhoods || []))
      .catch(() => {});
    fetch(`${ML_API}/status`)
      .then((r) => r.json())
      .then(setModelStatus)
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const predict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${ML_API}/predict`, {
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

  const cardCls =
    "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm";

  return (
    <div className="space-y-6">
      {/* Model stats */}
      {modelStatus?.status === "ready" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "R² Score",
              value: modelStatus.r2_score,
              color: "text-green-500",
            },
            {
              label: "MAE",
              value: `£${modelStatus.mae}`,
              color: "text-blue-500",
            },
            {
              label: "RMSE",
              value: `£${modelStatus.rmse}`,
              color: "text-purple-500",
            },
            {
              label: "MAPE",
              value: `${modelStatus.mape}%`,
              color: "text-orange-500",
            },
          ].map((s) => (
            <div key={s.label} className={`${cardCls} text-center py-4`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form — 2/3 width on desktop */}
        <div className={`lg:col-span-2 ${cardCls} space-y-5`}>
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            Property Details
          </h2>

          {/* Neighbourhood + Room Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Neighbourhood</label>
              <select
                className={inputCls}
                value={form.neighbourhood}
                onChange={(e) => set("neighbourhood", e.target.value)}
              >
                {neighbourhoods.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Room Type</label>
              <select
                className={inputCls}
                value={form.room_type}
                onChange={(e) => set("room_type", e.target.value)}
              >
                {ROOM_TYPES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Accommodates", key: "accommodates", min: 1, max: 16 },
              { label: "Bedrooms", key: "bedrooms", min: 0, max: 10 },
              { label: "Beds", key: "beds", min: 1, max: 16 },
              { label: "Bathrooms", key: "bathrooms", min: 1, max: 8 },
            ].map((f) => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  className={inputCls}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Reviews */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <label className={labelCls}>{f.label}</label>
                <input
                  type="number"
                  step={f.step}
                  min={0}
                  className={inputCls}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Review Scores */}
          <div>
            <label className={labelCls}>Review Scores</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Overall", key: "review_scores_rating" },
                { label: "Cleanliness", key: "review_scores_cleanliness" },
                { label: "Location", key: "review_scores_location" },
                { label: "Value", key: "review_scores_value" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    {f.label}
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={1}
                    max={5}
                    className={inputCls}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Host */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Response Rate %", key: "host_response_rate" },
              { label: "Acceptance Rate %", key: "host_acceptance_rate" },
              { label: "Amenity Count", key: "amenity_count" },
            ].map((f) => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-5">
            {[
              { label: "Superhost", key: "host_is_superhost" },
              { label: "Identity Verified", key: "host_identity_verified" },
              { label: "Instant Bookable", key: "instant_bookable" },
            ].map((f) => (
              <label
                key={f.key}
                className="flex items-center gap-2 cursor-pointer"
              >
                <button
                  onClick={() => set(f.key, !form[f.key])}
                  className={`relative w-9 h-5 rounded-full transition-all ${form[f.key] ? "bg-brand" : "bg-gray-300 dark:bg-gray-700"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form[f.key] ? "left-4" : "left-0.5"}`}
                  />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {f.label}
                </span>
              </label>
            ))}
          </div>

          {/* Market signals */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Neighbourhood Market Signals
              </span>
              <span className="text-xs text-gray-400">
                (auto-filled for known areas)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    {f.label}
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    className={`${inputCls} bg-gray-50 dark:bg-gray-800/60`}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Predict button */}
          <button
            onClick={predict}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-brand/20"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Brain size={18} />
            )}
            {loading ? "Predicting..." : "Predict Price with ML Model"}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900">
              <AlertCircle size={15} />
              {error}
            </div>
          )}
        </div>

        {/* Result panel — 1/3 */}
        <div className="space-y-4">
          {result ? (
            <div className="bg-brand rounded-2xl p-6 text-white text-center shadow-xl shadow-brand/20">
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
                R² {result.model_r2} · MAE £{result.model_mae}
              </div>
            </div>
          ) : (
            <div
              className={`${cardCls} text-center py-10 border-2 border-dashed`}
            >
              <Brain
                size={32}
                className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
              />
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Fill in the form and click predict
              </p>
            </div>
          )}

          {modelStatus?.status === "ready" && (
            <div className={cardCls}>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Info size={14} /> Model Information
              </div>
              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                {[
                  ["Algorithm", "LightGBM"],
                  ["Training samples", "49,348"],
                  ["Test samples", modelStatus.test_rows?.toLocaleString()],
                  ["Features", modelStatus.features?.length],
                  [
                    "Trained",
                    modelStatus.trained_at
                      ? modelStatus.trained_at.slice(0, 4) +
                        "-" +
                        modelStatus.trained_at.slice(4, 6) +
                        "-" +
                        modelStatus.trained_at.slice(6, 8)
                      : "—",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={cardCls}>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How it works
            </div>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
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

// ─── Main Dashboard Page ─────────────────────────────────────────────────────

const PricingDashboard = () => {
  const [mode, setMode] = useState("describe"); // "describe" | "structured"
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handlePredict = async () => {
    if (!description) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        import.meta.env.VITE_API_URL +
          `/api/v1/predict-price?description=${encodeURIComponent(description)}`,
      );
      const data = await response.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError(
        "Failed to connect to the AI Engine. Is your local backend running?",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header + mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Sparkles className="text-brand" size={28} />
            AI Revenue Engine
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Dynamic pricing powered by Vector Search & Market Rules
          </p>
        </div>

        {/* Describe / Structured toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 self-start sm:self-auto shrink-0">
          {[
            { id: "describe", label: "Describe", icon: FileText },
            { id: "structured", label: "Structured", icon: SlidersHorizontal },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === id
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Input section */}
      {mode === "describe" ? (
        <>
          <PropertyInput
            value={description}
            onChange={setDescription}
            onSubmit={handlePredict}
            loading={loading}
          />

          {loading && (
            <div className="flex items-center justify-center gap-3 py-4 text-gray-500 dark:text-gray-400">
              <Loader2 size={18} className="animate-spin text-brand" />
              <span className="text-sm">Connecting to AI Engine...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center gap-2 text-red-500">
                <WifiOff size={16} />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button
                onClick={handlePredict}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <KPIGrid result={result} />
              <Forecast forecast={result.forecast} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CompetitorList listings={result.similar_listings} />
                <CompetitorMap listings={result.similar_listings} />
              </div>
            </div>
          )}
        </>
      ) : (
        <MLForm />
      )}
    </div>
  );
};

export default PricingDashboard;
