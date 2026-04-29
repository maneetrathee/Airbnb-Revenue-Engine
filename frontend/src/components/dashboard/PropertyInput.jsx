import { Loader2, Search } from "lucide-react";

const PropertyInput = ({ value, onChange, onSubmit, loading }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="p-4">
        <textarea
          className="w-full min-h-[80px] resize-none bg-transparent outline-none
                     text-gray-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     text-sm leading-relaxed"
          placeholder="Describe your property — e.g. luxury penthouse in Islington with skyline views and 2 bedrooms..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Tip: Be specific — mention bedrooms, location, amenities &amp; views
        </p>
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="flex items-center gap-2 bg-brand hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand/20 text-sm"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Generate Smart Pricing
        </button>
      </div>
    </div>
  );
};

export default PropertyInput;
