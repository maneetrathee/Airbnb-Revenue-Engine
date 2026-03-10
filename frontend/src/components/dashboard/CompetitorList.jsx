import { Home } from "lucide-react";

const CompetitorList = ({ listings }) => {
  if (!listings?.length) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        <Home className="text-brand" size={24} />
        Top Market Comparables
      </h3>
      <div className="space-y-3">
        {listings.map((listing, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
          >
            <div>
              <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">
                {listing.name}
              </h4>
              <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-bold">
                {(listing.similarity * 100).toFixed(1)}% Match
              </span>
            </div>
            <div className="text-lg font-black text-gray-900">
              £{listing.price_base}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompetitorList;
