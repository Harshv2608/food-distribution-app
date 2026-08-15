import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix for default Leaflet marker icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationPickerProps {
  initialLocation?: LocationData;
  onChange: (location: LocationData) => void;
}

const MapEvents: React.FC<{ onLocationSelect: (lat: number, lng: number) => void }> = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMapEvents({});
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ initialLocation, onChange }) => {
  const defaultCenter = [40.7128, -74.0060]; // NYC fallback
  const [position, setPosition] = useState<[number, number]>(
    initialLocation ? [initialLocation.latitude, initialLocation.longitude] : (defaultCenter as [number, number])
  );
  const [address, setAddress] = useState<string>(initialLocation?.address || '');
  const [loading, setLoading] = useState(false);

  // Sync state if initialLocation loads dynamically
  useEffect(() => {
    if (initialLocation && initialLocation.latitude && initialLocation.longitude) {
      setPosition([initialLocation.latitude, initialLocation.longitude]);
      if (initialLocation.address) setAddress(initialLocation.address);
    }
  }, [initialLocation]);

  // Attempt to get user's current location on mount if no initial location provided
  useEffect(() => {
    if (!initialLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          console.warn('Geolocation blocked or unavailable.');
        }
      );
    }
  }, [initialLocation]);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setLoading(true);
    try {
      // Reverse Geocoding with Nominatim (OpenStreetMap)
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const formattedAddress = data.display_name || 'Unknown Location';
      setAddress(formattedAddress);
      onChange({ latitude: lat, longitude: lng, address: formattedAddress });
    } catch (err) {
      console.error('Failed to fetch address:', err);
      onChange({ latitude: lat, longitude: lng });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} />
          <MapEvents onLocationSelect={handleLocationSelect} />
          <MapUpdater center={position} />
        </MapContainer>
      </div>
      
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)' }}>
        <MapPin size={24} color="var(--accent)" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Selected Location</p>
          {loading ? (
            <p className="animate-pulse" style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Loading address...</p>
          ) : (
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
              {address || 'Click on the map to drop a pin.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
