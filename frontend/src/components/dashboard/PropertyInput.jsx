import { Search, Loader2 } from "lucide-react";

const PropertyInput = ({ value, onChange, onSubmit, loading }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <textarea
        placeholder="Describe your property (e.g., Luxury penthouse with skyline views...)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none mb-4 transition-all"
      />
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-gray-400">
          Tip: Be specific — mention bedrooms, location, amenities & views
        </span>
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            loading || !value.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-brand text-white hover:bg-rose-600 shadow-lg shadow-brand/30"
          }`}
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={18} /> Analyzing...</>
          ) : (
            <><Search size={18} /> Generate Smart Pricing</>
          )}
        </button>
      </div>
    </div>
  );
};

export default PropertyInput;
