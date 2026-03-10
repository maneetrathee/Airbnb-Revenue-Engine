import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const MetricCard = ({ label, value, prefix = "", suffix = "", trend, trendValue, icon: Icon, color = "blue" }) => {
  const colorMap = {
    blue:   { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-100"   },
    brand:  { bg: "bg-rose-50",    text: "text-brand",       border: "border-rose-100"   },
    green:  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100"},
    amber:  { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100"  },
    purple: { bg: "bg-purple-50",  text: "text-purple-600",  border: "border-purple-100" },
  };

  const c = colorMap[color] || colorMap.blue;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-gray-400";

  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center shrink-0`}>
            <Icon size={15} className={c.text} />
          </div>
        )}
      </div>
      <div className={`text-3xl font-black ${c.text} tracking-tight mb-2`}>
        {prefix}{value}{suffix}
      </div>
      {trendValue && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          <TrendIcon size={11} />
          <span>{trendValue}</span>
          {trend !== "neutral" && (
            <span className="text-gray-400 font-normal ml-0.5">vs last week</span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
