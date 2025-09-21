import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Location } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create a custom icon to ensure markers display properly
const createCustomIcon = () => {
  return L.divIcon({
    html: `<div style="
      width: 30px;
      height: 30px;
      background-color: #ef4444;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Fix default Leaflet icons as fallback
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
}

const LocationMapModal: React.FC<LocationMapModalProps> = ({ isOpen, onClose, location }) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !location) {
    return null;
  }

  // Validate coordinates
  const hasValidCoordinates = !isNaN(location.latitude) && !isNaN(location.longitude) && 
                             location.latitude !== 0 && location.longitude !== 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{location.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{location.subtitle}</p>
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span>Group: {location.group}</span>
                <span>Code: {location.code}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Map Content */}
          <div className="p-6">
            {hasValidCoordinates ? (
              <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height: '500px' }}>
                <MapContainer
                  center={[location.latitude, location.longitude]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  <Marker
                    position={[location.latitude, location.longitude]}
                    icon={createCustomIcon()}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-slate-800">{location.title}</h3>
                        <p className="text-sm text-slate-600">{location.subtitle}</p>
                        <p className="text-xs text-slate-500 mt-1">Group: {location.group}</p>
                        <p className="text-xs text-slate-500">Code: {location.code}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-100 border border-slate-200 h-96 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-600 mb-2">Invalid coordinates</p>
                  <p className="text-sm text-slate-500">
                    Latitude: {location.latitude}, Longitude: {location.longitude}
                  </p>
                </div>
              </div>
            )}

            {/* Coordinates info */}
            {hasValidCoordinates && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Coordinates:</span> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Close
            </button>
            {hasValidCoordinates && (
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMapModal;