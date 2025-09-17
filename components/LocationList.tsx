import React from 'react';
import { Location } from '../types';
import LocationItem from './LocationItem';
import { PlusIcon } from './Icons';

interface LocationListProps {
  locations: Location[];
  customVariables: string[];
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  urlTemplate: string;
  imageWidth: number;
  imageHeight: number;
}

const LocationList: React.FC<LocationListProps> = ({ locations, customVariables, onUpdate, onDelete, onAdd, urlTemplate, imageWidth, imageHeight }) => {
  return (
    <div className="bg-slate-100 p-6 rounded-xl shadow-inner mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Locations</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors duration-200"
        >
          <PlusIcon className="w-5 h-5" />
          Add Location
        </button>
      </div>
      <div className="space-y-4">
        {locations.map((loc) => (
          <LocationItem
            key={loc.id}
            location={loc}
            customVariables={customVariables}
            onUpdate={onUpdate}
            onDelete={onDelete}
            urlTemplate={urlTemplate}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />
        ))}
      </div>
    </div>
  );
};

export default LocationList;