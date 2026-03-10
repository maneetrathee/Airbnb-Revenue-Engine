import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

const ACTION_CONFIG = {
  DROP_PRICE: {
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    iconBg: "bg-red-600",
    Icon: TrendingDown,
    verb: "Drop Price",
    badge: "bg-red-100 text-red-700",
  },
  HOLD_PRICE: {
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-500",
    Icon: Minus,
    verb: "Hold Price",
    badge: "bg-amber-100 text-amber-700",
  },
  RAISE_PRICE: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-600",
    Icon: TrendingUp,
    verb: "Raise Price",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

const StatRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-bold text-gray-900">{value}</span>
  </div>
);

const RevPAROptimizer = ({ data }) => {
  if (!data) return null;
  const cfg = ACTION_CONFIG[data.action];
  const { Icon } = cfg;
  const uplift = data.projected.revpar_uplift;
  const isPositive = uplift > 0;

  return (
    <div className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-6`}>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`${cfg.iconBg} rounded-xl p-2 flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-bold uppercase tracking-widest ${cfg.color} mb-0.5`}>
            AI Recommendation
          </p>
          <h3 className="text-xl font-black text-gray-900">{cfg.verb}</h3>
        </div>

        {/* RevPAR uplift badge */}
        {uplift !== 0 && (
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
              isPositive ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
            }`}
          >
            {isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            £{Math.abs(uplift).toFixed(2)} RevPAR
          </div>
        )}
      </div>

      {/* Reasoning */}
      <p className="text-gray-600 text-sm leading-relaxed mb-5">
        {data.reasoning}
      </p>

      {/* Current vs Projected */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Current", d: data.current },
          { label: "Projected", d: data.projected },
        ].map(({ label, d }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              {label}
            </p>
            <StatRow label="Nightly Rate" value={`£${d.adr}`} />
            <StatRow label="Occupancy" value={`${d.occupancy_rate}%`} />
            <StatRow label="RevPAR" value={`£${d.revpar}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevPAROptimizer;
