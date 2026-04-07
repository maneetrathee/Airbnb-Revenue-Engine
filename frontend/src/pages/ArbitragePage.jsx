import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, Building2, PoundSterling, Percent, Calculator,
  ChevronDown, Loader2, AlertCircle, Download, ArrowRight,
  CheckCircle, XCircle, AlertTriangle, Minus, Info
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL + "";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n) => n == null ? "—" : `£${Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
const fmtD = (n) => n == null ? "—" : `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtP = (n) => n == null ? "—" : `${n > 0 ? "+" : ""}${Number(n).toFixed(2)}%`;

const VERDICT_CONFIG = {
  "Strong Buy":        { icon: CheckCircle,    bg: "bg-emerald-50",  border: "border-emerald-300", text: "text-emerald-700", badge: "bg-emerald-500" },
  "Viable":            { icon: TrendingUp,      bg: "bg-amber-50",    border: "border-amber-300",   text: "text-amber-700",   badge: "bg-amber-500"   },
  "Marginal":          { icon: AlertTriangle,   bg: "bg-orange-50",   border: "border-orange-300",  text: "text-orange-700",  badge: "bg-orange-500"  },
  "Not Recommended":   { icon: XCircle,         bg: "bg-red-50",      border: "border-red-300",     text: "text-red-700",     badge: "bg-red-500"     },
};

const SCENARIO_STYLE = {
  pessimistic: { label: "Conservative",  color: "text-slate-600",   bar: "bg-slate-400",   ring: "ring-slate-300"  },
  base:        { label: "Base Case",     color: "text-brand",       bar: "bg-brand",       ring: "ring-rose-300"   },
  optimistic:  { label: "Optimistic",    color: "text-emerald-600", bar: "bg-emerald-500", ring: "ring-emerald-300"},
};

