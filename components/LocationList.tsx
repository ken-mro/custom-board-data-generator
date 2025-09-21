import React from 'react';
import { Location } from '../types';
import LocationItem from './LocationItem';
import { PlusIcon } from './Icons';

interface LocationListProps {
  locations: Location[];
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onNavigateToMap?: (location: Location) => void;
  urlTemplate: string;
  imageWidth: number;
  imageHeight: number;
}

const LocationList: React.FC<LocationListProps> = ({ 
  locations, 
  onUpdate, 
  onDelete, 
  onAdd, 
  onNavigateToMap,
  urlTemplate, 
  imageWidth, 
  imageHeight
}) => {
  return (
    <div className="bg-slate-100 p-6 rounded-xl shadow-inner mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Locations</h2>
      </div>
      <div className="space-y-4">
        {locations.map((loc, index) => (
          <LocationItem
            key={loc.id}
            location={loc}
            index={index}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onNavigateToMap={onNavigateToMap}
            urlTemplate={urlTemplate}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors duration-200"
        >
          <PlusIcon className="w-5 h-5" />
          Add Location
        </button>
      </div>
    </div>
  );
};

export default LocationList;