import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const CompetitorMap = ({ listings }) => {
  if (!listings?.length) return null;

  const center = [listings[0].latitude, listings[0].longitude];

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        <MapPin className="text-brand" size={24} />
        Competitor Locations
      </h3>
      <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
        <MapContainer center={center} zoom={12} className="h-full w-full">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />
          {listings.map((listing, index) => (
            <Marker key={index} position={[listing.latitude, listing.longitude]}>
              <Popup>
                <div className="font-bold">{listing.name}</div>
                <div className="text-brand font-bold mt-1">
                  £{listing.price_base}/night
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default CompetitorMap;
