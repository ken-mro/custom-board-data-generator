import { CustomBoardData, Location } from './types';

// We can define an empty state as a fallback or for initial rendering before data is loaded.
export const EMPTY_STATE: CustomBoardData = {
  name: '',
  url: '',
  width: 0,
  height: 0,
  variables: [],
  locations: [],
};

// Asynchronously load data from the JSON file to avoid syntax issues with import assertions.
export const loadInitialData = async (): Promise<CustomBoardData> => {
  const response = await fetch('./sample.json');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const sampleData = await response.json();
  
  // Add the client-side-only 'id' to each location and ensure `variables` exists.
  return {
    ...sampleData,
    variables: sampleData.variables || [],
    locations: sampleData.locations.map((location: Omit<Location, 'id'>) => ({
      ...location,
      id: crypto.randomUUID(),
    })),
  };
};