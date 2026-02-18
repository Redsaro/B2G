import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Village } from '../types';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
// Using CDN URLs because direct image imports (e.g. import icon from './image.png') 
// are not supported in browser native ESM without a bundler.
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  villages: Village[];
  onSelect: (v: Village) => void;
  selectedId?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ villages, onSelect, selectedId }) => {
  const center = { lat: 26.0, lng: 83.0 }; // Rough center of UP/Bihar cluster

  return (
    <MapContainer center={center} zoom={7} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {villages.map(v => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lng]}
          radius={selectedId === v.id ? 12 : 8}
          pathOptions={{
            color: v.lastScore > 80 ? '#B8F000' : v.lastScore < 50 ? '#E8603C' : '#F5A623',
            fillColor: v.lastScore > 80 ? '#B8F000' : v.lastScore < 50 ? '#E8603C' : '#F5A623',
            fillOpacity: 0.7
          }}
          eventHandlers={{
            click: () => onSelect(v),
          }}
        >
          <Popup>
            <div className="font-mono text-xs">
              <strong>{v.name}</strong><br/>
              Score: {v.lastScore}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;