import { useState, useEffect } from "react";
import {
  MessageSquare, Star, ChevronDown, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Minus, Sparkles, BarChart2,
  ThumbsUp, ThumbsDown, Lightbulb, Users, CheckCircle,
  RefreshCw, ArrowUpDown,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const METRICS  = ["Overall", "Cleanliness", "Check-in", "Communication", "Location", "Value", "Accuracy"];
const TABS     = ["Rankings", "Compare", "AI Review Analyser", "Description Scorer"];

const ScoreBadge = ({ score }) => {
  const color = score >= 4.8 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400" :
                score >= 4.5 ? "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400" :
                               "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400";
  return <span className={`text-xs font-black px-2 py-0.5 rounded-full ${color}`}>{score?.toFixed(2)}</span>;
};

const RadarCard = ({ data, color, title }) => {
  if (!data) return null;
  const radarData = Object.entries(data.scores).map(([key, val]) => ({
    subject: key, value: val, fullMark: 5,
  }));
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">{title || data.neighbourhood}</h3>
        <ScoreBadge score={data.scores["Overall"]} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#f3f4f6" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
          <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} dot />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {Object.entries(data.scores).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">{k}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${((v - 4) / 1) * 100}%`, background: color }} />
              </div>
              <span className="font-bold text-gray-700 dark:text-gray-300">{v?.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SentimentPage() {
  const [tab,          setTab]          = useState("Rankings");
  const [metric,       setMetric]       = useState("Overall");
  const [rankings,     setRankings]     = useState(null);
  const [rankLoading,  setRankLoading]  = useState(false);
  const [neighborhoods, setNeighborhoods] = useState([]);

  // Compare tab
  const [neighA,     setNeighA]     = useState("");
  const [neighB,     setNeighB]     = useState("");
  const [compareData, setCompareData] = useState(null);
  const [comparing,  setComparing]  = useState(false);

  // AI Review Analyser
  const [reviews,      setReviews]      = useState("");
  const [reviewNeigh,  setReviewNeigh]  = useState("");
  const [reviewResult, setReviewResult] = useState(null);
  const [analysing,    setAnalysing]    = useState(false);
  const [reviewError,  setReviewError]  = useState("");

  // Description Scorer
  const [description,  setDescription]  = useState("");
  const [descNeigh,    setDescNeigh]    = useState("");
  const [descResult,   setDescResult]   = useState(null);
  const [scoring,      setScoring]      = useState(false);
  const [descError,    setDescError]    = useState("");

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/revpar/neighborhoods`)
      .then(r => r.json()).then(d => {
        const n = d.neighborhoods || [];
        setNeighborhoods(n);
        if (n.length) { setNeighA(n[0]); setNeighB(n[1] || n[0]); }
      });
  }, []);

  useEffect(() => {
    setRankLoading(true);
    fetch(`${BASE_URL}/api/v1/sentiment/rankings?metric=${encodeURIComponent(metric)}`)
      .then(r => r.json()).then(d => { setRankings(d); setRankLoading(false); });
  }, [metric]);

  const handleCompare = () => {
    if (!neighA || !neighB) return;
    setComparing(true);
    fetch(`${BASE_URL}/api/v1/sentiment/compare?a=${encodeURIComponent(neighA)}&b=${encodeURIComponent(neighB)}`)
      .then(r => r.json()).then(d => { setCompareData(d); setComparing(false); });
  };

  const handleAnalyseReviews = async () => {
    if (!reviews.trim()) return;
    setAnalysing(true); setReviewError(""); setReviewResult(null);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/sentiment/analyse-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews, neighbourhood: reviewNeigh }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setReviewResult(data);
    } catch (e) { setReviewError(e.message); }
    setAnalysing(false);
  };

  const handleScoreDescription = async () => {
    if (!description.trim()) return;
    setScoring(true); setDescError(""); setDescResult(null);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/sentiment/score-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, neighbourhood: descNeigh }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Scoring failed");
      setDescResult(data);
    } catch (e) { setDescError(e.message); }
    setScoring(false);
  };

  const scoreColor = s => s >= 8 ? "#10b981" : s >= 6 ? "#f59e0b" : "#ef4444";

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <MessageSquare className="text-brand" size={32} />
          Sentiment Analysis
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Neighbourhood score breakdowns + AI-powered review and description analysis.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Rankings ────────────────────────────────────────────────── */}
      {tab === "Rankings" && (
        <div className="space-y-5">
          {/* Metric selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank by</span>
            <div className="flex gap-1 flex-wrap">
              {METRICS.map(m => (
                <button key={m} onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                    metric === m
                      ? "bg-gray-100 dark:bg-gray-100 text-gray-900 border-gray-300"
                      : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {rankLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-2" /><span>Loading rankings…</span>
            </div>
          ) : rankings && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <ArrowUpDown size={16} className="text-brand" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100">London Neighbourhoods — {metric} Score</h3>
                <span className="text-xs text-gray-400 ml-auto">{rankings.rankings.length} areas ranked</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      {["Rank", "Neighbourhood", metric, "Overall", "Listings", "Bar"].map(h => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.rankings.map((r, i) => {
                      const maxScore = rankings.rankings[0]?.score || 5;
                      const pct      = ((r.score - 4) / 1) * 100;
                      const medal    = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      return (
                        <tr key={r.neighbourhood} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-5 py-3 text-sm font-black text-gray-400 dark:text-gray-500">
                            {medal || `#${r.rank}`}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.neighbourhood}</span>
                          </td>
                          <td className="px-5 py-3"><ScoreBadge score={r.score} /></td>
                          <td className="px-5 py-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{r.overall?.toFixed(3)}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{r.reviewed.toLocaleString()}</span>
                          </td>
                          <td className="px-5 py-3 w-32">
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
                                style={{ width: `${Math.max(0, pct)}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Compare ─────────────────────────────────────────────────── */}
      {tab === "Compare" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Area A</label>
                <div className="relative">
                  <select value={neighA} onChange={e => setNeighA(e.target.value)}
                    className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
                    {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="pt-6 text-gray-400 dark:text-gray-500 font-black">VS</div>
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Area B</label>
                <div className="relative">
                  <select value={neighB} onChange={e => setNeighB(e.target.value)}
                    className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
                    {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="pt-6">
                <button onClick={handleCompare} disabled={comparing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50">
                  {comparing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Compare
                </button>
              </div>
            </div>
          </div>

          {compareData && (
            <div className="grid grid-cols-2 gap-5">
              <RadarCard data={compareData.a} color="#FF385C" />
              <RadarCard data={compareData.b} color="#8b5cf6" />

              {/* Head to head table */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Head-to-Head Breakdown</h3>
                <div className="space-y-3">
                  {Object.keys(compareData.a.scores).map(metric => {
                    const aScore = compareData.a.scores[metric];
                    const bScore = compareData.b.scores[metric];
                    const diff   = aScore - bScore;
                    return (
                      <div key={metric} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-28 shrink-0">{metric}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className={`text-sm font-bold w-12 text-right ${diff > 0 ? "text-rose-500" : "text-gray-700"}`}>
                            {aScore?.toFixed(3)}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300" />
                            <div className={`absolute top-0 bottom-0 rounded-full ${diff >= 0 ? "bg-rose-400" : "bg-violet-400"}`}
                              style={{
                                left:  diff >= 0 ? "50%" : `${50 + (diff / 1) * 50}%`,
                                width: `${Math.abs(diff) / 1 * 50}%`,
                              }} />
                          </div>
                          <span className={`text-sm font-bold w-12 ${diff < 0 ? "text-violet-500" : "text-gray-700"}`}>
                            {bScore?.toFixed(3)}
                          </span>
                        </div>
                        <span className={`text-xs font-bold w-14 text-right ${diff > 0 ? "text-rose-500" : diff < 0 ? "text-violet-500" : "text-gray-400"}`}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />{compareData.a.neighbourhood}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />{compareData.b.neighbourhood}</span>
                </div>
              </div>
            </div>
          )}

          {!compareData && !comparing && (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Select two areas and click Compare</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: AI Review Analyser ──────────────────────────────────────── */}
      {tab === "AI Review Analyser" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} className="text-brand" />
              <h2 className="font-bold text-gray-900 text-lg">AI Review Analyser</h2>
              <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Powered by Claude</span>
            </div>
            <p className="text-sm text-gray-500">
              Paste your recent guest reviews below. Claude will identify praise themes, complaints, and actionable improvements.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Your Neighbourhood (optional)</label>
              <div className="relative w-64">
                <select value={reviewNeigh} onChange={e => setReviewNeigh(e.target.value)}
                  className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
                  <option value="">Select…</option>
                  {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Paste Guest Reviews</label>
              <textarea value={reviews} onChange={e => setReviews(e.target.value)} rows={8}
                placeholder="Paste 5-20 guest reviews here. You can copy them directly from your Airbnb host dashboard..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none" />
              <p className="text-xs text-gray-400 mt-1">{reviews.length} characters — more reviews = better analysis</p>
            </div>

            {reviewError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                <AlertCircle size={15} />{reviewError}
              </div>
            )}

            <button onClick={handleAnalyseReviews} disabled={analysing || !reviews.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50">
              {analysing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {analysing ? "Analysing with Claude…" : "Analyse Reviews"}
            </button>
          </div>

          {reviewResult && !reviewResult.parse_error && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Sentiment score */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">Sentiment Analysis</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center border-4 text-xl font-black"
                      style={{ borderColor: scoreColor(reviewResult.sentiment_score), color: scoreColor(reviewResult.sentiment_score) }}>
                      {reviewResult.sentiment_score}/10
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{reviewResult.summary}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Guest Profile</p>
                    <p className="text-gray-700">{reviewResult.guest_profile}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pricing Signal</p>
                    <p className="text-gray-700">{reviewResult.pricing_signal}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Praise */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp size={16} className="text-emerald-600" />
                    <h4 className="font-bold text-emerald-800 text-sm">What Guests Love</h4>
                  </div>
                  <div className="space-y-2">
                    {reviewResult.praise_themes?.map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-emerald-800">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complaints */}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsDown size={16} className="text-red-600" />
                    <h4 className="font-bold text-red-800 text-sm">Pain Points</h4>
                  </div>
                  <div className="space-y-2">
                    {reviewResult.complaint_themes?.map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-800">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvements */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={16} className="text-amber-600" />
                    <h4 className="font-bold text-amber-800 text-sm">Suggested Improvements</h4>
                  </div>
                  <div className="space-y-2">
                    {reviewResult.improvement_suggestions?.map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-black text-xs mt-0.5 shrink-0">{i + 1}.</span>
                        <p className="text-sm text-amber-800">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Description Scorer ──────────────────────────────────────── */}
      {tab === "Description Scorer" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Star size={20} className="text-brand" />
              <h2 className="font-bold text-gray-900 text-lg">Listing Description Scorer</h2>
              <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Powered by Claude</span>
            </div>
            <p className="text-sm text-gray-500">
              Paste your Airbnb listing description. Claude will score it on clarity, emotional appeal, and USP strength — then suggest improvements.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Neighbourhood (optional)</label>
              <div className="relative w-64">
                <select value={descNeigh} onChange={e => setDescNeigh(e.target.value)}
                  className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
                  <option value="">Select…</option>
                  {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Listing Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={8}
                placeholder="Paste your full Airbnb listing description here..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none" />
            </div>

            {descError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                <AlertCircle size={15} />{descError}
              </div>
            )}

            <button onClick={handleScoreDescription} disabled={scoring || !description.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50">
              {scoring ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
              {scoring ? "Scoring with Claude…" : "Score My Description"}
            </button>
          </div>

          {descResult && !descResult.parse_error && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Overall score */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 text-lg">Description Score</h3>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 text-2xl font-black"
                    style={{ borderColor: scoreColor(descResult.overall_score), color: scoreColor(descResult.overall_score) }}>
                    {descResult.overall_score}/10
                  </div>
                </div>

                {/* Score breakdown bars */}
                <div className="space-y-3 mb-5">
                  {Object.entries(descResult.scores || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-36 shrink-0 capitalize">{k.replace(/_/g, " ")}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${v * 10}%`, background: scoreColor(v) }} />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-8">{v}/10</span>
                    </div>
                  ))}
                </div>

                {/* Rewrite suggestion */}
                {descResult.rewrite_suggestion && (
                  <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                    <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles size={12} /> Claude's Rewrite Suggestion
                    </p>
                    <p className="text-sm text-violet-900 italic">"{descResult.rewrite_suggestion}"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Strengths</p>
                  {descResult.strengths?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-800">{s}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">Weaknesses</p>
                  {descResult.weaknesses?.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800">{w}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Missing Elements</p>
                  {descResult.missing_elements?.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <Lightbulb size={13} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800">{m}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
