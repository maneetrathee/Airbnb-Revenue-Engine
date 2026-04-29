import { MapPin } from "lucide-react";

const CompetitorMap = ({ listings }) => {
  // No lat/lng in current data — render a clean fallback instead of crashing
  if (!listings?.length) return null;

  const hasCoords = listings.some(l => l.latitude != null && l.longitude != null);
  if (!hasCoords) {
    return (
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <MapPin className="text-brand" size={24} />
          Competitor Locations
        </h3>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6">
          <div className="space-y-2">
            {listings.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{l.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{l.neighborhood}</span>
                </div>
                <span className="font-bold text-brand">£{l.price_base}/night</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full map — only loads if coords exist (avoids Leaflet crash)
  const { MapContainer, TileLayer, Marker, Popup } = require("react-leaflet");
  const center = [listings[0].latitude, listings[0].longitude];
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <MapPin className="text-brand" size={24} />
        Competitor Locations
      </h3>
      <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative z-0">
        <MapContainer center={center} zoom={12} className="h-full w-full">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />
          {listings.map((listing, index) => (
            <Marker key={index} position={[listing.latitude, listing.longitude]}>
              <Popup>
                <div className="font-bold">{listing.name}</div>
                <div className="text-brand font-bold mt-1">£{listing.price_base}/night</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default CompetitorMap;
