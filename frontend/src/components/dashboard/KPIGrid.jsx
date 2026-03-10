import { PoundSterling, BarChart3, TrendingUp, Star } from "lucide-react";
import MetricCard from "./MetricCard";

const KPIGrid = ({ result }) => {
  if (!result) return null;

  const avgComp =
    result.similar_listings?.length > 0
      ? Math.round(
          result.similar_listings.reduce((s, l) => s + l.price_base, 0) /
            result.similar_listings.length
        )
      : null;

  const peakPrice =
    result.forecast?.length > 0
      ? Math.max(...result.forecast.map((d) => d.price))
      : null;

  const avgMatch =
    result.similar_listings?.length > 0
      ? (
          (result.similar_listings.reduce((s, l) => s + l.similarity, 0) /
            result.similar_listings.length) *
          100
        ).toFixed(1)
      : null;

  // How much above/below the market average
  const vsMarket =
    avgComp && result.base_price
      ? (((result.base_price - avgComp) / avgComp) * 100).toFixed(1)
      : null;

  const metrics = [
    {
      label: "AI Base Price",
      value: result.base_price?.toFixed(0) ?? "—",
      prefix: "£",
      suffix: "/night",
      trend: vsMarket > 0 ? "up" : vsMarket < 0 ? "down" : "neutral",
      trendValue: vsMarket ? `${vsMarket > 0 ? "+" : ""}${vsMarket}% vs market` : null,
      icon: PoundSterling,
      color: "brand",
    },
    {
      label: "Market Average",
      value: avgComp ?? "—",
      prefix: "£",
      suffix: "/night",
      trend: "neutral",
      trendValue: `${result.similar_listings?.length ?? 0} comps`,
      icon: BarChart3,
      color: "blue",
    },
    {
      label: "Peak This Week",
      value: peakPrice?.toFixed(0) ?? "—",
      prefix: "£",
      suffix: "/night",
      trend: "up",
      trendValue: "Weekend rate",
      icon: TrendingUp,
      color: "green",
    },
    {
      label: "Avg. Comp Match",
      value: avgMatch ?? "—",
      suffix: "%",
      trend: "neutral",
      trendValue: "Similarity score",
      icon: Star,
      color: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
};

export default KPIGrid;
