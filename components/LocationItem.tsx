import React, { useState, useEffect } from 'react';
import { Location } from '../types';
import { TrashIcon, ImageIcon, DragHandleIcon, MapIcon } from './Icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper function to convert decimal degrees to DMS format
const toDMS = (decimal: number, isLatitude: boolean): string => {
  if (isNaN(decimal) || decimal === null) {
    return '';
  }
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

  const direction = isLatitude 
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';
  
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
};


// Helper function to convert DMS string to decimal degrees
const fromDMSToDecimal = (dms: string): number => {
    const regex = /(-?\d+(?:\.\d+)?)\s*°?\s*(\d+(?:\.\d+)?)?\s*'?\s*(\d+(?:\.\d+)?)?\s*"?\s*([NSEW])?/i;
    const parts = dms.match(regex);
  
    if (!parts) {
      return NaN;
    }
  
    const degrees = parseFloat(parts[1] || '0');
    const minutes = parseFloat(parts[2] || '0');
    const seconds = parseFloat(parts[3] || '0');
    const direction = (parts[4] || '').toUpperCase();
  
    let decimal = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);
  
    if (degrees < 0 || direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }
  
    return decimal;
};

// Helper function to parse comma-separated lat/lng string
const parseLatLngText = (text: string): { lat: number; lng: number } | null => {
  if (!text.trim()) {
    return null;
  }
  
  const parts = text.split(',').map(part => part.trim());
  if (parts.length !== 2) {
    return null;
  }
  
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  
  // Basic validation for latitude (-90 to 90) and longitude (-180 to 180)
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  
  return { lat, lng };
};

/**
 * Generates an image URL by replacing placeholders in a template string with values from a location object.
 * Placeholders are defined by curly braces, e.g., {code}, {title}.
 * If any placeholder's corresponding value in the location is null, undefined, or an empty string,
 * the function returns null, indicating a valid URL cannot be formed.
 * @param template - The URL template string.
 * @param location - The location object containing the data.
 * @returns The generated URL string or null if any required data is missing.
 */
