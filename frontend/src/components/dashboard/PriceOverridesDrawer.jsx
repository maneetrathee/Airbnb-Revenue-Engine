import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, CalendarDays, PoundSterling, CheckCircle, AlertCircle, Tag } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export default function PriceOverridesDrawer({ property, onClose }) {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [date, setDate]           = useState("");
  const [price, setPrice]         = useState("");
  const [reason, setReason]       = useState("");
  const [toast, setToast]         = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOverrides = () => {
    setLoading(true);
    fetch(`${BASE_URL}/api/v1/properties/${property.id}/overrides`)
      .then(r => r.json())
      .then(d => setOverrides(d.overrides || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOverrides(); }, [property.id]);

  const handleAdd = async () => {
    if (!date || !price) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/properties/${property.id}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: property.id, override_date: date, custom_price: parseFloat(price), reason })
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Price override saved!");
        setDate(""); setPrice(""); setReason("");
        fetchOverrides();
      }
    } catch { showToast("error", "Failed to save."); }
    setSaving(false);
  };

  const handleDelete = async (overrideId) => {
    try {
      await fetch(`${BASE_URL}/api/v1/properties/${property.id}/overrides/${overrideId}`, { method: "DELETE" });
      showToast("success", "Override removed.");
      fetchOverrides();
    } catch { showToast("error", "Failed to delete."); }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[420px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {toast && (
          <div className={`absolute top-4 left-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {toast.type === "success" ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <CalendarDays size={20} className="text-rose-500"/> Price Overrides
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{property.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500"/>
          </button>
        </div>

        <div className="p-5 border-b border-gray-100 bg-gray-50 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Set Custom Price</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Date</label>
              <input type="date" value={date} min={today}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Custom Price (£)</label>
              <div className="relative">
                <PoundSterling size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="number" value={price} min={1} placeholder="e.g. 250"
                  onChange={e => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400"/>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Reason (optional)</label>
            <div className="relative">
              <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={reason} onChange={e => setReason(e.target.value)}
                placeholder="e.g. Bank Holiday, Local event…"
                className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400"/>
            </div>
          </div>
          <button onClick={handleAdd} disabled={!date || !price || saving}
            className="w-full py-2.5 bg-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all disabled:opacity-40 text-sm">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            {saving ? "Saving…" : "Add Override"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Active Overrides {overrides.length > 0 && `(${overrides.length})`}
          </p>
          {loading && <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 size={20} className="animate-spin"/></div>}
          {!loading && overrides.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">No overrides set yet.</p>
              <p className="text-xs mt-1">Add custom prices for specific dates above.</p>
            </div>
          )}
          <div className="space-y-2">
            {overrides.map(o => (
              <div key={o.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-rose-200 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {new Date(o.override_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="text-sm font-bold text-rose-500">£{o.custom_price}</span>
                  </div>
                  {o.reason && <p className="text-xs text-gray-400 mt-0.5 truncate">{o.reason}</p>}
                </div>
                <button onClick={() => handleDelete(o.id)}
                  className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
