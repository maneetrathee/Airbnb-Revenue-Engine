import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Trophy, Brain, TrendingUp, Target } from "lucide-react";

const API = import.meta.env.VITE_API_URL + "/api/v1/ml";

const MODEL_COLORS = {
  LightGBM: "#3b82f6",
  CatBoost: "#8b5cf6",
  XGBoost: "#f59e0b",
  "Random Forest": "#10b981",
  "Ridge Regression": "#f97316",
  "Linear Regression": "#ef4444",
  "Lasso Regression": "#ec4899",
};

const MEDALS = ["🥇", "🥈", "🥉", "", "", "", ""];

export default function MLComparisonPage() {
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState("R2");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/comparison`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading model comparison...
      </div>
    );

  if (!data)
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Could not load comparison data. Make sure models are trained.
      </div>
    );

  const results = [...data.results].sort((a, b) => b.R2 - a.R2);
  const best = results[0];

  // Chart data — sort by selected metric
  const chartData = [...data.results]
    .sort((a, b) => {
      if (metric === "R2") return b.R2 - a.R2;
      return a[metric] - b[metric]; // lower is better for MAE/RMSE/MAPE
    })
    .map((r) => ({
      name: r.model.replace(" Regression", "\nRegression"),
      value: r[metric],
      full: r.model,
    }));

  const metricConfig = {
    R2: {
      label: "R² Score",
      format: (v) => v.toFixed(4),
      higher: true,
      color: "#3b82f6",
    },
    MAE: {
      label: "MAE (£)",
      format: (v) => `£${v}`,
      higher: false,
      color: "#10b981",
    },
    RMSE: {
      label: "RMSE (£)",
      format: (v) => `£${v}`,
      higher: false,
      color: "#8b5cf6",
    },
    MAPE: {
      label: "MAPE (%)",
      format: (v) => `${v}%`,
      higher: false,
      color: "#f59e0b",
    },
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="text-yellow-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Comparison</h1>
          <p className="text-sm text-gray-500">
            7 models trained on 61,686 London Airbnb listings · 36 features
          </p>
        </div>
      </div>

      {/* Winner Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🏆</div>
          <div>
            <div className="text-sm opacity-80">Best Performing Model</div>
            <div className="text-2xl font-bold">{best.model}</div>
            <div className="text-sm opacity-70 mt-0.5">
              Deployed in production · Trained {data.trained_at?.slice(0, 4)}-
              {data.trained_at?.slice(4, 6)}-{data.trained_at?.slice(6, 8)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6 text-center">
          {[
            { label: "R²", value: best.R2 },
            { label: "MAE", value: `£${best.MAE}` },
            { label: "RMSE", value: `£${best.RMSE}` },
            { label: "MAPE", value: `${best.MAPE}%` },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs opacity-70">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart size={16} className="text-blue-500" />
              Performance by Metric
            </h2>
            <div className="flex gap-1">
              {Object.keys(metricConfig).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    metric === m
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {metricConfig[metric].higher
              ? "↑ Higher is better"
              : "↓ Lower is better"}
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="full"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [
                  metricConfig[metric].format(v),
                  metricConfig[metric].label,
                ]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.full}
                    fill={MODEL_COLORS[entry.full] || "#94a3b8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Findings */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
              <Brain size={14} className="text-blue-500" />
              Key Findings
            </div>
            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold mt-0.5">→</span>
                <span>
                  Gradient boosting models (LightGBM, CatBoost, XGBoost)
                  converge to equivalent accuracy — all within £0.6 MAE and
                  0.0013 R² of each other
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 font-bold mt-0.5">→</span>
                <span>
                  Random Forest trails the boosters by ~0.03 R² — ensemble
                  bagging underperforms sequential boosting on this dataset
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-bold mt-0.5">→</span>
                <span>
                  Linear models plateau at R² ~0.52, confirming strong
                  non-linear price relationships in London's short-let market
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-500 font-bold mt-0.5">→</span>
                <span>
                  The R² gap between linear (0.52) and tree models (0.78) — a
                  50% improvement — justifies the deployment of LightGBM
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
              <Target size={14} className="text-green-500" />
              Why LightGBM was Deployed
            </div>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>• Highest R² (0.7774) among all 7 models</li>
              <li>• 3–5x faster training than XGBoost on large datasets</li>
              <li>• Lower memory footprint — critical for shared server</li>
              <li>• Sub-millisecond inference for live API predictions</li>
              <li>• Native early stopping prevents overfitting</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
              <TrendingUp size={14} className="text-purple-500" />
              Dataset
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              {[
                { label: "Total listings", value: "96,871" },
                { label: "After filtering", value: "61,686" },
                { label: "Training set", value: "49,348" },
                { label: "Test set", value: "12,338" },
                {
                  label: "Features",
                  value: data.feature_columns?.length || 36,
                },
                { label: "Neighbourhoods", value: "33" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex justify-between bg-gray-50 rounded px-2 py-1"
                >
                  <span>{s.label}</span>
                  <span className="font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Results Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Full Results Table</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sorted by R² score descending
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Rank</th>
              <th className="px-5 py-3 text-left">Model</th>
              <th className="px-5 py-3 text-right">MAE</th>
              <th className="px-5 py-3 text-right">RMSE</th>
              <th className="px-5 py-3 text-right">R²</th>
              <th className="px-5 py-3 text-right">MAPE</th>
              <th className="px-5 py-3 text-center">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((r, i) => (
              <tr
                key={r.model}
                className={i === 0 ? "bg-blue-50" : "hover:bg-gray-50"}
              >
                <td className="px-5 py-3 text-lg">{MEDALS[i] || i + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: MODEL_COLORS[r.model] || "#94a3b8",
                      }}
                    />
                    <span
                      className={`font-medium ${i === 0 ? "text-blue-700" : "text-gray-800"}`}
                    >
                      {r.model}
                    </span>
                    {i === 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Deployed
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700">
                  £{r.MAE}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700">
                  £{r.RMSE}
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={`font-mono font-semibold ${
                      r.R2 >= 0.75
                        ? "text-green-600"
                        : r.R2 >= 0.6
                          ? "text-yellow-600"
                          : "text-red-500"
                    }`}
                  >
                    {r.R2}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700">
                  {r.MAPE}%
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      ["LightGBM", "XGBoost", "CatBoost"].includes(r.model)
                        ? "bg-blue-100 text-blue-700"
                        : r.model === "Random Forest"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {["LightGBM", "XGBoost", "CatBoost"].includes(r.model)
                      ? "Gradient Boost"
                      : r.model === "Random Forest"
                        ? "Ensemble"
                        : "Linear"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
