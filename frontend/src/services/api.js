const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const predictPrice = async (description) => {
  const response = await fetch(
    `${BASE_URL}/api/v1/predict-price?description=${encodeURIComponent(description)}`
  );
  if (!response.ok) throw new Error("Failed to fetch prediction");
  return response.json();
};

export const onboardUser = async (userData) => {
  const response = await fetch(`${BASE_URL}/api/v1/users/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error("Failed to onboard user");
  return response.json();
};

// ── RevPAR endpoints ──────────────────────────────────────────────────────────

export const getNeighborhoods = async () => {
  const response = await fetch(`${BASE_URL}/api/v1/revpar/neighborhoods`);
  if (!response.ok) throw new Error("Failed to fetch neighborhoods");
  return response.json(); // { neighborhoods: [...] }
};

export const getRevPARSummary = async (neighborhood) => {
  const response = await fetch(
    `${BASE_URL}/api/v1/revpar/summary?neighborhood=${encodeURIComponent(neighborhood)}`
  );
  if (!response.ok) throw new Error("Failed to fetch RevPAR summary");
  return response.json();
};

export const getRevPARTrend = async (neighborhood) => {
  const response = await fetch(
    `${BASE_URL}/api/v1/revpar/trend?neighborhood=${encodeURIComponent(neighborhood)}`
  );
  if (!response.ok) throw new Error("Failed to fetch RevPAR trend");
  return response.json();
};

export const getRevPAROptimization = async (neighborhood) => {
  const response = await fetch(
    `${BASE_URL}/api/v1/revpar/optimize?neighborhood=${encodeURIComponent(neighborhood)}`
  );
  if (!response.ok) throw new Error("Failed to fetch optimization");
  return response.json();
};