// ── Sub-components ────────────────────────────────────────────────────────────
const InputField = ({ label, icon: Icon, children, hint }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
      {Icon && <Icon size={12} />}{label}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const MetricRow = ({ label, value, highlight, sub }) => (
  <div className={`flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 ${highlight ? "font-bold" : ""}`}>
    <span className={`text-sm ${highlight ? "text-gray-900" : "text-gray-500"}`}>{label}</span>
    <div className="text-right">
      <span className={`text-sm font-bold ${highlight ? "text-gray-900" : "text-gray-700"}`}>{value}</span>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF(data, inputs) {
  const { base, scenarios, market, summary } = data;
  const vconf = VERDICT_CONFIG[base.verdict] || VERDICT_CONFIG["Marginal"];
  const verdictColor = base.verdict === "Strong Buy" ? "#16a34a"
    : base.verdict === "Viable" ? "#d97706"
    : base.verdict === "Marginal" ? "#ea580c" : "#dc2626";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 40px; color: #111827; font-size: 13px; }
  .page { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: #111827; padding: 32px 40px; }
  .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .logo-mark { width: 28px; height: 28px; background: #FF385C; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 14px; }
  .logo-text { color: white; font-weight: 700; font-size: 16px; }
  h1 { color: white; font-size: 22px; font-weight: 800; }
  .subtitle { color: #9ca3af; margin-top: 4px; font-size: 13px; }
  .body { padding: 32px 40px; }
  .verdict-box { padding: 20px 24px; border-radius: 12px; border: 2px solid ${verdictColor}33; background: ${verdictColor}0d; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 16px; }
  .verdict-badge { background: ${verdictColor}; color: white; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
  .verdict-detail { color: #374151; font-size: 13px; line-height: 1.6; margin-top: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .card { background: #f9fafb; border-radius: 10px; padding: 20px; }
  .card-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
  .metric { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
  .metric:last-child { border: none; font-weight: 700; }
  .metric-label { color: #6b7280; }
  .metric-value { font-weight: 600; color: #111827; }
  .scenarios { margin-bottom: 24px; }
  .scenario-row { display: grid; grid-template-columns: 120px 1fr 80px 80px 80px; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
  .scenario-row:first-child { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; }
  .bar-wrap { background: #f3f4f6; border-radius: 4px; height: 8px; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .footer { padding: 20px 40px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #f3f4f6; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .green { color: #16a34a; } .red { color: #dc2626; } .amber { color: #d97706; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">
      <div class="logo-mark">R</div>
      <span class="logo-text">RevEngine AI</span>
    </div>
    <h1>Investment Arbitrage Report</h1>
    <p class="subtitle">${inputs.neighborhood} · £${Number(inputs.purchase_price).toLocaleString()} · ${inputs.room_type} · Generated ${new Date().toLocaleDateString("en-GB", {day:"numeric",month:"long",year:"numeric"})}</p>
  </div>
  <div class="body">
    <div class="verdict-box">
      <div>
        <span class="verdict-badge">${base.verdict}</span>
        <p class="verdict-detail">${base.verdict_detail}</p>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-title">Base Case P&amp;L</div>
        <div class="metric"><span class="metric-label">Gross Annual Revenue</span><span class="metric-value">${fmt(base.annual_revenue)}</span></div>
        <div class="metric"><span class="metric-label">Running Costs (20%)</span><span class="metric-value red">−${fmt(base.running_costs)}</span></div>
        <div class="metric"><span class="metric-label">Annual Mortgage</span><span class="metric-value red">−${fmt(base.annual_mortgage)}</span></div>
        <div class="metric"><span class="metric-label">Net Annual Profit</span><span class="metric-value ${base.net_annual_profit >= 0 ? "green" : "red"}">${fmt(base.net_annual_profit)}</span></div>
      </div>
      <div class="card">
        <div class="card-title">Key Metrics</div>
        <div class="metric"><span class="metric-label">Cap Rate</span><span class="metric-value">${base.cap_rate}%</span></div>
        <div class="metric"><span class="metric-label">Gross Yield</span><span class="metric-value">${base.gross_yield}%</span></div>
        <div class="metric"><span class="metric-label">Payback Period</span><span class="metric-value">${base.payback_years ? base.payback_years + " years" : "N/A"}</span></div>
        <div class="metric"><span class="metric-label">Monthly Mortgage</span><span class="metric-value">${fmt(base.monthly_mortgage)}</span></div>
      </div>
    </div>

    <div class="card scenarios">
      <div class="card-title" style="margin-bottom:12px;">Scenario Analysis</div>
      <div class="scenario-row"><span>Scenario</span><span>Revenue Bar</span><span>Revenue</span><span>Net Profit</span><span>Cap Rate</span></div>
      ${["pessimistic","base","optimistic"].map(k => {
        const s = scenarios[k];
        const maxRev = scenarios.optimistic.annual_revenue;
        const pct = Math.round((s.annual_revenue / maxRev) * 100);
        const barColor = k === "pessimistic" ? "#94a3b8" : k === "base" ? "#FF385C" : "#16a34a";
        return `<div class="scenario-row">
          <span style="font-weight:600">${s.label}</span>
          <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
          <span>${fmt(s.annual_revenue)}</span>
          <span class="${s.net_annual_profit >= 0 ? "green" : "red"}">${fmt(s.net_annual_profit)}</span>
          <span>${s.cap_rate}%</span>
        </div>`;
      }).join("")}
    </div>

    <div class="card">
      <div class="card-title">Airbnb vs Buy-to-Let Comparison</div>
      <div class="metric"><span class="metric-label">Airbnb Net Annual Profit</span><span class="metric-value ${base.net_annual_profit >= 0 ? "green" : "red"}">${fmt(base.net_annual_profit)}</span></div>
      <div class="metric"><span class="metric-label">Buy-to-Let Net Annual Profit</span><span class="metric-value">${fmt(base.btl_net_profit)}</span></div>
      <div class="metric"><span class="metric-label">Airbnb Premium</span><span class="metric-value ${base.airbnb_premium >= 0 ? "green" : "red"}">${base.airbnb_premium >= 0 ? "+" : ""}${fmt(base.airbnb_premium)}/yr</span></div>
      <div class="metric"><span class="metric-label">Airbnb Cap Rate vs BTL Cap Rate</span><span class="metric-value">${base.cap_rate}% vs ${base.btl_cap_rate}%</span></div>
    </div>
  </div>
  <div class="footer">
    Generated by RevEngine AI · Based on ${market.listing_count.toLocaleString()} listings in ${inputs.neighborhood} · Data source: ${market.data_source === "calendar" ? "Live calendar data" : "Demand proxy model"}
    <br>This report is for informational purposes only and does not constitute financial advice.
  </div>
</div>
</body>
</html>`;

  const blob   = new Blob([html], { type: "text/html" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = `revengine-arbitrage-${inputs.neighborhood.replace(/\s+/g,"-").toLowerCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ArbitragePage() {
  const [neighborhoods,  setNeighborhoods]  = useState([]);
  const [neighborhood,   setNeighborhood]   = useState("");
  const [purchasePrice,  setPurchasePrice]  = useState(500000);
  const [roomType,       setRoomType]       = useState("Entire home/apt");
  const [ltv,            setLtv]            = useState(75);
  const [interestRate,   setInterestRate]   = useState(5.5);
  const [repayment,      setRepayment]      = useState(false);
  const [result,         setResult]         = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [activeScenario, setActiveScenario] = useState("base");
  const resultRef = useRef(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/revpar/neighborhoods`)
      .then(r => r.json())
      .then(d => setNeighborhoods(d.neighborhoods || []));
  }, []);

  const handleCalculate = async () => {
    if (!neighborhood) { setError("Please select a neighborhood."); return; }
    if (!purchasePrice || purchasePrice < 50000) { setError("Enter a valid purchase price (min £50,000)."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const params = new URLSearchParams({
        neighborhood, purchase_price: purchasePrice, room_type: roomType,
        ltv, interest_rate: interestRate, repayment,
      });
      const res  = await fetch(`${BASE_URL}/api/v1/arbitrage/calculate?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Calculation failed");
      setResult(data);
      setActiveScenario("base");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  const active   = result?.scenarios?.[activeScenario];
  const vconf    = active ? (VERDICT_CONFIG[active.verdict] || VERDICT_CONFIG["Marginal"]) : null;
  const VIcon    = vconf?.icon;
  const maxRev   = result ? result.scenarios.optimistic.annual_revenue : 1;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            Investment Arbitrage
          </h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            Enter a property and get a full Airbnb ROI analysis — projected revenue,
            cap rate, mortgage breakdown, and buy-to-let comparison — powered by real market data.
          </p>
        </div>
      </div>

      {/* ── Input form ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calculator size={18} className="text-brand" />
          Property Details
        </h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Neighborhood */}
          <InputField label="Neighborhood" icon={Building2}>
            <div className="relative">
              <select
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
                className="appearance-none w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="">Select area…</option>
                {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </InputField>

          {/* Purchase Price */}
          <InputField label="Purchase Price" icon={PoundSterling} hint="Total property purchase price in GBP">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">£</span>
              <input
                type="number"
                value={purchasePrice}
                onChange={e => setPurchasePrice(Number(e.target.value))}
                min={50000} step={10000}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
          </InputField>

          {/* Room Type */}
          <InputField label="Property Type" icon={Building2}>
            <div className="relative">
              <select
                value={roomType}
                onChange={e => setRoomType(e.target.value)}
                className="appearance-none w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option>Entire home/apt</option>
                <option>Private room</option>
                <option>Shared room</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </InputField>

          {/* Mortgage type */}
          <InputField label="Mortgage Type">
            <div className="flex gap-3">
              {[["Interest-only", false], ["Repayment", true]].map(([label, val]) => (
                <button
                  key={label}
                  onClick={() => setRepayment(val)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                    repayment === val
                      ? "border-brand bg-rose-50 text-brand"
                      : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </InputField>
        </div>

        {/* Mortgage sliders */}
        <div className="grid grid-cols-2 gap-6 mb-8 p-5 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">LTV</label>
              <span className="text-sm font-bold text-gray-900">{ltv}%</span>
            </div>
            <input
              type="range" min={60} max={85} step={5} value={ltv}
              onChange={e => setLtv(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>60% (safer)</span><span>85% (riskier)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Loan: <strong>{fmt(purchasePrice * ltv / 100)}</strong> · Deposit: <strong>{fmt(purchasePrice * (1 - ltv / 100))}</strong>
            </p>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Interest Rate</label>
              <span className="text-sm font-bold text-gray-900">{interestRate}%</span>
            </div>
            <input
              type="range" min={2} max={12} step={0.25} value={interestRate}
              onChange={e => setInterestRate(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>2%</span><span>12%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              UK BTL avg: <strong>~5.5%</strong> · Monthly: <strong>{fmt((purchasePrice * ltv / 100) * (interestRate / 100) / 12)}</strong>
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium mb-4">
            <AlertCircle size={16} />{error}
          </div>
        )}

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-gray-900 text-white font-bold text-base rounded-xl hover:bg-gray-700 transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
          {loading ? "Calculating…" : "Calculate Investment Return"}
        </button>
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {result && (
        <div ref={resultRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Scenario tabs */}
          <div className="flex gap-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm">
            {["pessimistic", "base", "optimistic"].map(k => {
              const s  = SCENARIO_STYLE[k];
              const sc = result.scenarios[k];
              return (
                <button
                  key={k}
                  onClick={() => setActiveScenario(k)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                    activeScenario === k
                      ? `bg-gray-900 text-white shadow-md`
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-xs opacity-70 mb-0.5">{s.label}</span>
                  <span className={activeScenario === k ? "text-white" : s.color}>
                    {sc.cap_rate}% cap rate
                  </span>
                </button>
              );
            })}
          </div>

          {/* Verdict banner */}
          {active && (
            <div className={`flex items-start gap-4 p-5 rounded-2xl border-2 ${vconf.bg} ${vconf.border}`}>
              <VIcon size={28} className={vconf.text} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-lg font-black ${vconf.text}`}>{active.verdict}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full text-white ${vconf.badge}`}>
                    {SCENARIO_STYLE[activeScenario].label}
                  </span>
                </div>
                <p className={`text-sm ${vconf.text} leading-relaxed`}>{active.verdict_detail}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-3xl font-black ${vconf.text}`}>{active.cap_rate}%</p>
                <p className="text-xs text-gray-400 font-medium">cap rate</p>
              </div>
            </div>
          )}

          {/* KPI row */}
          {active && (
            <div className="grid grid-cols-4 gap-4">
              {[
                ["Annual Revenue",  fmt(active.annual_revenue),  "Gross Airbnb income"],
                ["Net Profit/yr",   fmt(active.net_annual_profit), `After mortgage & costs`],
                ["Gross Yield",     `${active.gross_yield}%`,    "Revenue ÷ purchase price"],
                ["Payback",         active.payback_years ? `${active.payback_years}y` : "N/A", "Break-even period"],
              ].map(([label, value, sub]) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-2xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* P&L + BTL comparison side by side */}
          {active && (
            <div className="grid grid-cols-2 gap-6">
              {/* P&L breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PoundSterling size={16} className="text-brand" />
                  P&L Breakdown
                </h3>
                <MetricRow label="Gross Annual Revenue"    value={fmt(active.annual_revenue)} />
                <MetricRow label="Running Costs (20%)"     value={`−${fmt(active.running_costs)}`} />
                <MetricRow label="Net Revenue"             value={fmt(active.net_revenue)} highlight />
                <MetricRow label="Annual Mortgage"         value={`−${fmt(active.annual_mortgage)}`}
                           sub={`${fmt(active.monthly_mortgage)}/mo`} />
                <MetricRow
                  label="Net Annual Profit"
                  value={fmt(active.net_annual_profit)}
                  highlight
                />
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Mortgage: {fmt(active.annual_mortgage)}/yr</span>
                    <span>Costs: {fmt(active.running_costs)}/yr</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400" style={{ width: `${Math.max(0, (active.net_annual_profit / active.annual_revenue) * 100).toFixed(0)}%` }} />
                    <div className="h-full bg-amber-300" style={{ width: `${((active.running_costs / active.annual_revenue) * 100).toFixed(0)}%` }} />
                    <div className="h-full bg-red-300" style={{ width: `${((active.annual_mortgage / active.annual_revenue) * 100).toFixed(0)}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Profit</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300 inline-block" />Costs</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300 inline-block" />Mortgage</span>
                  </div>
                </div>
              </div>

              {/* BTL comparison */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand" />
                  Airbnb vs Buy-to-Let
                </h3>
                <MetricRow label="Airbnb Annual Revenue"       value={fmt(active.annual_revenue)} />
                <MetricRow label="Long-let Annual Rent"        value={fmt(active.btl_annual_rent)}
                           sub="Based on 4.2% London yield" />
                <div className="my-2 border-t border-dashed border-gray-200" />
                <MetricRow label="Airbnb Net Profit"           value={fmt(active.net_annual_profit)} highlight />
                <MetricRow label="Buy-to-Let Net Profit"       value={fmt(active.btl_net_profit)} highlight />
                <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Airbnb Premium</p>
                  <p className={`text-xl font-black ${active.airbnb_premium >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {active.airbnb_premium >= 0 ? "+" : ""}{fmt(active.airbnb_premium)}/yr
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {active.airbnb_premium >= 0
                      ? `Airbnb earns ${fmt(active.airbnb_premium)} more per year than long-let`
                      : `Long-let earns ${fmt(Math.abs(active.airbnb_premium))} more at this scenario`}
                  </p>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <div className="text-center">
                    <p className="font-black text-gray-900">{active.cap_rate}%</p>
                    <p className="text-xs text-gray-400">Airbnb cap rate</p>
                  </div>
                  <Minus size={16} className="text-gray-300 self-center" />
                  <div className="text-center">
                    <p className="font-black text-gray-900">{active.btl_cap_rate}%</p>
                    <p className="text-xs text-gray-400">BTL cap rate</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 self-center" />
                  <div className="text-center">
                    <p className={`font-black ${active.cap_rate > active.btl_cap_rate ? "text-emerald-600" : "text-red-500"}`}>
                      {active.cap_rate > active.btl_cap_rate ? "+" : ""}{(active.cap_rate - active.btl_cap_rate).toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-400">difference</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scenario bars */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Percent size={16} className="text-brand" />
              All Scenarios at a Glance
            </h3>
            <div className="space-y-4">
              {["pessimistic", "base", "optimistic"].map(k => {
                const s    = result.scenarios[k];
                const st   = SCENARIO_STYLE[k];
                const pct  = Math.round((s.annual_revenue / maxRev) * 100);
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-700">{st.label}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          s.verdict === "Strong Buy" ? "bg-emerald-100 text-emerald-700" :
                          s.verdict === "Viable"     ? "bg-amber-100 text-amber-700" :
                          s.verdict === "Marginal"   ? "bg-orange-100 text-orange-700" :
                                                       "bg-red-100 text-red-700"
                        }`}>{s.verdict}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{fmt(s.annual_revenue)}/yr</span>
                        <span className="text-xs text-gray-400 ml-2">· {s.cap_rate}% cap rate</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${st.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center text-xs text-gray-400">
              <div><span className="font-bold text-gray-700 block text-sm">{result.market.occupancy}%</span>Area Occupancy</div>
              <div><span className="font-bold text-gray-700 block text-sm">{fmt(result.market.adr)}/night</span>Avg Nightly Rate</div>
              <div><span className="font-bold text-gray-700 block text-sm">{result.market.listing_count.toLocaleString()}</span>Active Listings</div>
            </div>
          </div>

          {/* Export */}
          <div className="flex justify-end">
            <button
              onClick={() => exportPDF(result, result.inputs)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-700 transition-all shadow-md"
            >
              <Download size={16} />
              Export Investment Report
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5 pb-4">
            <Info size={12} />
            For informational purposes only. Does not constitute financial or investment advice.
            Projections are based on neighborhood averages and may not reflect individual property performance.
          </p>
        </div>
      )}
    </div>
  );
}
