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

// New sub-components (Feature 2 additions)
import KPIGrid from "../components/dashboard/KPIGrid";
import Forecast from "../components/dashboard/Forecast";
import CompetitorList from "../components/dashboard/CompetitorList";
import CompetitorMap from "../components/dashboard/CompetitorMap";
import PropertyInput from "../components/dashboard/PropertyInput";

const PricingDashboard = () => {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Original fetch logic — untouched
  const handlePredict = async () => {
    if (!description) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        import.meta.env.VITE_API_URL + `/api/v1/predict-price?description=${encodeURIComponent(description)}`,
      );
      const data = await response.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (err) {
      setError("Failed to connect to the AI Engine.");
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

      {/* Input Section — now uses PropertyInput component */}
      <PropertyInput
        value={description}
        onChange={setDescription}
        onSubmit={handlePredict}
        loading={loading}
      />

      {error && (
        <p className="text-red-500 text-center font-medium">{error}</p>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

          {/* Feature 2: KPI Summary Row */}
          <KPIGrid result={result} />

          {/* Feature 2: Enhanced Forecast with mini bars */}
          <Forecast forecast={result.forecast} />

          {/* Map and Comps Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feature 2: CompetitorList component */}
            <CompetitorList listings={result.similar_listings} />

            {/* Feature 2: CompetitorMap component */}
            <CompetitorMap listings={result.similar_listings} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingDashboard;
