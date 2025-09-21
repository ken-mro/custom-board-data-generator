
import React, { useState, useCallback, useEffect } from 'react';
import { CustomBoardData, Location } from './types';
import { loadInitialData, EMPTY_STATE } from './constants';
import Header from './components/Header';
import MetadataForm from './components/MetadataForm';
import LocationList from './components/LocationList';
import JsonOutput from './components/JsonOutput';
import DecryptModal from './components/DecryptModal';
import { decryptWithAppSecret, verifyUserPassword, EncryptedData } from './services/cryptoService';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, DragMoveEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

const App: React.FC = () => {
  const [data, setData] = useState<CustomBoardData | null>(null);
  const [fileToDecrypt, setFileToDecrypt] = useState<File | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  
  // Drag and drop state for dnd-kit
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);

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

  // Drag and drop handlers for dnd-kit
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    
    // Capture the initial offset between cursor and element
    const activatorEvent = event.activatorEvent as MouseEvent;
    if (activatorEvent && activatorEvent.clientX !== undefined && activatorEvent.clientY !== undefined) {
      const activeElement = document.getElementById(event.active.id as string);
      if (activeElement) {
        const rect = activeElement.getBoundingClientRect();
        const offset = {
          x: activatorEvent.clientX - rect.left,
          y: activatorEvent.clientY - rect.top,
        };
        setDragOffset(offset);
        setCursorPosition({ x: activatorEvent.clientX, y: activatorEvent.clientY });
        
        // Add mouse move listener to track cursor during drag
        const handleMouseMove = (e: MouseEvent) => {
          setCursorPosition({ x: e.clientX, y: e.clientY });
        };
        
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    }
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // This handler is kept for compatibility but we use mouse listeners above
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDragOffset(null);
    setCursorPosition(null);
    
    if (!over || !data) return;
    
    if (active.id !== over.id) {
      const oldIndex = data.locations.findIndex(location => location.id === active.id);
      const newIndex = data.locations.findIndex(location => location.id === over.id);
      
      const newLocations = arrayMove(data.locations, oldIndex, newIndex);
      
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          locations: newLocations
        };
      });
    }
  }, [data]);

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
    <DndContext 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
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
              <SortableContext 
                items={data.locations.map(loc => loc.id)} 
                strategy={verticalListSortingStrategy}
              >
                <LocationList
                  locations={data.locations}
                  onAdd={handleAddLocation}
                  onDelete={handleDeleteLocation}
                  onUpdate={handleUpdateLocation}
                  urlTemplate={data.url}
                  imageWidth={data.width}
                  imageHeight={data.height}
                />
              </SortableContext>
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
        
        {/* DragOverlay for better visual feedback */}
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
          style={{
            cursor: 'grabbing',
          }}
        >
          {activeId && data && cursorPosition && dragOffset ? (
            <div 
              className="bg-white p-4 rounded-lg shadow-xl opacity-90 transform scale-105 pointer-events-none"
              style={{
                position: 'fixed',
                left: cursorPosition.x - dragOffset.x,
                top: cursorPosition.y - dragOffset.y,
                zIndex: 9999,
                transform: 'none', // Override any transform from dnd-kit
              }}
            >
              <div className="text-sm font-medium">
                {data.locations.find(loc => loc.id === activeId)?.title || 'Location'}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default App;