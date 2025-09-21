import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { Location } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create a custom icon to ensure markers display properly
const createCustomIcon = (isHighlighted: boolean = false) => {
  const color = isHighlighted ? '#fbbf24' : '#ef4444';
  const borderColor = isHighlighted ? '#f59e0b' : '#ffffff';
  
  return L.divIcon({
    html: `<div style="
      width: 25px;
      height: 25px;
      background-color: ${color};
      border: 3px solid ${borderColor};
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
};

// Also try to fix default Leaflet icons as fallback
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// MapController component that has access to the map instance
const MapController = ({ targetLocation, filteredLocations, searchQuery }: { 
  targetLocation: Location | null, 
  filteredLocations: Location[], 
  searchQuery: string 
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (targetLocation && map) {
      console.log('MapController: Flying to location:', targetLocation.title, targetLocation.latitude, targetLocation.longitude);
      // Use flyTo for smooth animation to center the location on the map
      map.flyTo([targetLocation.latitude, targetLocation.longitude], 12, {
        animate: true,
        duration: 1.5
      });
    }
  }, [targetLocation, map]);
  
  // Auto-zoom to search results
  useEffect(() => {
    if (map && searchQuery.trim() && filteredLocations.length > 0) {
      if (filteredLocations.length === 1) {
        // If only one result, focus on it
        const location = filteredLocations[0];
        map.flyTo([location.latitude, location.longitude], 12, {
          animate: true,
          duration: 1.0
        });
      } else {
        // If multiple results, fit bounds to show all
        const bounds = filteredLocations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
        map.fitBounds(bounds, { 
          padding: [20, 20],
          animate: true,
          duration: 1.0
        });
      }
    }
  }, [map, searchQuery, filteredLocations]);
  
  return null; // This component doesn't render anything
};

interface LocationMapRef {
  navigateToLocation: (location: Location) => void;
}

interface LocationMapProps {
  locations: Location[];
  className?: string;
}

const LocationMap = forwardRef<LocationMapRef, LocationMapProps>(({ locations, className = '' }, ref) => {
  const [targetLocation, setTargetLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useImperativeHandle(ref, () => ({
    navigateToLocation: (location: Location) => {
      console.log('LocationMap: Navigation requested for:', location.title, location.latitude, location.longitude);
      setTargetLocation(location);
    }
  }));

  // Early return if no locations
  if (!locations || locations.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-800">Location Map</h2>
          <p className="text-sm text-slate-600 mt-1">No locations available to display</p>
        </div>
        <div className="rounded-lg bg-slate-100 border border-slate-200 h-96 flex items-center justify-center">
          <p className="text-slate-500">Add some locations to see them on the map</p>
        </div>
      </div>
    );
  }
  // Calculate the center of all locations for initial map view
  const calculateCenter = (locations: Location[]): [number, number] => {
    if (locations.length === 0) {
      return [35.6762, 139.6503]; // Default to Tokyo, Japan
    }
    
    const validLocations = locations.filter(loc => 
      !isNaN(loc.latitude) && !isNaN(loc.longitude) && 
      loc.latitude !== 0 && loc.longitude !== 0
    );
    
    if (validLocations.length === 0) {
      return [35.6762, 139.6503]; // Default to Tokyo, Japan
    }
    
    const avgLat = validLocations.reduce((sum, loc) => sum + loc.latitude, 0) / validLocations.length;
    const avgLng = validLocations.reduce((sum, loc) => sum + loc.longitude, 0) / validLocations.length;
    
    return [avgLat, avgLng];
  };

  // Calculate appropriate zoom level based on the spread of locations
  const calculateZoom = (locations: Location[]): number => {
    if (locations.length === 0) return 10;
    
    const validLocations = locations.filter(loc => 
      !isNaN(loc.latitude) && !isNaN(loc.longitude) && 
      loc.latitude !== 0 && loc.longitude !== 0
    );
    
    if (validLocations.length <= 1) return 10;
    
    const latitudes = validLocations.map(loc => loc.latitude);
    const longitudes = validLocations.map(loc => loc.longitude);
    
    const latRange = Math.max(...latitudes) - Math.min(...latitudes);
    const lngRange = Math.max(...longitudes) - Math.min(...longitudes);
    const maxRange = Math.max(latRange, lngRange);
    
    // Adjust zoom based on coordinate range
    if (maxRange > 20) return 4;
    if (maxRange > 10) return 5;
    if (maxRange > 5) return 6;
    if (maxRange > 2) return 7;
    if (maxRange > 1) return 8;
    return 9;
  };

  const validLocations = locations.filter(loc => 
    !isNaN(loc.latitude) && !isNaN(loc.longitude) && 
    loc.latitude !== 0 && loc.longitude !== 0
  );

  // Filter locations based on search query
  const filteredLocations = validLocations.filter(location => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      location.title.toLowerCase().includes(query) ||
      location.subtitle.toLowerCase().includes(query) ||
      location.code.toLowerCase().includes(query) ||
      location.group.toLowerCase().includes(query)
    );
  });

  // Update center and zoom based on filtered locations
  const center = calculateCenter(filteredLocations.length > 0 ? filteredLocations : validLocations);
  const zoom = calculateZoom(filteredLocations.length > 0 ? filteredLocations : validLocations);

  // Debug logging
  console.log('Total locations:', locations.length);
  console.log('Valid locations:', validLocations.length);
  console.log('Center:', center);
  console.log('Zoom:', zoom);
  if (validLocations.length > 0) {
    console.log('First valid location:', validLocations[0]);
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Location Map</h2>
        <p className="text-sm text-slate-600 mt-1">
          {searchQuery.trim() ? 
            `Showing ${filteredLocations.length} of ${validLocations.length} locations matching "${searchQuery}"` :
            `Showing ${validLocations.length} of ${locations.length} locations with valid coordinates`
          }
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations by title, subtitle, code, or group..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height: '500px' }}>
        {searchQuery.trim() && filteredLocations.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No locations found</h3>
              <p className="mt-1 text-sm text-slate-500">
                No locations match your search for "{searchQuery}".
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear search
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <MapController 
              targetLocation={targetLocation} 
              filteredLocations={filteredLocations}
              searchQuery={searchQuery}
            />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          
          {filteredLocations.map((location) => {
            const isHighlighted = searchQuery.trim() && (
              location.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              location.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
              location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
              location.group.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            return (
              <React.Fragment key={location.id}>
                {/* Custom icon marker with highlighting */}
                <Marker
                  position={[location.latitude, location.longitude]}
                  icon={createCustomIcon(isHighlighted)}
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
                
                {/* Circle marker as backup/alternative - slightly offset */}
                <CircleMarker
                  center={[location.latitude, location.longitude]}
                  radius={isHighlighted ? 10 : 8}
                  fillColor={isHighlighted ? "#fbbf24" : "#3b82f6"}
                  color={isHighlighted ? "#f59e0b" : "#1e40af"}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.6}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-slate-800">{location.title} (Circle)</h3>
                      <p className="text-sm text-slate-600">{location.subtitle}</p>
                      <p className="text-xs text-slate-500 mt-1">Group: {location.group}</p>
                      <p className="text-xs text-slate-500">Code: {location.code}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
        )}
      </div>
      
      {locations.length > validLocations.length && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Note:</span> {locations.length - validLocations.length} location(s) have invalid or missing coordinates and are not displayed on the map.
          </p>
        </div>
      )}
    </div>
  );
});

LocationMap.displayName = 'LocationMap';

export default LocationMap;
export type { LocationMapRef };