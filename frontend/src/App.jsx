import { useState } from "react";
import { Sparkles, Search, Home, PoundSterling, Loader2 } from "lucide-react";

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
      // Talk to your FastAPI Backend
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/predict-price?description=${encodeURIComponent(description)}`,
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(
        "❌ Failed to connect to the AI Engine. Is the backend running?",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "800px",
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
          AI Pricing Engine
        </h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>
          Describe your property to get an instant, AI-driven nightly rate based
          on real London market data.
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
          placeholder="e.g., A cozy 1-bedroom apartment in Notting Hill with a beautiful garden..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            height: "100px",
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
          {loading ? "Analyzing London Market..." : "Generate Pricing"}
        </button>
        {error && (
          <p style={{ color: "red", marginTop: "12px", textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div style={{ animation: "fadeIn 0.5s" }}>
          {/* Main Price Card */}
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              marginBottom: "30px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#1e3a8a",
                fontSize: "1.2rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Cold Start Recommendation
            </h2>
            <div
              style={{
                fontSize: "4rem",
                fontWeight: "900",
                color: "#1d4ed8",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <PoundSterling size={48} />
              {result.recommended_price.toFixed(2)}
              <span
                style={{
                  fontSize: "1.5rem",
                  color: "#60a5fa",
                  fontWeight: "normal",
                  alignSelf: "flex-end",
                  paddingBottom: "12px",
                }}
              >
                /night
              </span>
            </div>
          </div>

          {/* Similar Listings */}
          <h3
            style={{
              borderBottom: "2px solid #eee",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            Most Similar Properties Found
          </h3>
          <div style={{ display: "grid", gap: "16px" }}>
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
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Home color="#9ca3af" size={24} />
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        color: "#111827",
                      }}
                    >
                      {listing.name}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.85rem",
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
                </div>
                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    color: "#374151",
                  }}
                >
                  £{listing.price_base}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
