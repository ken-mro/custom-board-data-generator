
export interface Location {
  id: string; // Used for React keys, not in the final JSON output.
  code: string;
  title: string;
  subtitle: string;
  group: string;
  latitude: number;
  longitude: number; // Spelling from user's JSON example.
  [key: string]: any; // Allow for dynamic properties
}

export interface CustomBoardData {
  name: string;
  url: string;
  width: number;
  height: number;
  variables: string[];
  locations: Location[];
}

export type CustomBoardJson = Omit<CustomBoardData, 'locations' | 'variables'> & {
  locations: Omit<Location, 'id'>[];
};