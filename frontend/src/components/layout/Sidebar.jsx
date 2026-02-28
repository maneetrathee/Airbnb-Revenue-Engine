import { Home, LineChart, Map, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Market Intel", path: "/market", icon: LineChart },
    { name: "Property Map", path: "/map", icon: Map },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="w-64 bg-dark text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-20">
      {/* Logo Area */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-gray-800">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-brand/30">
          R
        </div>
        <span className="text-xl font-bold tracking-tight">RevEngine</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isActive
                  ? "bg-brand text-white shadow-md shadow-brand/20"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-gray-800 text-xs text-gray-500 font-medium">
        © 2026 RevEngine AI
      </div>
    </div>
  );
};

export default Sidebar;
