import { useState, useEffect } from "react";
import {
  BarChart2,
  Percent,
  PoundSterling,
  Building2,
  Loader2,
  AlertCircle,
  ChevronDown,
  Info,
} from "lucide-react";
import MetricCard from "../components/dashboard/MetricCard";
import RevPARChart from "../components/market/RevPARChart";
import SurgeHeatmap from '../components/market/SurgeHeatmap';
import RevPAROptimizer from "../components/market/RevPAROptimizer";
import {
  getNeighborhoods,
  getRevPARSummary,
  getRevPARTrend,
  getRevPAROptimization,
} from "../services/api";

const RevPARDashboard = () => {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selected, setSelected]           = useState("");
  const [summary, setSummary]             = useState(null);
  const [trend, setTrend]                 = useState(null);
  const [recommendation, setRec]         = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  // Load neighborhoods once on mount
  useEffect(() => {
    getNeighborhoods()
      .then((d) => {
        setNeighborhoods(d.neighborhoods || []);
        if (d.neighborhoods?.length) setSelected(d.neighborhoods[0]);
      })
      .catch(() => setError("Could not load neighborhoods. Is the API running?"));
  }, []);

  // Fetch all 3 endpoints in parallel when neighborhood changes
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setSummary(null);
    setTrend(null);
    setRec(null);

    Promise.all([
      getRevPARSummary(selected),
      getRevPARTrend(selected),
      getRevPAROptimization(selected),
    ])
      .then(([s, t, rec]) => {
        setSummary(s);
        setTrend(t);
        setRec(rec);
      })
      .catch((e) => setError(e.message || "Failed to fetch RevPAR data."))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart2 className="text-brand" size={32} />
          Market Intel
        </h1>
        <p className="text-gray-500 mt-2">
          RevPAR & Occupancy — the metrics serious hosts and investors track.
        </p>
      </div>

      {/* ── Neighborhood Selector ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
          Neighborhood
        </label>
        <div className="relative">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm min-w-56"
          >
            {neighborhoods.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        {/* Data source badge — shown after data loads */}
        {summary && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Info size={13} />
            {summary.data_source === "calendar"
              ? "📡 Live — 35M calendar rows"
              : "📊 Estimated — reviews proxy"}
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-medium">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
          <Loader2 size={26} className="animate-spin" />
          <span className="font-medium">Crunching market data…</span>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────────── */}
      {!loading && summary && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

          {/* KPI Cards — reusing MetricCard from dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={PoundSterling}
              label="RevPAR"
              value={summary.revpar.toFixed(2)}
              prefix="£"
              trend="neutral"
              trendValue="Revenue per available night"
              color="brand"
            />
            <MetricCard
              icon={Percent}
              label="Occupancy Rate"
              value={`${summary.occupancy_rate.toFixed(1)}`}
              suffix="%"
              trend={summary.occupancy_rate >= 75 ? "up" : summary.occupancy_rate >= 60 ? "neutral" : "down"}
              trendValue="Avg nights booked"
              color="purple"
            />
            <MetricCard
              icon={PoundSterling}
              label="Avg Nightly Rate"
              value={summary.avg_nightly_rate.toFixed(2)}
              prefix="£"
              trend="neutral"
              trendValue="Average Daily Rate (ADR)"
              color="blue"
            />
            <MetricCard
              icon={Building2}
              label="Listings Analysed"
              value={summary.total_listings.toLocaleString()}
              trend="neutral"
              trendValue={selected}
              color="green"
            />
          </div>

          {/* AI Optimizer */}
          <RevPAROptimizer data={recommendation} />

          {/* Trend Chart */}
          <RevPARChart trend={trend?.trend} />

          {/* Surge Heatmap */}
          <SurgeHeatmap neighborhood={selected} />

        </div>
      )}
    </div>
  );
};

export default RevPARDashboard;
