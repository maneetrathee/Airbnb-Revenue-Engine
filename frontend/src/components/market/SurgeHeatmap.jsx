import { useState, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Flame, Loader2, TrendingUp } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const TIER_STYLES = {
  high:   { bg: "bg-violet-500",  text: "text-white", dot: "bg-violet-500", label: "High Surge (45%+)" },
  medium: { bg: "bg-rose-500",    text: "text-white", dot: "bg-rose-500",   label: "Med Surge (15%+)" },
  normal: { bg: "bg-gray-50",     text: "text-gray-700", dot: "bg-gray-200", label: "Normal" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SurgeHeatmap({ neighborhood, propertyId }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null); // { day, x, y }
  
  // NEW: Booked dates state
  const [bookedDates, setBookedDates] = useState(new Set());

  // Fetch Surge Data
  useEffect(() => {
    if (!neighborhood) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/v1/events/surge?neighborhood=${encodeURIComponent(neighborhood)}&year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [neighborhood, year, month]);

  // NEW: Fetch iCal Bookings
  useEffect(() => {
    if (!propertyId) return;
    fetch(`${BASE_URL}/api/v1/ical/bookings/${propertyId}?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => setBookedDates(new Set(d.booked_dates || [])));
  }, [propertyId, year, month]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthName = new Date(year, month - 1).toLocaleString("en-GB", { month: "long" });

  // Build grid with leading empty cells
  const firstDayOfMonth = data?.days?.[0]
    ? new Date(data.days[0].date).getDay()
    : 0;
  // Convert Sunday=0 to Monday-first (0=Mon)
  const leadingBlanks = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const highCount   = data?.days?.filter(d => d.tier === "high").length   || 0;
  const mediumCount = data?.days?.filter(d => d.tier === "medium").length || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Flame size={20} className="text-red-500" />
            Event & Holiday Surge Heatmap
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Pricing opportunities from events, holidays & demand patterns
          </p>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-4 text-xs font-medium">
          {Object.entries(TIER_STYLES).map(([tier, s]) => (
            <div key={tier} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${s.dot}`} />
              <span className="text-gray-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
        <h3 className="font-bold text-gray-900 text-lg">
          {monthName} {year}
        </h3>
        <button onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Stats bar */}
      {data && !loading && (
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-xs font-bold text-violet-700">{highCount} peak-surge days</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-rose-700">{mediumCount} surge days</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
          <TrendingUp size={12} className="text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">
            {highCount + mediumCount} pricing opportunities
          </span>
        </div>
      </div>
    )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={22} className="animate-spin mr-2" />
          <span className="text-sm">Loading surge data…</span>
        </div>
      )}

      {/* Calendar grid */}
      {!loading && data && (
        <div className="relative">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Leading blanks */}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {/* Days */}
            {data.days.map(d => {
              const s = TIER_STYLES[d.tier];
              return (
                <div
                  key={d.date}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md overflow-hidden ${s.bg} ${s.text}`}
                  onMouseEnter={e => {
                    if (d.tier !== "normal" || d.events.length > 0) {
                      setTooltip({ day: d, rect: e.currentTarget.getBoundingClientRect() });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span className="text-sm font-bold">{d.day}</span>
                  {d.surge_pct > 0 && (
                    <span className="text-xs font-bold opacity-90">+{d.surge_pct}%</span>
                  )}
                  {d.events.length > 0 && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                  )}

                  {/* NEW: Booked Overlay */}
                  {bookedDates.has(d.date) && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-white text-xs font-bold tracking-wider">BOOKED</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div className="fixed z-50 pointer-events-none"
              style={{
                left: tooltip.rect?.left ?? 0,
                top: (tooltip.rect?.top ?? 0) - 80,
              }}>
              <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl min-w-40 max-w-56">
                <p className="font-bold mb-1">
                  {tooltip.day.weekday} {tooltip.day.day} {monthName}
                </p>
                {tooltip.day.tags?.length > 0 && tooltip.day.tags.map((t, i) => (<p key={'t'+i} className="text-purple-300 font-bold">🌉 {t}</p>))}
                  {tooltip.day.events.length > 0
                  ? tooltip.day.events.map((e, i) => (
                      <p key={i} className="text-gray-300">🎉 {e}</p>
                    ))
                  : <p className="text-gray-300">Weekend uplift</p>
                }
                {tooltip.day.surge_pct > 0 && (
                  <p className="text-emerald-400 font-bold mt-1">
                    +{tooltip.day.surge_pct}% suggested price increase
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly event list */}
      {!loading && data && data.days.some(d => d.events.length > 0) && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Events This Month
          </p>
          <div className="space-y-2">
            {data.days
              .filter(d => d.events.length > 0)
              .map(d => (
                <div key={d.date} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${TIER_STYLES[d.tier].dot}`} />
                  <span className="text-sm text-gray-500 w-24 shrink-0">
                    {d.weekday} {d.day} {monthName.slice(0,3)}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {d.events.join(", ")}
                  </span>
                  {d.surge_pct > 0 && (
                    <span className="ml-auto text-xs font-bold text-emerald-600 shrink-0">
                      +{d.surge_pct}%
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}