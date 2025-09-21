
import React, { useState, useCallback, useEffect } from 'react';
import { CustomBoardData, Location } from './types';
import { loadInitialData, EMPTY_STATE } from './constants';
import Header from './components/Header';
import MetadataForm from './components/MetadataForm';
import LocationList from './components/LocationList';
import JsonOutput from './components/JsonOutput';
import DecryptModal from './components/DecryptModal';
import { decryptWithAppSecret, verifyUserPassword, EncryptedData } from './services/cryptoService';

const App: React.FC = () => {
  const [data, setData] = useState<CustomBoardData | null>(null);
  const [fileToDecrypt, setFileToDecrypt] = useState<File | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData()
      .then(setData)
      .catch(error => {
        console.error("Failed to load initial data:", error);
        setData(EMPTY_STATE); // Fallback to an empty state on error
      });
  }, []);

  const loadDataIntoState = useCallback((jsonData: any) => {
    try {
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error("Invalid data format: not an object.");
      }

      const processedData: CustomBoardData = {
        name: jsonData.name || '',
        url: jsonData.url || '',
        width: Number(jsonData.width) || 0,
        height: Number(jsonData.height) || 0,
        locations: (Array.isArray(jsonData.locations) ? jsonData.locations : []).map((loc: any = {}) => {
          const newLoc: Location = {
            id: crypto.randomUUID(),
            code: loc.code || '',
            title: loc.title || '',
            subtitle: loc.subtitle || '',
            group: loc.group || '',
            latitude: Number(loc.latitude) || 0,
            longitude: Number(loc.longitude) || 0,
          };
          return newLoc;
        }),
      };
      setData(processedData);
    } catch (error) {
      console.error("Failed to process data from file:", error);
      alert("Error: The file's data structure is not compatible with this application.");
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDecryptionError(null);

    if (file.name.endsWith('.json.encrypted')) {
      setFileToDecrypt(file);
    } else if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) {
            throw new Error("File is empty.");
          }
          const jsonData = JSON.parse(text);
          loadDataIntoState(jsonData);
        } catch (error) {
          console.error("Failed to parse JSON file:", error);
          alert("Error: Could not parse the selected JSON file. Please ensure it's a valid JSON.");
        }
      };
      reader.onerror = () => {
        console.error("Failed to read file:", reader.error);
        alert("Error: Could not read the selected file.");
      }
      reader.readAsText(file);
    } else {
      alert("Unsupported file type. Please upload a .json or .json.encrypted file.");
    }
  };


  const handleDecrypt = async (password: string) => {
    if (!fileToDecrypt) return;

    setIsDecrypting(true);
    setDecryptionError(null);
    try {
      const fileContent = await fileToDecrypt.text();
      const encryptedFileData = JSON.parse(fileContent);

      // Extract password hash if it exists
      const passwordHash = encryptedFileData.passwordHash;
      const encryptedPayload: EncryptedData = {
        salt: encryptedFileData.salt,
        iv: encryptedFileData.iv,
        ciphertext: encryptedFileData.ciphertext
      };

      if (!encryptedPayload.salt || !encryptedPayload.iv || !encryptedPayload.ciphertext) {
        throw new Error("Invalid encrypted file format.");
      }

      // Make API call to decrypt data
      const response = await fetch('/api/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encryptedData: encryptedPayload,
          password: password || undefined,
          passwordHash: passwordHash || undefined
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid password provided.");
        }
        throw new Error(`Decryption failed: ${response.statusText}`);
      }

      const result = await response.json();
      const loadedData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

      loadDataIntoState(loadedData);
      setFileToDecrypt(null); // Success, close modal
    } catch (err) {
      console.error("Decryption or loading failed:", err);
      setDecryptionError("Decryption failed. Invalid password or corrupted file.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleMetadataChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      };
    });
  }, []);

  const handleAddLocation = useCallback(() => {
    const newLocation: Location = {
      id: crypto.randomUUID(),
      code: '',
      title: '',
      subtitle: '',
      group: '',
      latitude: 0,
      longitude: 0,
    };
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        locations: [...prev.locations, newLocation]
      };
    });
  }, []);

  const handleDeleteLocation = useCallback((id: string) => {
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        locations: prev.locations.filter(loc => loc.id !== id)
      };
    });
  }, []);

  const handleUpdateLocation = useCallback((id: string, field: string, value: any) => {
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        locations: prev.locations.map(loc =>
          loc.id === id ? { ...loc, [field]: value } : loc
        )
      };
    });
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-slate-600">Loading initial data...</p>
          <p className="text-sm text-slate-500">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header onFileSelect={handleFileSelect} />
      <main className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Left Column: Forms */}
          <div className="space-y-8">
            <MetadataForm
              data={{ name: data.name, url: data.url, width: data.width, height: data.height }}
              onChange={handleMetadataChange}
            />
            <LocationList
              locations={data.locations}
              onAdd={handleAddLocation}
              onDelete={handleDeleteLocation}
              onUpdate={handleUpdateLocation}
              urlTemplate={data.url}
              imageWidth={data.width}
              imageHeight={data.height}
            />
          </div>

          {/* Right Column: JSON Output */}
          <div className="lg:sticky lg:top-8 h-[calc(100vh-4rem)]">
            <JsonOutput data={data} />
          </div>

        </div>
      </main>
      <DecryptModal
        isOpen={!!fileToDecrypt}
        onClose={() => setFileToDecrypt(null)}
        onSubmit={handleDecrypt}
        isDecrypting={isDecrypting}
        error={decryptionError}
      />
    </div>
  );
};

export default App;