import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Custom tooltip matching the app's design language
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-sm">
      <div className="font-bold text-gray-900 dark:text-gray-100 mb-2">
        {label}
      </div>
      {payload.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color }}
          />
          <span>{p.name}:</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {p.name === "Occupancy %" ? `${p.value}%` : `£${p.value}`}
          </span>
        </div>
      ))}
    </div>
  );
};

const RevPARChart = ({ trend }) => {
  if (!trend?.length || trend.length <= 1) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 text-amber-800 dark:text-amber-300 text-sm font-medium">
        ⚠️ No monthly time-series available — calendar data not yet ingested for
        this neighborhood. KPIs above are estimated from the reviews proxy.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-1">
        Monthly RevPAR & Occupancy Trend
      </h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
        Historical performance — sourced from 35M calendar rows
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={trend}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-prose-hr, #374151)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "0.8rem", paddingTop: "16px" }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revpar"
            name="RevPAR £"
            stroke="#FF385C"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avg_nightly_rate"
            name="ADR £"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="occupancy_rate"
            name="Occupancy %"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevPARChart;
