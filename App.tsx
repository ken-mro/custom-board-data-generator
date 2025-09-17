
import React, { useState, useCallback, useEffect } from 'react';
import { CustomBoardData, Location } from './types';
import { loadInitialData, EMPTY_STATE } from './constants';
import Header from './components/Header';
import MetadataForm from './components/MetadataForm';
import VariablesForm from './components/VariablesForm';
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

      const variables = Array.isArray(jsonData.variables) ? jsonData.variables : [];
      const variableDefaults = variables.reduce((acc, v) => ({ ...acc, [v]: '' }), {});

      const processedData: CustomBoardData = {
        name: jsonData.name || '',
        url: jsonData.url || '',
        width: Number(jsonData.width) || 0,
        height: Number(jsonData.height) || 0,
        variables: variables,
        locations: (Array.isArray(jsonData.locations) ? jsonData.locations : []).map((loc: any = {}) => {
            const newLoc: Location = {
                ...variableDefaults,
                ...loc,
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


  const handleDecryptAndLoad = async (password: string) => {
    if (!fileToDecrypt) return;

    setIsDecrypting(true);
    setDecryptionError(null);
    try {
        const fileContent = await fileToDecrypt.text();
        const encryptedPayload: EncryptedData = JSON.parse(fileContent);

        if (!encryptedPayload.salt || !encryptedPayload.iv || !encryptedPayload.ciphertext) {
            throw new Error("Invalid encrypted file format.");
        }

        const decryptedJson = await decryptWithAppSecret(encryptedPayload);
        const loadedData = JSON.parse(decryptedJson);

        // If the decrypted data has a password, verify it.
        if (loadedData.password && typeof loadedData.password === 'string') {
            const isPasswordCorrect = await verifyUserPassword(password, loadedData.password);
            if (!isPasswordCorrect) {
                throw new Error("Invalid user password provided.");
            }
            // Password is correct, remove it before loading into state
            delete loadedData.password;
        }
        
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
      ...(data?.variables.reduce((acc, cur) => ({ ...acc, [cur]: '' }), {}) || {})
    };
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        locations: [...prev.locations, newLocation]
      };
    });
  }, [data?.variables]);

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

  const handleAddVariable = useCallback((variableName: string) => {
    setData(prev => {
      if (!prev) return null;
      const newVariables = [...prev.variables, variableName];
      const newLocations = prev.locations.map(loc => ({
        ...loc,
        [variableName]: ''
      }));
      return { ...prev, variables: newVariables, locations: newLocations };
    });
  }, []);

  const handleDeleteVariable = useCallback((variableName: string) => {
    setData(prev => {
      if (!prev) return null;
      const newVariables = prev.variables.filter(v => v !== variableName);
      const newLocations = prev.locations.map(loc => {
        const newLoc = { ...loc };
        delete newLoc[variableName];
        return newLoc;
      });
      return { ...prev, variables: newVariables, locations: newLocations };
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
            <VariablesForm 
              variables={data.variables}
              onAdd={handleAddVariable}
              onDelete={handleDeleteVariable}
            />
            <LocationList
              locations={data.locations}
              customVariables={data.variables}
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
        onSubmit={handleDecryptAndLoad}
        isDecrypting={isDecrypting}
        error={decryptionError}
      />
    </div>
  );
};

export default App;