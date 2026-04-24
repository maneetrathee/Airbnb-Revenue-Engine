import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  Target, ChevronDown, Loader2, AlertCircle, TrendingUp,
  TrendingDown, Minus, PoundSterling, Building2, ExternalLink,
  BarChart2, Users, Percent, ArrowUp, ArrowDown, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const ROOM_TYPES = ["Entire home/apt", "Private room", "Shared room", "Hotel room"];

const fmt = n => n == null ? "—" : `£${Number(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const POSITION_CONFIG = {
  underpriced:   { color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     icon: TrendingDown, label: "Underpriced" },
  below_median:  { color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   icon: ArrowDown,    label: "Below Median" },
  competitive:   { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: Minus,        label: "Competitive" },
  premium:       { color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200",  icon: TrendingUp,   label: "Premium" },
};

export default function CompetitorDashboard() {
  const { user } = useUser();
  const userId = user?.id || "demo-user";

  const [neighborhoods, setNeighborhoods] = useState([]);
  const [neighborhood,  setNeighborhood]  = useState("");
  const [roomType,      setRoomType]      = useState("Entire home/apt");
  const [yourPrice,     setYourPrice]     = useState("");
  const [sortBy,        setSortBy]        = useState("price_desc");

  const [overview,  setOverview]  = useState(null);
  const [listings,  setListings]  = useState([]);
  const [distrib,   setDistrib]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/revpar/neighborhoods`)
      .then(r => r.json()).then(d => {
        const n = d.neighborhoods || [];
        setNeighborhoods(n);
        if (n.length) setNeighborhood(n[0]);
      });
  }, []);

  useEffect(() => {
    if (!neighborhood) return;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ neighborhood, room_type: roomType });
    if (yourPrice) params.set("your_price", yourPrice);

    Promise.all([
      fetch(`${BASE_URL}/api/v1/competitors/overview?${params}`).then(r => r.json()),
      fetch(`${BASE_URL}/api/v1/competitors/listings?neighborhood=${encodeURIComponent(neighborhood)}&room_type=${encodeURIComponent(roomType)}&sort=${sortBy}`).then(r => r.json()),
      fetch(`${BASE_URL}/api/v1/competitors/distribution?neighborhood=${encodeURIComponent(neighborhood)}&room_type=${encodeURIComponent(roomType)}`).then(r => r.json()),
    ])
      .then(([ov, li, di]) => { setOverview(ov); setListings(li.listings || []); setDistrib(di); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [neighborhood, roomType, yourPrice, sortBy]);

  const posConf = overview?.position ? POSITION_CONFIG[overview.position] : null;
  const PosIcon = posConf?.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Target className="text-brand" size={32} />
          Competitor Monitor
        </h1>
        <p className="text-gray-500 mt-2">
          See how your pricing stacks up against similar listings in your area.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Neighborhood */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Neighborhood</label>
            <div className="relative">
              <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all">
                {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Room type */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Room Type</label>
            <div className="relative">
              <select value={roomType} onChange={e => setRoomType(e.target.value)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all">
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Your price */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Your Nightly Price</label>
            <div className="relative">
              <PoundSterling size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" value={yourPrice} onChange={e => setYourPrice(e.target.value)}
                placeholder="e.g. 120"
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all" />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Sort Competitors By</label>
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all">
                <option value="price_desc">Highest Price</option>
                <option value="price_asc">Lowest Price</option>
                <option value="reviews_desc">Most Reviews</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-medium">
          <AlertCircle size={18} />{error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
          <Loader2 size={26} className="animate-spin" />
          <span className="font-medium">Analysing market…</span>
        </div>
      )}

      {!loading && overview && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Listings in Area", value: overview.total_listings.toLocaleString(), sub: `${roomType}`, icon: Building2, color: "text-gray-900" },
              { label: "Median Price",     value: fmt(overview.percentiles.median),          sub: "50th percentile",     icon: PoundSterling, color: "text-gray-900" },
              { label: "Top 25% Price",    value: fmt(overview.percentiles.p75),             sub: "75th percentile",     icon: TrendingUp,    color: "text-violet-600" },
              { label: "Avg Occupancy",    value: overview.avg_occupancy ? `${overview.avg_occupancy}%` : "—", sub: "Est. from reviews", icon: Percent, color: "text-emerald-600" },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                  <Icon size={16} className={color} />
                </div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Position card — only if your_price entered */}
          {posConf && overview.opportunity && (
            <div className={`flex items-start gap-4 p-5 rounded-2xl border-2 ${posConf.bg} ${posConf.border}`}>
              <PosIcon size={28} className={posConf.color} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-lg font-black ${posConf.color}`}>{posConf.label}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full text-white ${
                    overview.position === "underpriced" ? "bg-red-500" :
                    overview.position === "below_median" ? "bg-amber-500" :
                    overview.position === "competitive" ? "bg-emerald-500" : "bg-violet-500"
                  }`}>
                    ~{overview.percentile}th percentile
                  </span>
                </div>
                <p className={`text-sm ${posConf.color} leading-relaxed`}>{overview.opportunity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-3xl font-black ${posConf.color}`}>{fmt(yourPrice)}</p>
                <p className="text-xs text-gray-400 font-medium">your price</p>
                <p className={`text-sm font-bold mt-1 ${posConf.color}`}>
                  vs {fmt(overview.percentiles.median)} median
                </p>
              </div>
            </div>
          )}

          {/* Price percentile bar */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <BarChart2 size={18} className="text-brand" />
              Price Percentile Breakdown
            </h3>
            <div className="relative pt-8 pb-4">
              {/* Bar */}
              <div className="h-4 bg-gradient-to-r from-red-300 via-amber-300 via-emerald-300 to-violet-400 rounded-full relative">
                {/* Markers */}
                {[
                  { pct: 0,   label: "Min",    val: overview.min_price },
                  { pct: 25,  label: "P25",    val: overview.percentiles.p25 },
                  { pct: 50,  label: "Median", val: overview.percentiles.median },
                  { pct: 75,  label: "P75",    val: overview.percentiles.p75 },
                  { pct: 90,  label: "P90",    val: overview.percentiles.p90 },
                  { pct: 100, label: "Max",    val: overview.max_price },
                ].map(({ pct, label, val }) => (
                  <div key={label} className="absolute top-0 -translate-y-7 -translate-x-1/2 text-center" style={{ left: `${pct}%` }}>
                    <p className="text-xs font-bold text-gray-500">{label}</p>
                    <p className="text-xs text-gray-700 font-bold">{fmt(val)}</p>
                    <div className="w-0.5 h-4 bg-gray-300 mx-auto mt-1" />
                  </div>
                ))}

                {/* Your price marker */}
                {yourPrice && overview.percentile && (
                  <div className="absolute top-0 -translate-y-1 -translate-x-1/2 z-10"
                    style={{ left: `${Math.min(overview.percentile, 98)}%` }}>
                    <div className="w-4 h-4 bg-gray-900 rounded-full border-2 border-white shadow-lg" />
                    <div className="absolute top-5 -translate-x-1/2 whitespace-nowrap">
                      <p className="text-xs font-black text-gray-900">You</p>
                      <p className="text-xs text-gray-600">{fmt(yourPrice)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price distribution chart */}
          {distrib && distrib.buckets?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <BarChart2 size={18} className="text-brand" />
                Price Distribution — {overview.total_listings} listings
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distrib.buckets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`${v} listings`, "Count"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  {yourPrice && (
                    <ReferenceLine
                      x={distrib.buckets.find(b => yourPrice >= b.range_start && yourPrice < b.range_end)?.label}
                      stroke="#111827" strokeWidth={2} strokeDasharray="4 2"
                      label={{ value: "You", position: "top", fontSize: 11, fontWeight: 700 }}
                    />
                  )}
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distrib.buckets.map((b, i) => {
                      const isYours = yourPrice && yourPrice >= b.range_start && yourPrice < b.range_end;
                      return <Cell key={i} fill={isYours ? "#111827" : "#FF385C"} fillOpacity={isYours ? 1 : 0.7} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Competitor listings table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-brand" />
                Competitor Listings
              </h3>
              <p className="text-xs text-gray-400">Top {listings.length} results</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Listing", "Price/night", "Est. Occupancy", "Reviews/mo", ""].map(h => (
                      <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l, i) => {
                    const isAbove  = yourPrice && l.price > Number(yourPrice);
                    const isBelow  = yourPrice && l.price < Number(yourPrice);
                    return (
                      <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-xs">{l.name}</p>
                          <p className="text-xs text-gray-400">{l.bedrooms} bed · {roomType}</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{fmt(l.price)}</span>
                            {yourPrice && (
                              isAbove
                                ? <span className="text-xs text-red-500 font-bold flex items-center gap-0.5"><ArrowUp size={10}/>above you</span>
                                : isBelow
                                  ? <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5"><ArrowDown size={10}/>below you</span>
                                  : null
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${l.est_occupancy}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-600">{l.est_occupancy.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-gray-600">{l.reviews_per_month.toFixed(1)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <a href={l.airbnb_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-brand hover:text-rose-600 font-bold">
                            View <ExternalLink size={11} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5 pb-4">
            <Info size={12} />
            Data based on {overview.total_listings} active {roomType} listings in {neighborhood}.
            Occupancy estimated from review frequency.
          </p>
        </div>
      )}
    </div>
  );
}
