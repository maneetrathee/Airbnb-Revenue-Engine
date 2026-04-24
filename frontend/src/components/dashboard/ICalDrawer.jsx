import { useState, useEffect } from "react";
import { X, Link, RefreshCw, CheckCircle, AlertCircle, Loader2, Calendar, Clock, ExternalLink } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export default function ICalDrawer({ property, onClose }) {
  const [url, setUrl]           = useState("");
  const [status, setStatus]     = useState(null);
  const [syncing, setSyncing]   = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/ical/status/${property.id}`)
      .then(r => r.json())
      .then(d => {
        setStatus(d);
        if (d.url) setUrl(d.url);
      });
  }, [property.id]);

  const handleSync = async () => {
    if (!url.trim()) return;
    setSyncing(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/ical/sync`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ property_id: property.id, ical_url: url }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Synced — ${data.bookings_found} bookings imported`);
        setStatus(s => ({ ...s, configured: true, booking_count: data.bookings_found, last_synced: data.synced_at }));
      } else {
        showToast("error", data.detail || "Sync failed");
      }
    } catch { showToast("error", "Failed to sync"); }
    setSyncing(false);
  };

  const formatTime = (iso) => iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Never";

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[440px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {toast && (
          <div className={`absolute top-4 left-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {toast.type === "success" ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Calendar size={20} className="text-rose-500"/> iCal Live Sync
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{property.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* How to find iCal URL */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 space-y-1">
            <p className="font-bold">How to get your Airbnb iCal URL:</p>
            <p>1. Go to Airbnb → Calendar → Availability</p>
            <p>2. Click <strong>"Export Calendar"</strong></p>
            <p>3. Copy the link and paste it below</p>
            <a href="https://www.airbnb.com/hosting/calendars" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-blue-600 font-bold mt-1 hover:underline">
              Open Airbnb Calendar <ExternalLink size={12}/>
            </a>
          </div>

          {/* URL input */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              iCal URL (.ics)
            </label>
            <div className="relative">
              <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.airbnb.com/calendar/ical/..."
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400"
              />
            </div>
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={!url.trim() || syncing}
            className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all disabled:opacity-40"
          >
            {syncing ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
            {syncing ? "Syncing…" : "Sync Now"}
          </button>

          {/* Status */}
          {status?.configured && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sync Status</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle size={15} className="text-emerald-500"/>
                  <span className="font-bold">{status.booking_count} bookings</span>
                  <span className="text-gray-400">imported</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={12}/>
                Last synced: <strong className="text-gray-600">{formatTime(status.last_synced)}</strong>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
            <p className="font-bold">💡 How this works</p>
            <p>Once synced, your booked dates appear as overlays on the Surge Heatmap — so you can instantly see which high-demand days are already taken.</p>
            <p className="mt-1">Re-sync anytime to refresh bookings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
