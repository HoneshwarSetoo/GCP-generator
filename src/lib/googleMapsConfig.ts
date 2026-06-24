export const GOOGLE_MAPS_LIBRARIES: ("drawing" | "geometry" | "places" | "visualization" | "marker")[] = [
  "drawing",
  "geometry", 
  "places",
  "marker",
];

export const GOOGLE_MAPS_CONFIG = {
  id: 'google-map-script',
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
  libraries: GOOGLE_MAPS_LIBRARIES,
  version: 'weekly',
} as const;
