import { useCallback } from 'react';
import { toast } from 'sonner';

interface UseGCPMapProps {
  onMapClick: (lat: number, lng: number, altitude?: number | null) => void;
}

export function useGCPMap({ onMapClick }: UseGCPMapProps) {
  const handleMapClick = useCallback(
    async (event: { latLng?: { lat: () => number; lng: () => number } }) => {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      let altitude: number | null = null;

      // try {
      //   const googleMaps = (window as Window & { google?: typeof globalThis & { maps: { ElevationService: new () => { getElevationForLocations: (request: { locations: Array<{ lat: number; lng: number }> }) => Promise<{ results: Array<{ elevation?: number | null }> }> } } } }).google;
      //   if (!googleMaps?.maps?.ElevationService) {
      //     throw new Error('Google Maps API is not available.');
      //   }
      //   // const elevator = new googleMaps.maps.ElevationService();
      //   // const { results } = await elevator.getElevationForLocations({
      //   //   locations: [{ lat, lng }],
      //   // });
      //   // if (results && results.length > 0) {
      //   //   altitude = results[0]?.elevation ?? null;
      //   // }
      // } catch (error: unknown) {
      //   const message = error instanceof Error ? error.message : 'Failed to fetch altitude.';
      //   console.error('Failed to fetch elevation:', error);
      //   toast.error(`Elevation Error: ${message}. Is the Elevation API enabled in Google Cloud Console?`);
      // }

      onMapClick(lat, lng, altitude);
    },
    [onMapClick]
  );

  return {
    handleMapClick,
  };
}
