import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import PriceOverridesDrawer from "../components/dashboard/PriceOverridesDrawer";
import ICalDrawer from "../components/dashboard/ICalDrawer";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  BedDouble,
  MapPin,
  Home,
  ToggleLeft,
  ToggleRight,
  PoundSterling,
  ChevronDown,
  Shield,
  Globe,
  AlertCircle,
  CheckCircle,
  Sparkles,
  CalendarDays,
  Link, 
} from "lucide-react";

const BASE_URL =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL + "";

const ROOM_TYPES = [
  "Entire home/apt",
  "Private room",
  "Shared room",
  "Hotel room",
];

const PLACEHOLDER_PHOTOS = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80",
];

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in slide-in-from-top-3 duration-300 ${
        toast.type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-red-50 border-red-200 text-red-700"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle size={16} />
      ) : (
        <AlertCircle size={16} />
      )}
      {toast.message}
    </div>
  );
};

// ── Sync settings drawer (per-property) ──────────────────────────────────────
const SyncDrawer = ({ property, globalSettings, onClose, onSave }) => {
  const [useGlobal, setUseGlobal] = useState(
    property.sync_settings?.use_global ?? true,
  );
  const [enabled, setEnabled] = useState(
    property.sync_settings?.enabled ?? false,
  );
  const [minPrice, setMinPrice] = useState(
    property.sync_settings?.min_price ?? 30,
  );
  const [maxPrice, setMaxPrice] = useState(
    property.sync_settings?.max_price ?? 500,
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(property.id, {
      enabled,
      min_price: minPrice,
      max_price: maxPrice,
      use_global: useGlobal,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-96 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Sync Settings</h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {property.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div
            className={`p-4 rounded-xl border-2 transition-all ${useGlobal ? "border-brand bg-rose-50" : "border-gray-200 bg-gray-50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe
                  size={18}
                  className={useGlobal ? "text-brand" : "text-gray-400"}
                />
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    Use Global Defaults
                  </p>
                  <p className="text-xs text-gray-500">
                    Inherit settings from global config
                  </p>
                </div>
              </div>
              <button onClick={() => setUseGlobal(!useGlobal)}>
                {useGlobal ? (
                  <ToggleRight size={36} className="text-brand" />
                ) : (
                  <ToggleLeft size={36} className="text-gray-300" />
                )}
              </button>
            </div>
            {useGlobal && (
              <div className="mt-3 pt-3 border-t border-rose-200 text-xs text-rose-700 space-y-1">
                <p>
                  • Auto-sync:{" "}
                  <strong>{globalSettings?.enabled ? "ON" : "OFF"}</strong>
                </p>
                <p>
                  • Price range:{" "}
                  <strong>
                    £{globalSettings?.min_price} – £{globalSettings?.max_price}
                  </strong>
                </p>
              </div>
            )}
          </div>

          {!useGlobal && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-bold text-gray-900 text-sm">Auto-Sync</p>
                  <p className="text-xs text-gray-500">
                    Override for this property only
                  </p>
                </div>
                <button onClick={() => setEnabled(!enabled)}>
                  {enabled ? (
                    <ToggleRight size={36} className="text-brand" />
                  ) : (
                    <ToggleLeft size={36} className="text-gray-300" />
                  )}
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-brand" />
                  <p className="font-bold text-gray-900 text-sm">
                    Price Guardrails
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Min £
                    </label>
                    <div className="relative">
                      <PoundSterling
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="number"
                        value={minPrice}
                        min={10}
                        onChange={(e) => setMinPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Max £
                    </label>
                    <div className="relative">
                      <PoundSterling
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="number"
                        value={maxPrice}
                        min={10}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Add / Edit property modal ─────────────────────────────────────────────────
const PropertyModal = ({ property, neighborhoods, onClose, onSave }) => {
  const isEdit = !!property;
  const [form, setForm] = useState({
    name: property?.name || "",
    address: property?.address || "",
    neighborhood: property?.neighborhood || "",
    room_type: property?.room_type || "Entire home/apt",
    bedrooms: property?.bedrooms || 1,
    photo_url: property?.photo_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form, property?.id);
    setSaving(false);
    onClose();
  };

  const previewSrc =
    form.photo_url ||
    PLACEHOLDER_PHOTOS[previewIdx % PLACEHOLDER_PHOTOS.length];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Property" : "Add New Property"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative h-40 rounded-xl overflow-hidden bg-gray-100 group">
            <img
              src={previewSrc}
              alt="Property"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles size={24} className="text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Photo URL
            </label>
            <input
              value={form.photo_url}
              onChange={(e) => set("photo_url", e.target.value)}
              placeholder="https://... (leave blank for placeholder)"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            {!form.photo_url && (
              <div className="flex gap-2 mt-2">
                {PLACEHOLDER_PHOTOS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewIdx(i)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${i === previewIdx % PLACEHOLDER_PHOTOS.length ? "border-brand" : "border-gray-200"}`}
                    style={{ background: `hsl(${i * 60}, 60%, 70%)` }}
                  />
                ))}
                <span className="text-xs text-gray-400 self-center ml-1">
                  Pick placeholder
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Property Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Cozy Studio in Islington"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Address
            </label>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="e.g. 12 Upper Street, London N1 2XY"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Neighborhood
            </label>
            <div className="relative">
              <select
                value={form.neighborhood}
                onChange={(e) => set("neighborhood", e.target.value)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="">Select neighborhood…</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Room Type
              </label>
              <div className="relative">
                <select
                  value={form.room_type}
                  onChange={(e) => set("room_type", e.target.value)}
                  className="appearance-none w-full pl-4 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Bedrooms
              </label>
              <input
                type="number"
                value={form.bedrooms}
                min={1}
                max={20}
                onChange={(e) => set("bedrooms", Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 bg-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all disabled:opacity-50 shadow-lg shadow-brand/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Property"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Property card ─────────────────────────────────────────────────────────────
// CHANGE 1: Added onOverride to props
const PropertyCard = ({ property, onEdit, onDelete, onSync, onOverride, onIcal }) => {
  const sync = property.sync_settings;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img
          src={
            property.photo_url ||
            `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80`
          }
          alt={property.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold ${
            sync?.enabled || sync?.use_global
              ? "bg-emerald-500 text-white"
              : "bg-gray-800/70 text-white"
          }`}
        >
          {sync?.use_global
            ? "Global Sync"
            : sync?.enabled
              ? "Auto-Sync ON"
              : "Manual"}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 line-clamp-1">
          {property.name}
        </h3>

        <div className="space-y-1.5 mb-4">
          {property.address && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin size={13} className="text-brand shrink-0" />
              <span className="line-clamp-1">{property.address}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Home size={13} className="text-gray-400" />
              {property.room_type}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble size={13} className="text-gray-400" />
              {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {!sync?.use_global && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 bg-gray-50 rounded-lg px-3 py-2">
            <Shield size={12} className="text-brand" />
            <span>
              £{sync?.min_price} – £{sync?.max_price} guardrail
            </span>
          </div>
        )}

        {/* Price Overrides button */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onOverride(property)}
            className="flex-1 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-1.5"
          >
            <CalendarDays size={14} />
            Price Overrides
          </button>
        </div>

        {/* iCal Button */}
        <button
          onClick={() => onIcal(property)}
          className="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 mb-2"
        >
          <Link size={14} />
          iCal Sync
        </button>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onSync(property)}
            className="flex-1 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-rose-600 transition-all flex items-center justify-center gap-1.5"
          >
            <Shield size={14} />
            Sync Settings
          </button>
          <button
            onClick={() => onEdit(property)}
            className="p-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-all"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(property.id)}
            className="p-2 border border-red-100 text-red-400 rounded-lg hover:bg-red-50 transition-all"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const { user } = useUser();
  const userId = user?.id || "demo-user";

  const [properties, setProperties] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [syncProp, setSyncProp] = useState(null);
  // CHANGE 3: Added overrideProp state
  const [overrideProp, setOverrideProp] = useState(null);
  const [icalProp, setIcalProp] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProperties = () => {
    fetch(`${BASE_URL}/api/v1/properties/${userId}`)
      .then((r) => r.json())
      .then((d) => setProperties(d.properties || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProperties();
    fetch(`${BASE_URL}/api/v1/revpar/neighborhoods`)
      .then((r) => r.json())
      .then((d) => setNeighborhoods(d.neighborhoods || []));
    fetch(`${BASE_URL}/api/v1/sync/settings/${userId}`)
      .then((r) => r.json())
      .then(setGlobalSettings);
  }, [userId]);

  const handleSaveProperty = async (form, propertyId) => {
    const url = propertyId
      ? `${BASE_URL}/api/v1/properties/${userId}/${propertyId}`
      : `${BASE_URL}/api/v1/properties/${userId}`;
    const method = propertyId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      showToast(
        "success",
        propertyId ? "Property updated!" : "Property added!",
      );
      fetchProperties();
    } else {
      showToast("error", "Something went wrong.");
    }
  };

  const handleDelete = async (propertyId) => {
    if (!confirm("Delete this property? This cannot be undone.")) return;
    const res = await fetch(
      `${BASE_URL}/api/v1/properties/${userId}/${propertyId}`,
      { method: "DELETE" },
    );
    const data = await res.json();
    if (data.success) {
      showToast("success", "Property deleted.");
      fetchProperties();
    }
  };

  const handleSaveSyncSettings = async (propertyId, settings) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/properties/${propertyId}/sync-settings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      },
    );
    const data = await res.json();
    if (data.success) {
      showToast("success", "Sync settings saved!");
      fetchProperties();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="text-brand" size={32} />
            My Properties
          </h1>
          <p className="text-gray-500 mt-2">
            Manage your portfolio. Each property can have independent sync
            settings.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProp(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-brand/20"
        >
          <Plus size={18} /> Add Property
        </button>
      </div>

      {/* Global defaults banner */}
      {globalSettings && (
        <div className="flex items-center gap-4 p-4 bg-gray-900 text-white rounded-2xl">
          <Globe size={20} className="text-brand shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Global Defaults</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Auto-sync:{" "}
              <strong
                className={
                  globalSettings.enabled ? "text-emerald-400" : "text-gray-400"
                }
              >
                {globalSettings.enabled ? "ON" : "OFF"}
              </strong>
              {" · "}Price range:{" "}
              <strong className="text-white">
                £{globalSettings.min_price} – £{globalSettings.max_price}
              </strong>
              {" · "}Area:{" "}
              <strong className="text-white">
                {globalSettings.neighborhood || "Not set"}
              </strong>
            </p>
          </div>
          <span className="text-xs text-gray-500">
            Applied to all properties using global settings
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
          <span className="font-medium">Loading properties…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && properties.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No properties yet
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Add your first property to start managing pricing.
          </p>
          <button
            onClick={() => {
              setEditingProp(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-rose-600 transition-all"
          >
            <Plus size={16} /> Add Your First Property
          </button>
        </div>
      )}

      {/* Property grid */}
      {!loading && properties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              onEdit={(p) => {
                setEditingProp(p);
                setShowModal(true);
              }}
              onDelete={handleDelete}
              onSync={(p) => setSyncProp(p)}
              // CHANGE 4: Pass onOverride handler
              onOverride={(p) => setOverrideProp(p)}
              onIcal={(p) => setIcalProp(p)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <PropertyModal
          property={editingProp}
          neighborhoods={neighborhoods}
          onClose={() => {
            setShowModal(false);
            setEditingProp(null);
          }}
          onSave={handleSaveProperty}
        />
      )}

      {/* iCal Drawer */}
      {icalProp && (
        <ICalDrawer
          property={icalProp}
          onClose={() => setIcalProp(null)}
        />
      )}

      {/* CHANGE 5: Price Overrides drawer */}
      {overrideProp && (
        <PriceOverridesDrawer
          property={overrideProp}
          onClose={() => setOverrideProp(null)}
        />
      )}

      {/* Sync settings drawer */}
      {syncProp && (
        <SyncDrawer
          property={syncProp}
          globalSettings={globalSettings}
          onClose={() => setSyncProp(null)}
          onSave={handleSaveSyncSettings}
        />
      )}
    </div>
  );
}
