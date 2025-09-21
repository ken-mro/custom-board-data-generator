
import React from 'react';
import { CustomBoardData } from '../types';

interface MetadataFormProps {
  data: Omit<CustomBoardData, 'locations'>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<{ label: string; name: string; value: string | number; type?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }> = ({ label, name, value, type = 'text', onChange, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
    </div>
);


const MetadataForm: React.FC<MetadataFormProps> = ({ data, onChange }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Card Series Info</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Series Name" name="name" value={data.name} onChange={onChange} placeholder="e.g., マンホールカード第23弾"/>
        <InputField label="Image URL Template" name="url" value={data.url} onChange={onChange} placeholder="e.g., https://example.com/{code}.jpg"/>
        <InputField label="Image Width" name="width" type="number" value={data.width} onChange={onChange} />
        <InputField label="Image Height" name="height" type="number" value={data.height} onChange={onChange} />
      </div>
    </div>
  );
};

export default MetadataForm;
