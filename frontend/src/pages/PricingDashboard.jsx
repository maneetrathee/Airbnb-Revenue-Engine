import { useState } from "react";
import {
  Sparkles,
  Search,
  Home,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet icons in React
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const PricingDashboard = () => {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handlePredict = async () => {
    if (!description) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/predict-price?description=${encodeURIComponent(description)}`,
      );
      const data = await response.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (err) {
      setError("❌ Failed to connect to the AI Engine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Sparkles className="text-brand" size={32} />
          AI Revenue Engine
        </h1>
        <p className="text-gray-500 mt-2">
          Dynamic pricing powered by Vector Search & Market Rules
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <textarea
          placeholder="Describe your property (e.g., Luxury penthouse with skyline views...)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none mb-4 transition-all"
        />
        <button
          onClick={handlePredict}
          disabled={loading || !description}
          className={`w-full py-4 rounded-xl text-lg font-bold flex justify-center items-center gap-2 transition-all ${
            loading || !description
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-brand text-white hover:bg-rose-600 shadow-lg shadow-brand/30"
          }`}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <Search size={24} />
          )}
          {loading ? "Analyzing London Market..." : "Generate Smart Pricing"}
        </button>
        {error && (
          <p className="text-red-500 text-center mt-4 font-medium">{error}</p>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Base Price Card */}
          <div className="bg-blue-50 border border-blue-200 p-8 rounded-2xl text-center shadow-sm">
            <h2 className="text-blue-900 font-bold uppercase tracking-wide mb-2 text-sm">
              AI Base Price (Calculated from Comps)
            </h2>
            <div className="text-5xl font-black text-blue-700">
              £{result.base_price.toFixed(2)}
            </div>
          </div>

          {/* 7-Day Dynamic Forecast */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              <Calendar className="text-brand" size={24} /> 7-Day Dynamic
              Forecast
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {result.forecast.map((day, idx) => {
                const isWeekend = day.day === "Fri" || day.day === "Sat";
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl text-center border ${
                      isWeekend
                        ? "border-brand bg-rose-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="font-bold text-gray-600 text-sm">
                      {day.day}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{day.date}</div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      £{day.price.toFixed(0)}
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase ${
                        day.tags[0].includes("+")
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }`}
                    >
                      {day.tags[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map and Comps Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: List of Comps */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                <Home className="text-brand" size={24} /> Top Market Comparables
              </h3>
              <div className="space-y-3">
                {result.similar_listings.map((listing, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">
                        {listing.name}
                      </h4>
                      <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-bold">
                        {(listing.similarity * 100).toFixed(1)}% Match
                      </span>
                    </div>
                    <div className="text-lg font-black text-gray-900">
                      £{listing.price_base}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Interactive Map */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                <MapPin className="text-brand" size={24} /> Competitor Locations
              </h3>
              <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
                <MapContainer
                  center={[
                    result.similar_listings[0].latitude,
                    result.similar_listings[0].longitude,
                  ]}
                  zoom={12}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                  />
                  {result.similar_listings.map((listing, index) => (
                    <Marker
                      key={index}
                      position={[listing.latitude, listing.longitude]}
                    >
                      <Popup>
                        <div className="font-bold">{listing.name}</div>
                        <div className="text-brand font-bold mt-1">
                          £{listing.price_base}/night
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingDashboard;