const generateImageUrl = (template: string, location: Location): string | null => {
    if (!template) {
      return null;
    }

    let url = template;
    const placeholders = template.match(/\{(\w+)\}/g);

    if (!placeholders) {
      return template; // Return template as-is if no placeholders are found.
    }

    for (const placeholder of placeholders) {
      const key = placeholder.substring(1, placeholder.length - 1);
      const value = location[key];

      // If a value for a placeholder is missing, we can't form a valid URL.
      if (value === null || value === undefined || String(value) === '') {
        return null;
      }

      // Replace all occurrences of the placeholder.
      url = url.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    return url;
};


interface LocationItemProps {
  location: Location;
  index: number;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
  onNavigateToMap?: (location: Location) => void;
  urlTemplate: string;
  imageWidth: number;
  imageHeight: number;
}

const LocationItem: React.FC<LocationItemProps> = ({ 
  location, 
  index,
  onUpdate, 
  onDelete,
  onNavigateToMap, 
  urlTemplate, 
  imageWidth, 
  imageHeight
}) => {
  const [imageError, setImageError] = useState(false);
  const [latDMS, setLatDMS] = useState(() => toDMS(location.latitude, true));
  const [lonDMS, setLonDMS] = useState(() => toDMS(location.longitude, false));
  const [latLngText, setLatLngText] = useState(() => 
    `${location.latitude || 0}, ${location.longitude || 0}`
  );

  // dnd-kit sortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: location.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const imageUrl = generateImageUrl(urlTemplate, location);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  useEffect(() => {
    const currentDecimalLat = fromDMSToDecimal(latDMS);
    if(isNaN(currentDecimalLat) || parseFloat(currentDecimalLat.toFixed(6)) !== location.latitude) {
        setLatDMS(toDMS(location.latitude, true));
    }
  }, [location.latitude]);

  useEffect(() => {
    const currentDecimalLon = fromDMSToDecimal(lonDMS);
    if(isNaN(currentDecimalLon) || parseFloat(currentDecimalLon.toFixed(6)) !== location.longitude) {
        setLonDMS(toDMS(location.longitude, false));
    }
  }, [location.longitude]);

  // Update lat/lng text input when individual values change
  useEffect(() => {
    const newLatLngText = `${location.latitude || 0}, ${location.longitude || 0}`;
    if (latLngText !== newLatLngText) {
      setLatLngText(newLatLngText);
    }
  }, [location.latitude, location.longitude]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const key = name;
    
    if (type === 'number' && (key === 'latitude' || key === 'longitude')) {
        const numValue = parseFloat(value);
        onUpdate(location.id, key, parseFloat((numValue || 0).toFixed(6)));
    } else {
        onUpdate(location.id, key, value);
    }
  };

  const handleDMSChange = (e: React.ChangeEvent<HTMLInputElement>, isLatitude: boolean) => {
    const dmsValue = e.target.value;
    if (isLatitude) {
      setLatDMS(dmsValue);
    } else {
      setLonDMS(dmsValue);
    }

    const decimal = fromDMSToDecimal(dmsValue);
    if (!isNaN(decimal)) {
      const key = isLatitude ? 'latitude' : 'longitude';
      onUpdate(location.id, key, parseFloat(decimal.toFixed(6)));
    }
  };

  const handleLatLngTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLatLngText(text);

    const parsed = parseLatLngText(text);
    if (parsed) {
      onUpdate(location.id, 'latitude', parseFloat(parsed.lat.toFixed(6)));
      onUpdate(location.id, 'longitude', parseFloat(parsed.lng.toFixed(6)));
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded-lg transition-all duration-200 flex flex-col sm:flex-row gap-4 items-stretch ${
        isDragging 
          ? 'opacity-50 shadow-2xl z-50' 
          : 'shadow hover:shadow-lg'
      }`}
      {...attributes}
    >

        {/* Image & DMS Column */}
        <div className="flex-shrink-0 w-full sm:w-auto">
            {/* Image Preview */}
            <div 
                className="rounded-md bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden mx-auto"
                style={{ width: imageWidth > 0 ? imageWidth : 100, height: imageHeight > 0 ? imageHeight : 140 }}
            >
                {imageUrl && !imageError ? (
                    <img 
                        src={imageUrl} 
                        alt={`Preview for ${location.title}`}
                        width={imageWidth}
                        height={imageHeight}
                        className="object-cover w-full h-full"
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full">
                       <ImageIcon className="w-16 h-16 text-slate-300" />
                    </div>
                )}
            </div>
            {imageUrl && (
                <div 
                  className="mt-1 text-center" 
                  style={{ width: imageWidth > 0 ? imageWidth : 100, margin: '0 auto' }}
                >
                    <a 
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline break-all"
                        title={imageUrl}
                    >
                        {imageUrl}
                    </a>
                </div>
            )}
            {/* DMS Display */}
            <div 
                className="text-center text-xs text-slate-500 mt-2 space-y-1" 
                style={{ width: imageWidth > 0 ? imageWidth : 100, margin: '0 auto' }}
                aria-label="Geographic Coordinates in DMS"
            >
                <input
                    type="text"
                    value={latDMS}
                    onChange={(e) => handleDMSChange(e, true)}
                    aria-label="Latitude in Degrees Minutes Seconds"
                    placeholder="e.g. 35° 41' 22 N"
                    className="w-full text-center text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-0.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <input
                    type="text"
                    value={lonDMS}
                    onChange={(e) => handleDMSChange(e, false)}
                    aria-label="Longitude in Degrees Minutes Seconds"
                    placeholder="e.g. 139° 41' 32 E"
                    className="w-full text-center text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-0.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
            </div>
        </div>
      
        {/* Form Fields & Actions */}
        <div className="flex-grow w-full relative">
            <div className="absolute top-0 right-0 z-10 flex gap-1">
                {onNavigateToMap && (
                    <button 
                        onClick={() => onNavigateToMap(location)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors duration-200"
                        aria-label="Navigate to location on map"
                        title="Show on map"
                    >
                        <MapIcon className="w-5 h-5"/>
                    </button>
                )}
                <button 
                    onClick={() => onDelete(location.id)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200"
                    aria-label="Delete location"
                >
                    <TrashIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mt-8">
                <InputField label="Code" name="code" value={location.code} onChange={handleInputChange} />
                <InputField label="Title" name="title" value={location.title} onChange={handleInputChange} />
                <InputField label="Subtitle" name="subtitle" value={location.subtitle} onChange={handleInputChange} />
                <InputField label="Group" name="group" value={location.group} onChange={handleInputChange} />
                <InputField label="Latitude" name="latitude" type="number" value={location.latitude} onChange={handleInputChange} />
                <InputField label="longitude" name="longitude" type="number" value={location.longitude} onChange={handleInputChange} />
                <div className="md:col-span-2">
                    <label htmlFor={`lat-lng-${location.id}`} className="block text-xs font-medium text-slate-600 mb-1">
                        Latitude, Longitude
                    </label>
                    <input
                        type="text"
                        id={`lat-lng-${location.id}`}
                        value={latLngText}
                        onChange={handleLatLngTextChange}
                        placeholder="e.g., 34.64777715038848, 135.3854095973777"
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
            </div>
        </div>

        {/* Draggable Region */}
        <div 
          className={`flex-shrink-0 w-10 bg-slate-50 hover:bg-slate-100 border-l border-slate-200 rounded-r-lg transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center self-stretch ${
            isDragging ? 'bg-blue-100 border-blue-300' : ''
          }`}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          <DragHandleIcon className="w-5 h-5 text-slate-400" />
        </div>
    </div>
  );
};

const InputField: React.FC<{ label: string; name: string; value: string | number; type?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }> = ({ label, name, value, type = 'text', onChange, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
    </div>
);


export default LocationItem;