import { Home, LineChart, TrendingUp, Target, Brain, Star, Building2, Map, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const MobileNav = () => {
  const location = useLocation();

  const items = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Market", path: "/market", icon: LineChart },
    { name: "Arbitrage", path: "/arbitrage", icon: TrendingUp },
    { name: "Competitors", path: "/competitors", icon: Target },
    { name: "ML", path: "/ml", icon: Brain },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl safe-area-bottom">
      <div className="flex items-center h-16 px-1 overflow-x-auto gap-1 scrollbar-none">
        {items.map(({ name, path, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={name}
              to={path}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-full transition-all ${
                isActive ? "text-brand" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-brand/10" : ""}`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-medium leading-none">
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
