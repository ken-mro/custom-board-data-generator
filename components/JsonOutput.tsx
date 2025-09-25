import React, { useState, useCallback, useMemo } from 'react';
import { CustomBoardData, CustomBoardJson } from '../types';
import { CopyIcon, DownloadIcon, CheckIcon, LockClosedIcon } from './Icons';
import { encryptWithAppSecret } from '../services/cryptoService';


// --- Password Modal Component ---
interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isEncrypting: boolean;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSubmit, isEncrypting }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length > 0 && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setError('');
    onSubmit(password);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm m-4">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Encrypt and Download</h2>
        <p className="text-sm text-slate-600 mb-4">
          Provide an optional password to lock this file. If left blank, anyone with this app can open it.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password-input" className="block text-sm font-medium text-slate-700 mb-1">Password (Optional)</label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            minLength={8}
            autoFocus
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isEncrypting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEncrypting || (password.length > 0 && password.length < 8)}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isEncrypting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Encrypting...
                </>
              ) : 'Encrypt & Download'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const JsonOutput: React.FC<{ data: CustomBoardData }> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const formattedJson = useMemo(() => {
    // Destructure to separate properties we want to modify or exclude.
    const { locations, ...metadata } = data;

    // Create the final export object, excluding the client-side 'id' from locations.
    const exportData: CustomBoardJson = {
      ...metadata,
      locations: locations.map(({ id, ...rest }) => rest),
    };
    return JSON.stringify(exportData, null, 2);
  }, [data]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formattedJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [formattedJson]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '_') || 'custom_board_data'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [formattedJson, data.name]);

  const handleEncryptedDownload = async (password: string) => {
    setIsEncrypting(true);
    try {
      // Use the updated encryptWithAppSecret function that handles password hashing internally
      const encryptedPayload = await encryptWithAppSecret(formattedJson, password || undefined);

      // Create the final encrypted file structure (no separate passwordHash field needed)
      const encryptedFileData = {
        salt: encryptedPayload.salt,
        iv: encryptedPayload.iv,
        ciphertext: encryptedPayload.ciphertext
      };

      const blob = new Blob([JSON.stringify(encryptedFileData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.name.replace(/\s+/g, '_') || 'custom_board_data'}.json.encrypted`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Encryption failed:', error);
      alert('Encryption failed. Please try again.');
    } finally {
      setIsEncrypting(false);
    }
  };


  return (
    <>
      <div className="bg-slate-800 rounded-xl shadow-lg h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h3 className="font-semibold text-white">Generated JSON</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors duration-200 disabled:opacity-50"
              disabled={copied}
            >
              {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors duration-200"
            >
              <DownloadIcon className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors duration-200"
              title="Download Encrypted JSON"
            >
              <LockClosedIcon className="w-4 h-4" />
              Encrypt
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto flex-grow">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap break-all">
            <code>{formattedJson}</code>
          </pre>
        </div>
      </div>
      <PasswordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleEncryptedDownload}
        isEncrypting={isEncrypting}
      />
    </>
  );
};

export default JsonOutput;