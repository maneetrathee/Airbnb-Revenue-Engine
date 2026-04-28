import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import DashboardLayout from "./components/layout/DashboardLayout";
import PricingDashboard from "./pages/PricingDashboard";
import Onboarding from "./pages/Onboarding";
import RevPARDashboard from "./pages/RevPARDashboard";
import SettingsPage from "./pages/SettingsPage";
import PropertiesPage from "./pages/PropertiesPage";
import ArbitragePage from "./pages/ArbitragePage";
import MLPredictionPage from "./pages/MLPredictionPage";
import MLComparisonPage from "./pages/MLComparisonPage";
import PropertyMapPage from "./pages/PropertyMapPage";
import SentimentPage from "./pages/SentimentPage";
import CompetitorDashboard from "./pages/CompetitorDashboard";

const LoginPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-in fade-in duration-500">
    <div className="mb-8 text-center">
      <div className="w-14 h-14 bg-[#FF385C] rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shadow-[#FF385C]/30 mx-auto mb-5 text-3xl">
        R
      </div>
      <h1 className="text-3xl font-black text-gray-900 tracking-tight">
        Welcome to RevEngine AI
      </h1>
      <p className="text-gray-500 mt-2 font-medium">
        Log in to access your revenue dashboard.
      </p>
    </div>
    <SignIn
      routing="hash"
      appearance={{
        variables: {
          colorPrimary: "#FF385C",
          borderRadius: "0.75rem",
          colorBackground: "#ffffff",
          colorText: "#111827",
        },
        elements: {
          card: "shadow-2xl border border-gray-100 rounded-2xl p-2 bg-white",
          headerTitle: "hidden",
          formButtonPrimary:
            "bg-[#FF385C] hover:bg-rose-600 text-white font-bold shadow-md transition-all h-11",
          socialButtonsBlockButton:
            "border border-gray-200 hover:bg-gray-50 rounded-xl h-11 font-medium text-gray-700 transition-all",
          formFieldInput:
            "rounded-xl border-gray-200 focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all h-11",
          footerActionLink: "text-[#FF385C] hover:text-rose-600 font-bold",
        },
      }}
    />
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/sign-in/*" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <>
              <SignedOut>
                <LoginPage />
              </SignedOut>
              <SignedIn>
                <Routes>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/ml/comparison" element={<MLComparisonPage />} />
                  <Route
                    path="/*"
                    element={
                      <DashboardLayout>
                        <Routes>
                          <Route path="/ml" element={<MLPredictionPage />} />
                          <Route path="/" element={<PricingDashboard />} />
                          <Route path="/market" element={<RevPARDashboard />} />
                          <Route
                            path="/properties"
                            element={<PropertiesPage />}
                          />
                          <Route
                            path="/arbitrage"
                            element={<ArbitragePage />}
                          />

                          <Route
                            path="/competitors"
                            element={<CompetitorDashboard />}
                          />

                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/map" element={<PropertyMapPage />} />
                          <Route
                            path="*"
                            element={
                              <div className="flex items-center justify-center h-96 text-red-400 text-xl font-medium">
                                404 - Page Not Found
                              </div>
                            }
                          />
                          <Route
                            path="/sentiment"
                            element={<SentimentPage />}
                          />
                        </Routes>
                      </DashboardLayout>
                    }
                  />
                </Routes>
              </SignedIn>
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
