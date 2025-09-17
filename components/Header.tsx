
import React from 'react';
import { UploadIcon } from './Icons';

interface HeaderProps {
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Header: React.FC<HeaderProps> = ({ onFileSelect }) => {
  return (
    <header className="py-8 text-center relative">
        <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold text-slate-900">Custom Board JSON Generator</h1>
            <p className="mt-2 text-lg text-slate-600">
                Create and edit JSON data for Custom Board collections.
            </p>
        </div>
        <div className="absolute top-0 right-0 mt-8 mr-8">
            <label
            htmlFor="upload-input"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors duration-200 cursor-pointer"
            >
            <UploadIcon className="w-5 h-5" />
            Upload File
            </label>
            <input
            id="upload-input"
            type="file"
            accept=".json,.json.encrypted"
            className="hidden"
            onChange={onFileSelect}
            onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />
        </div>
    </header>
  );
};

export default Header;