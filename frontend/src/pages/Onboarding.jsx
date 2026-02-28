import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Home, Building2, TrendingUp, Loader2 } from "lucide-react";
import { useState } from "react";

const Onboarding = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);

  const handleSelectRole = async (roleId) => {
    if (!user) return;
    setLoadingRole(roleId);

    // 1. Package the data from Clerk
    const userData = {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || "no-email",
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      role: roleId,
    };

    try {
      // 2. Send it to your FastAPI backend
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/users/onboard",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save user role");
      }

      // 3. Success! Send them to the dashboard
      navigate("/");
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Something went wrong saving your profile. Please try again.");
      setLoadingRole(null);
    }
  };

  const roles = [
    {
      id: "host",
      title: "Individual Host",
      description:
        "I own or co-host 1-3 properties and want to maximize my nightly rate.",
      icon: Home,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "hover:border-blue-500 focus:ring-blue-500",
    },
    {
      id: "manager",
      title: "Property Manager",
      description:
        "I manage a large portfolio of properties and need bulk market intel.",
      icon: Building2,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "hover:border-purple-500 focus:ring-purple-500",
    },
    {
      id: "investor",
      title: "Real Estate Investor",
      description:
        "I am analyzing markets to buy new properties and need ROI data.",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
      borderColor: "hover:border-emerald-500 focus:ring-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">
            Welcome to RevEngine, {user?.firstName || "there"}! 👋
          </h1>
          <p className="text-xl text-gray-500 font-medium">
            To personalize your AI dashboard, tell us how you plan to use the
            platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            const isLoading = loadingRole === role.id;

            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                disabled={loadingRole !== null}
                className={`flex flex-col text-left p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm hover:shadow-xl transition-all outline-none focus:ring-4 focus:ring-opacity-50 relative overflow-hidden ${role.borderColor} ${loadingRole !== null && !isLoading ? "opacity-50" : ""}`}
              >
                <div
                  className={`w-16 h-16 ${role.bgColor} rounded-2xl flex items-center justify-center mb-6`}
                >
                  {isLoading ? (
                    <Loader2
                      size={32}
                      className={`animate-spin ${role.color}`}
                    />
                  ) : (
                    <Icon size={32} className={role.color} />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {role.title}
                </h2>
                <p className="text-gray-500 font-medium leading-relaxed">
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
