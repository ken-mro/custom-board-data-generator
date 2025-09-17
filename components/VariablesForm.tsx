import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from './Icons';

interface VariablesFormProps {
  variables: string[];
  onAdd: (variableName: string) => void;
  onDelete: (variableName: string) => void;
}

const RESERVED_KEYS = ['id', 'code', 'title', 'subtitle', 'group', 'latitude', 'longitude'];

const VariablesForm: React.FC<VariablesFormProps> = ({ variables, onAdd, onDelete }) => {
  const [newVariable, setNewVariable] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newVariable.trim();
    if (!trimmedName) {
      setError("Variable name cannot be empty.");
      return;
    }
    if (RESERVED_KEYS.includes(trimmedName.toLowerCase())) {
        setError(`"${trimmedName}" is a reserved name.`);
        return;
    }
    if (variables.includes(trimmedName)) {
        setError("Variable name already exists.");
        return;
    }

    onAdd(trimmedName);
    setNewVariable('');
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewVariable(e.target.value);
    if(error) setError(null);
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Custom Location Variables</h2>
      <div className="space-y-2 mb-4">
        {variables.length > 0 ? (
          variables.map((variable) => (
            <div key={variable} className="flex items-center justify-between bg-slate-50 p-2 rounded-md">
              <span className="text-sm font-medium text-slate-700">{variable}</span>
              <button
                onClick={() => onDelete(variable)}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200"
                aria-label={`Delete variable ${variable}`}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
            <p className="text-sm text-slate-500 text-center py-2">No custom variables defined. Add one below.</p>
        )}
      </div>
      <form onSubmit={handleAddVariable} className="flex items-start gap-2">
        <div className="flex-grow">
          <input
            type="text"
            value={newVariable}
            onChange={handleInputChange}
            placeholder="e.g., photographer_name"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            aria-label="New variable name"
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200"
        >
          <PlusIcon className="w-5 h-5" />
          Add
        </button>
      </form>
    </div>
  );
};

export default VariablesForm;
