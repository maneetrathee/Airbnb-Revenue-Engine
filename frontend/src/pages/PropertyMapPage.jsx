import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Map, Layers, TrendingUp, Percent, PoundSterling, Building2, X } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const BASE_URL = import.meta.env.VITE_API_URL || "";

const MODES = [
  { key: "avg_revpar",    label: "RevPAR",     icon: TrendingUp,    unit: "£" },
  { key: "avg_occupancy", label: "Occupancy",  icon: Percent,       unit: "%"  },
  { key: "avg_price",     label: "Avg Price",  icon: PoundSterling, unit: "£" },
  { key: "listing_count", label: "Listings",   icon: Building2,     unit: ""   },
];

// Colour scale: low=light yellow → high=deep red
function getColor(norm) {
  if (norm === undefined || norm === null) return "#e5e7eb";
  const stops = [
    [0.0,  [254, 240, 217]],
    [0.25, [253, 204, 138]],
    [0.5,  [252, 141,  89]],
    [0.75, [215,  48,  31]],
    [1.0,  [127,   0,   0]],
  ];
  for (let i = 1; i < stops.length; i++) {
    const [t0, c0] = stops[i - 1];
    const [t1, c1] = stops[i];
    if (norm <= t1) {
      const t = (norm - t0) / (t1 - t0);
      const r = Math.round(c0[0] + t * (c1[0] - c0[0]));
      const g = Math.round(c0[1] + t * (c1[1] - c0[1]));
      const b = Math.round(c0[2] + t * (c1[2] - c0[2]));
      return `rgb(${r},${g},${b})`;
    }
  }
  return `rgb(127,0,0)`;
}

function normalise(value, min, max) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// Recenter map when data loads
function MapCenter() {
  const map = useMap();
  useEffect(() => { map.setView([51.505, -0.09], 10); }, []);
  return null;
}

