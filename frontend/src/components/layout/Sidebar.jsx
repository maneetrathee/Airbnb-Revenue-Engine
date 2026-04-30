import {
  Target, MessageSquare, Home, LineChart, Map,
  Settings, Building2, TrendingUp, Trophy, Sun, Moon, X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const navItems = [
  { name: "Dashboard",        path: "/",             icon: Home,          activeClass: "bg-[#FF385C]" },
  { name: "Market Intel",     path: "/market",        icon: LineChart,     activeClass: "bg-violet-500" },
  { name: "Arbitrage",        path: "/arbitrage",     icon: TrendingUp,    activeClass: "bg-emerald-500" },
  { name: "Competitors",      path: "/competitors",   icon: Target,        activeClass: "bg-orange-500" },
  { name: "Sentiment",        path: "/sentiment",     icon: MessageSquare, activeClass: "bg-sky-500" },
  { name: "Properties",       path: "/properties",    icon: Building2,     activeClass: "bg-teal-500" },
  { name: "Property Map",     path: "/map",           icon: Map,           activeClass: "bg-cyan-500" },
  { name: "Settings",         path: "/settings",      icon: Settings,      activeClass: "bg-gray-500" },
  { name: "Model Comparison", path: "/ml/comparison", icon: Trophy,        activeClass: "bg-amber-500" },
];

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { dark, toggle } = useTheme();

  return (
    <div style={{ backgroundColor: "#0f1117" }} className="w-64 text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-20">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-gray-800">
        <div className="w-8 h-8 bg-[#FF385C] rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
          R
        </div>
        <span className="text-xl font-bold tracking-tight">RevEngine</span>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => onClose && onClose()}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium shadow-md ${
                isActive
                  ? `${item.activeClass} text-white`
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all font-medium text-sm"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
        <p className="text-xs text-gray-600 px-1">© 2026 RevEngine AI</p>
      </div>
    </div>
  );
};

export default Sidebar;
