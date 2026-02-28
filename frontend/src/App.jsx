import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import DashboardLayout from "./components/layout/DashboardLayout";
import PricingDashboard from "./pages/PricingDashboard";
import Onboarding from "./pages/Onboarding"; // <-- Added the Onboarding import

// A beautiful, customized login page container
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
          headerSubtitle: "text-gray-500 text-center font-medium mb-2",
          formButtonPrimary:
            "bg-[#FF385C] hover:bg-rose-600 text-white font-bold shadow-md transition-all h-11",
          socialButtonsBlockButton:
            "border border-gray-200 hover:bg-gray-50 rounded-xl h-11 font-medium text-gray-700 transition-all",
          formFieldInput:
            "rounded-xl border-gray-200 focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all h-11",
          footerActionLink: "text-[#FF385C] hover:text-rose-600 font-bold",
          dividerLine: "bg-gray-200",
          dividerText: "text-gray-400 font-medium",
        },
      }}
    />
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTE: The Login Screen */}
        <Route path="/sign-in/*" element={<LoginPage />} />

        {/* PROTECTED ROUTES: Only visible if SignedIn */}
        <Route
          path="/*"
          element={
            <>
              {/* If they are NOT logged in, show the Login Page */}
              <SignedOut>
                <LoginPage />
              </SignedOut>

              {/* If they ARE logged in, we check which page they want */}
              <SignedIn>
                <Routes>
                  {/* FULL SCREEN ONBOARDING - Notice it is OUTSIDE the DashboardLayout */}
                  <Route path="/onboarding" element={<Onboarding />} />

                  {/* DASHBOARD ROUTES - Wrapped IN the DashboardLayout */}
                  <Route
                    path="/*"
                    element={
                      <DashboardLayout>
                        <Routes>
                          <Route path="/" element={<PricingDashboard />} />
                          <Route
                            path="/market"
                            element={
                              <div className="flex items-center justify-center h-96 text-gray-400 text-xl font-medium">
                                Market Intel Page (Coming Soon...)
                              </div>
                            }
                          />
                          <Route
                            path="/map"
                            element={
                              <div className="flex items-center justify-center h-96 text-gray-400 text-xl font-medium">
                                Property Map Page (Coming Soon...)
                              </div>
                            }
                          />
                          <Route
                            path="/settings"
                            element={
                              <div className="flex items-center justify-center h-96 text-gray-400 text-xl font-medium">
                                Settings Page (Coming Soon...)
                              </div>
                            }
                          />
                          <Route
                            path="*"
                            element={
                              <div className="flex items-center justify-center h-96 text-red-400 text-xl font-medium">
                                404 - Page Not Found
                              </div>
                            }
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
