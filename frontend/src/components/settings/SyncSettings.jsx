import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  Zap, Shield, History, ToggleLeft, ToggleRight,
  Loader2, CheckCircle, AlertCircle, RefreshCw,
  PoundSterling, ChevronDown, Clock, Calendar,
  Building2, Play, Mail
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL + "";

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

const StatusBadge = ({ status }) => (
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
    status === "success" ? "bg-emerald-100 text-emerald-700" :
    status === "warning"  ? "bg-amber-100 text-amber-700" :
    "bg-red-100 text-red-700"
  }`}>{status}</span>
);

const formatTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
};

export default function SyncSettings() {
  const { user } = useUser();
  const userId   = user?.id || "demo-user";

  // Settings state
  const [enabled,       setEnabled]      = useState(false);
  const [minPrice,      setMinPrice]      = useState(30);
  const [maxPrice,      setMaxPrice]      = useState(500);
  const [neighborhood,  setNeighborhood]  = useState("");
  const [neighborhoods, setNeighborhoods] = useState([]);

  // Email state
  const [notifEmail,   setNotifEmail]   = useState("");
  const [savingEmail,  setSavingEmail]  = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // UI state
  const [saving,          setSaving]          = useState(false);
  const [syncing,         setSyncing]         = useState(false);
  const [logs,            setLogs]            = useState([]);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [toast,           setToast]           = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLogs = () =>
    fetch(`${BASE_URL}/api/v1/sync/logs/${userId}`)
      .then(r => r.json()).then(d => setLogs(d.logs || []));

  const fetchSchedulerStatus = () =>
    fetch(`${BASE_URL}/api/v1/sync/status`)
      .then(r => r.json()).then(setSchedulerStatus).catch(() => {});

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/revpar/neighborhoods`)
      .then(r => r.json()).then(d => setNeighborhoods(d.neighborhoods || []));

    fetch(`${BASE_URL}/api/v1/sync/settings/${userId}`)
      .then(r => r.json()).then(d => {
        setEnabled(d.enabled);
        setMinPrice(d.min_price);
        setMaxPrice(d.max_price);
        setNeighborhood(d.neighborhood || "");
        if (d.email) setNotifEmail(d.email);
      });

    fetchLogs();
    fetchSchedulerStatus();
    const interval = setInterval(fetchSchedulerStatus, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleSave = async () => {
    if (minPrice >= maxPrice) { showToast("error", "Min price must be less than max."); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/sync/settings/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, min_price: minPrice, max_price: maxPrice, neighborhood }),
      });
      const data = await res.json();
      if (data.success) { showToast("success", "Settings saved."); fetchLogs(); fetchSchedulerStatus(); }
    } catch { showToast("error", "Failed to save."); }
    finally   { setSaving(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/sync/trigger/${userId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) { showToast("success", `Sync done — £${data.final_price}/night for ${data.neighborhood}`); fetchLogs(); }
      else showToast("error", data.detail || "Sync failed.");
    } catch { showToast("error", "Sync failed."); }
    finally  { setSyncing(false); }
  };

  const handleSaveEmail = async () => {
    if (!notifEmail) return;
    setSavingEmail(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/users/${userId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: notifEmail }),
      });
      const data = await res.json();
      if (data.success) showToast("success", "Notification email saved.");
      else              showToast("error", "Failed to save email.");
    } catch { showToast("error", "Failed to save email."); }
    finally  { setSavingEmail(false); }
  };

  const handleTestEmail = async () => {
    if (!notifEmail) return;
    setTestingEmail(true);
    try {
      // Save email first, then fire test
      await fetch(`${BASE_URL}/api/v1/users/${userId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: notifEmail }),
      });
      const res  = await fetch(`${BASE_URL}/api/v1/users/${userId}/test-email`, { method: "POST" });
      const data = await res.json();
      if (data.success) showToast("success", `Test digest sent to ${notifEmail} ✓`);
      else              showToast("error", data.detail || "Failed — check RESEND_API_KEY.");
    } catch { showToast("error", "Failed to send. Check RESEND_API_KEY in .env."); }
    finally  { setTestingEmail(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Zap className="text-brand" size={32} />
          Smart Sync
        </h1>
        <p className="text-gray-500 mt-2">Automated nightly pricing — runs every day at midnight.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border animate-in slide-in-from-top-2 duration-300 ${
          toast.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Scheduler status banner */}
      {schedulerStatus && (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
          schedulerStatus.status === "running" ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            schedulerStatus.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
          }`} />
          <div className="flex-1">
            <p className={`font-bold text-sm ${schedulerStatus.status === "running" ? "text-emerald-700" : "text-gray-500"}`}>
              Scheduler {schedulerStatus.status === "running" ? "Active" : "Not Running"}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-0.5">
              {schedulerStatus.next_run && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={11} />Next sync: <strong>{formatTime(schedulerStatus.next_run)}</strong>
                </span>
              )}
              {schedulerStatus.active_properties !== undefined && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 size={11} /><strong>{schedulerStatus.active_properties}</strong> properties queued
                </span>
              )}
              {schedulerStatus.jobs?.filter(j => j.id !== "nightly_sync").map(job => (
                <span key={job.id} className="text-xs text-gray-500 flex items-center gap-1">
                  <Mail size={11} />{job.name}: <strong>{formatTime(job.next_run)}</strong>
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs text-gray-400 shrink-0">🇬🇧 London time</span>
        </div>
      )}

      {/* Auto-sync toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Auto-Sync Pricing Daily</h2>
            <p className="text-sm text-gray-500 mt-1">
              The AI recalculates and pushes optimised prices every night at midnight.
            </p>
          </div>
          <button onClick={() => setEnabled(!enabled)}>
            {enabled
              ? <ToggleRight size={48} className="text-brand" />
              : <ToggleLeft  size={48} className="text-gray-300" />}
          </button>
        </div>
        {enabled && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center gap-2">
            <CheckCircle size={16} />
            Active — prices update every night. Per-property settings can override this.
          </div>
        )}
      </Card>

      {/* Notification email */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Mail size={20} className="text-brand" />
          <h2 className="text-lg font-bold text-gray-900">Notification Email</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Get a <strong>daily sync summary at 8am</strong> and a <strong>weekly RevPAR report every Monday</strong>.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={notifEmail}
            onChange={e => setNotifEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
          <button
            onClick={handleSaveEmail}
            disabled={savingEmail || !notifEmail}
            className="px-4 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-700 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {savingEmail ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Save
          </button>
          <button
            onClick={handleTestEmail}
            disabled={testingEmail || !notifEmail}
            title="Send a test digest to this email right now"
            className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {testingEmail ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Test
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Clock size={11} />
          Daily at 08:00 · Weekly on Mondays at 08:00 · London time
        </p>
      </Card>

      {/* Neighborhood */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Target Neighborhood</h2>
        <p className="text-sm text-gray-500 mb-4">Global default — used for properties set to "Use Global".</p>
        <div className="relative">
          <select
            value={neighborhood}
            onChange={e => setNeighborhood(e.target.value)}
            className="appearance-none w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          >
            <option value="">Select a neighborhood…</option>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </Card>

      {/* Price guardrails */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-brand" />
          <h2 className="text-lg font-bold text-gray-900">Global Price Guardrails</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">Default bounds for all properties. Individual properties can override these.</p>
        <div className="grid grid-cols-2 gap-6">
          {[
            ["Minimum", minPrice, setMinPrice, "Never go below this"],
            ["Maximum", maxPrice, setMaxPrice, "Never exceed this"],
          ].map(([label, val, setter, hint]) => (
            <div key={label}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label} Price</label>
              <div className="relative">
                <PoundSterling size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number" value={val} min={10}
                  onChange={e => setter(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{hint}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
            <span>£{minPrice}</span>
            <span className="text-brand">AI operates in this range</span>
            <span>£{maxPrice}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div className="h-2 bg-brand rounded-full w-full" />
          </div>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          {saving ? "Saving…" : "Save Global Settings"}
        </button>
        <button
          onClick={handleSync}
          disabled={syncing || !enabled || !neighborhood}
          title={!enabled ? "Enable auto-sync first" : !neighborhood ? "Select a neighborhood first" : "Run sync now"}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          {syncing ? "Syncing…" : "Run Now"}
        </button>
      </div>

      {/* Sync log */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={20} className="text-brand" />
            <h2 className="text-lg font-bold text-gray-900">Sync History</h2>
          </div>
          <button onClick={fetchLogs} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <History size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No sync history yet.</p>
            <p className="text-xs mt-1">Save settings and run a sync to see logs here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusBadge status={log.status} />
                    <span className="text-sm font-bold text-gray-900 truncate">{log.action}</span>
                  </div>
                  {log.details && <p className="text-xs text-gray-500 truncate">{log.details}</p>}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
