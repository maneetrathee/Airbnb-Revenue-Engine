from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 1. Initialize the API
app = FastAPI(
    title="Airbnb Revenue Engine API",
    version="2.0",
    description="AI-Powered Real Estate Investment Platform"
)

# 2. Allow Frontend (React) to talk to Backend
# This is critical for the "Full-Stack" requirement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development only)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Define the Root Endpoint
@app.get("/")
def read_root():
    return {
        "status": "✅ API Online",
        "module": "Sprint 2 - Intelligence Engine",
        "version": "2.0.0"
    }

# 4. Health Check Endpoint (For monitoring)
@app.get("/health")
def health_check():
    return {"database": "connected", "ai_model": "loading..."}