export default function PropertyMapPage() {
  const { user }  = useUser();
  const userId    = user?.id || "demo-user";

  const [mapData,     setMapData]     = useState(null);
  const [geoJson,     setGeoJson]     = useState(null);
  const [properties,  setProperties]  = useState([]);
  const [mode,        setMode]        = useState("avg_revpar");
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const geoJsonRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/api/v1/competitors/map-data`).then(r => r.json()),
      fetch("/neighbourhoods.geojson").then(r => r.json()),
      fetch(`${BASE_URL}/api/v1/properties/${userId}`).then(r => r.json()),
    ]).then(([md, gj, pr]) => {
      setMapData(md);
      setGeoJson(gj);
      setProperties(pr.properties || []);
      setLoading(false);
    });
  }, [userId]);

  // Build lookup: neighbourhood name → data
  const lookup = {};
  if (mapData) {
    mapData.neighbourhoods.forEach(n => { lookup[n.neighbourhood] = n; });
  }

  // Get min/max for current mode for normalisation
  const modeValues = mapData
    ? mapData.neighbourhoods.map(n => n[mode]).filter(v => v > 0)
    : [];
  const modeMin = modeValues.length ? Math.min(...modeValues) : 0;
  const modeMax = modeValues.length ? Math.max(...modeValues) : 1;

  const currentMode = MODES.find(m => m.key === mode);

  const styleFeature = (feature) => {
    const name = feature.properties.neighbourhood;
    const data = lookup[name];
    const val  = data?.[mode] || 0;
    const norm = normalise(val, modeMin, modeMax);
    return {
      fillColor:   getColor(val > 0 ? norm : null),
      fillOpacity: val > 0 ? 0.75 : 0.15,
      color:       "#fff",
      weight:      1.5,
    };
  };

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.neighbourhood;
    const data = lookup[name];

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, color: "#111", fillOpacity: 0.9 });
      },
      mouseout: (e) => {
        e.target.setStyle(styleFeature(feature));
      },
      click: () => {
        setSelected(data ? { ...data } : { neighbourhood: name, no_data: true });
      },
    });
  };

  const fmt  = (n, unit) => unit === "£" ? `£${Number(n).toFixed(0)}` : unit === "%" ? `${Number(n).toFixed(1)}%` : Number(n).toLocaleString();

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 80px)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Map className="text-brand" size={28} />
            Property Map
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            London neighbourhood performance — click any borough to explore
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === m.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}>
                <Icon size={14} />{m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">

        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative z-0">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium">Loading map data…</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[51.505, -0.09]}
              zoom={10}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap &copy; CARTO"
              />
              <MapCenter />

              {/* GeoJSON choropleth */}
              {geoJson && (
                <GeoJSON
                  key={mode}
                  data={geoJson}
                  style={styleFeature}
                  onEachFeature={onEachFeature}
                />
              )}

              {/* User's properties as markers */}
              {properties.map(p => {
                if (!p.neighborhood) return null;
                // Find a rough centroid from GeoJSON for this neighbourhood
                const feature = geoJson?.features?.find(
                  f => f.properties.neighbourhood === p.neighborhood
                );
                if (!feature) return null;
                // Use first coordinate pair as rough center
                const coords = feature.geometry.type === "Polygon"
                  ? feature.geometry.coordinates[0]
                  : feature.geometry.coordinates[0][0];
                const lats = coords.map(c => c[1]);
                const lngs = coords.map(c => c[0]);
                const lat  = lats.reduce((a, b) => a + b, 0) / lats.length;
                const lng  = lngs.reduce((a, b) => a + b, 0) / lngs.length;

                const myIcon = L.divIcon({
                  className: "",
                  html: `<div style="background:#FF385C;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">R</div>`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                });

                return (
                  <Marker key={p.id} position={[lat, lng]} icon={myIcon}>
                    <Popup>
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{p.neighborhood}</div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}

          {/* Legend */}
          {!loading && (
            <div className="absolute bottom-6 left-6 z-[1000] bg-white rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {currentMode?.label}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{fmt(modeMin, currentMode?.unit)}</span>
                <div className="w-24 h-3 rounded-full" style={{
                  background: "linear-gradient(to right, rgb(254,240,217), rgb(252,141,89), rgb(127,0,0))"
                }} />
                <span className="text-xs text-gray-400">{fmt(modeMax, currentMode?.unit)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <div style={{ background: "#FF385C", borderRadius: "50%", width: 10, height: 10, border: "1.5px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                <span className="text-xs text-gray-400">Your properties</span>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-72 flex flex-col gap-3 overflow-y-auto">
          {selected ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 animate-in slide-in-from-right duration-200">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base leading-tight pr-2">
                  {selected.neighbourhood}
                </h3>
                <button onClick={() => setSelected(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {selected.no_data ? (
                <p className="text-sm text-gray-400">No market data available for this area.</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Avg RevPAR",    value: `£${selected.avg_revpar?.toFixed(2) || "—"}`,  icon: TrendingUp,    color: "text-rose-500" },
                    { label: "Avg Occupancy", value: `${selected.avg_occupancy?.toFixed(1) || "—"}%`, icon: Percent,       color: "text-violet-500" },
                    { label: "Avg Price",     value: `£${selected.avg_price?.toFixed(0) || "—"}`,    icon: PoundSterling, color: "text-blue-500" },
                    { label: "Median Price",  value: `£${selected.median_price?.toFixed(0) || "—"}`, icon: PoundSterling, color: "text-amber-500" },
                    { label: "Listings",      value: selected.listing_count?.toLocaleString() || "—", icon: Building2,     color: "text-emerald-500" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={color} />
                        <span className="text-sm text-gray-500">{label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{value}</span>
                    </div>
                  ))}

                  {/* RevPAR bar */}
                  <div className="mt-2 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1.5">RevPAR vs best area</p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                        style={{ width: `${normalise(selected.avg_revpar, modeMin, modeMax) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>£{modeMin.toFixed(0)}</span>
                      <span>£{modeMax.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 p-5 text-center text-gray-400">
              <Map size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Click a borough</p>
              <p className="text-xs mt-1">to see detailed market stats</p>
            </div>
          )}

          {/* Top 5 boroughs */}
          {mapData && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Top Areas by {currentMode?.label}
              </p>
              <div className="space-y-2">
                {[...mapData.neighbourhoods]
                  .sort((a, b) => (b[mode] || 0) - (a[mode] || 0))
                  .slice(0, 5)
                  .map((n, i) => (
                    <div key={n.neighbourhood}
                      onClick={() => setSelected(n)}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
                      <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{n.neighbourhood}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {currentMode?.unit === "£" ? "£" : ""}{Number(n[mode]).toFixed(currentMode?.unit === "%" ? 1 : 0)}{currentMode?.unit === "%" ? "%" : ""}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
