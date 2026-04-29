import { Calendar } from "lucide-react";

const Forecast = ({ forecast }) => {
  if (!forecast?.length) return null;

  const maxPrice = Math.max(...forecast.map((d) => d.price));
  const minPrice = Math.min(...forecast.map((d) => d.price));
  const range = maxPrice - minPrice || 1;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200">
        <Calendar className="text-brand" size={24} />
        7-Day Dynamic Forecast
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {forecast.map((day, idx) => {
          const isWeekend = day.day === "Fri" || day.day === "Sat";
          const isPeak = day.price === maxPrice;
          // Bar fill as % of range
          const fill = Math.round(((day.price - minPrice) / range) * 70 + 30);

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl text-center border transition-all hover:shadow-md ${
                isPeak
                  ? "border-brand bg-rose-50 shadow-sm"
                  : isWeekend
                  ? "border-rose-200 bg-rose-50/60"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className={`font-bold text-sm ${isWeekend ? "text-brand" : "text-gray-600"}`}>
                {day.day}
              </div>
              <div className="text-xs text-gray-400 mb-2">{day.date}</div>

              {/* Mini bar */}
              <div className="w-full h-8 flex items-end justify-center mb-2">
                <div
                  className={`w-3/4 rounded-sm ${isPeak ? "bg-brand" : isWeekend ? "bg-rose-300" : "bg-gray-200"}`}
                  style={{ height: `${fill}%` }}
                />
              </div>

              <div className={`text-2xl font-bold mb-1 ${isPeak ? "text-brand" : "text-gray-900"}`}>
                £{day.price.toFixed(0)}
              </div>
              <div
                className={`text-[10px] font-bold uppercase ${
                  day.tags?.[0]?.includes("+") ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                {day.tags?.[0]}
              </div>
              {isPeak && (
                <div className="text-[9px] font-bold text-white bg-brand rounded-full px-2 py-0.5 mt-1 inline-block">
                  PEAK
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Forecast;
