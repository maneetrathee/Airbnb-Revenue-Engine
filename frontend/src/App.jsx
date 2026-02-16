import { useEffect, useState } from "react";
import { Activity, Server, Database } from "lucide-react";

function App() {
  const [status, setStatus] = useState("Loading...");

  // This function runs when the page loads
  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch((err) => setStatus("❌ Error: Backend Disconnected"));
  }, []);

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {/* Header Section */}
      <header
        style={{
          borderBottom: "1px solid #eee",
          paddingBottom: "20px",
          marginBottom: "40px",
        }}
      >
        <h1 style={{ color: "#FF385C", fontSize: "2.5rem" }}>
          London Revenue Engine
        </h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>
          AI-Powered Real Estate Investment Platform
        </p>
      </header>

      {/* System Status Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}
      >
        {/* Card 1: Backend Status */}
        <div style={cardStyle}>
          <Server size={32} color="#4F46E5" />
          <h3>Backend API</h3>
          <p
            style={{
              fontWeight: "bold",
              color: status.includes("Online") ? "green" : "red",
            }}
          >
            {status}
          </p>
        </div>

        {/* Card 2: Database Status */}
        <div style={cardStyle}>
          <Database size={32} color="#059669" />
          <h3>Database</h3>
          <p>Active (PostgreSQL)</p>
        </div>

        {/* Card 3: AI Model Status */}
        <div style={cardStyle}>
          <Activity size={32} color="#D97706" />
          <h3>AI Engine</h3>
          <p>Ready for Sprint 2</p>
        </div>
      </div>
    </div>
  );
}

// Simple styling object for the cards
const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "24px",
  textAlign: "center",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
};

export default App;
