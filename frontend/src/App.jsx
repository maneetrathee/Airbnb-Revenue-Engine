import { useState } from "react";
import {
  Sparkles,
  Search,
  Home,
  PoundSterling,
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

function App() {
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
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "40px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1
          style={{
            color: "#FF385C",
            fontSize: "2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <Sparkles size={36} />
          AI Revenue Engine
        </h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>
          Dynamic pricing powered by Vector Search & Market Rules
        </p>
      </div>

      {/* Input Section */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          marginBottom: "30px",
        }}
      >
        <textarea
          placeholder="Describe your property (e.g., Luxury penthouse with skyline views...)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            height: "80px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "1rem",
            marginBottom: "16px",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handlePredict}
          disabled={loading || !description}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: loading ? "#ccc" : "#FF385C",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "1.1rem",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <Search size={24} />
          )}
          {loading ? "Calculating..." : "Generate Smart Pricing"}
        </button>
      </div>

      {/* Results Section */}
      {result && (
        <div style={{ animation: "fadeIn 0.5s" }}>
          {/* Base Price Card */}
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "20px",
              borderRadius: "12px",
              textAlign: "center",
              marginBottom: "30px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#1e3a8a",
                fontSize: "1.1rem",
                textTransform: "uppercase",
              }}
            >
              AI Base Price (Calculated from Comps)
            </h2>
            <div
              style={{ fontSize: "3rem", fontWeight: "900", color: "#1d4ed8" }}
            >
              £{result.base_price.toFixed(2)}
            </div>
          </div>

          {/* 7-Day Dynamic Forecast */}
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "2px solid #eee",
              paddingBottom: "10px",
            }}
          >
            <Calendar size={24} color="#FF385C" /> 7-Day Dynamic Forecast
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "12px",
              marginBottom: "40px",
            }}
          >
            {result.forecast.map((day, idx) => (
              <div
                key={idx}
                style={{
                  padding: "16px 10px",
                  borderRadius: "8px",
                  border:
                    day.day === "Fri" || day.day === "Sat"
                      ? "2px solid #FF385C"
                      : "1px solid #e5e7eb",
                  backgroundColor:
                    day.day === "Fri" || day.day === "Sat"
                      ? "#fff1f2"
                      : "white",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "#6b7280",
                    fontWeight: "bold",
                  }}
                >
                  {day.day}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                    marginBottom: "8px",
                  }}
                >
                  {day.date}
                </div>
                <div
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: "bold",
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  £{day.price.toFixed(0)}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: day.tags[0].includes("+") ? "#059669" : "#6b7280",
                  }}
                >
                  {day.tags[0]}
                </div>
              </div>
            ))}
          </div>

          {/* Map and Comps Split View */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            {/* Left: List of Comps */}
            <div>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: "2px solid #eee",
                  paddingBottom: "10px",
                }}
              >
                <Home size={24} color="#FF385C" /> Top Market Comparables
              </h3>
              <div style={{ display: "grid", gap: "12px" }}>
                {result.similar_listings.map((listing, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      backgroundColor: "white",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem" }}>
                        {listing.name}
                      </h4>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#059669",
                          backgroundColor: "#d1fae5",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {(listing.similarity * 100).toFixed(1)}% Match
                      </span>
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>
                      £{listing.price_base}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Interactive Map */}
            <div>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: "2px solid #eee",
                  paddingBottom: "10px",
                }}
              >
                <MapPin size={24} color="#FF385C" /> Competitor Locations
              </h3>
              {/* We center the map on the #1 closest match */}
              <div
                style={{
                  height: "400px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                }}
              >
                <MapContainer
                  center={[
                    result.similar_listings[0].latitude,
                    result.similar_listings[0].longitude,
                  ]}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  {result.similar_listings.map((listing, index) => (
                    <Marker
                      key={index}
                      position={[listing.latitude, listing.longitude]}
                    >
                      <Popup>
                        <strong>{listing.name}</strong>
                        <br />
                        Price: £{listing.price_base}
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
}

export default App;
