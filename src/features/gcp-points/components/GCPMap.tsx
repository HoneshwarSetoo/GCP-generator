import React, { useRef, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, type GoogleMapProps } from '@react-google-maps/api';
import { GCP } from '../types';
import { useGCPMap } from '../hooks/useGCPMap';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMapsConfig';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.5rem',
};

interface GCPMapProps {
  gcps: GCP[];
  pendingMapCoords: { lat: number; lng: number; altitude?: number | null } | null;
  onMapClick: (lat: number, lng: number, altitude?: number | null) => void;
}

export function GCPMap({ gcps, pendingMapCoords, onMapClick }: GCPMapProps) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_CONFIG);
  const { handleMapClick } = useGCPMap({ onMapClick });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [center, setCenter] = useState({ lat: 18.52043, lng: 73.856744 });

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onLoadAutocomplete = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCenter({ lat, lng });
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
      }
    }
  }, []);

  const handleGoogleMapClick = useCallback((event: Parameters<NonNullable<GoogleMapProps['onClick']>>[0]) => {
    if (!event.latLng) {
      return;
    }

    void handleMapClick({
      latLng: {
        lat: () => event.latLng!.lat(),
        lng: () => event.latLng!.lng(),
      },
    });
  }, [handleMapClick]);

  if (loadError) {
    return <div className="p-4 text-red-500">Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div className="flex h-125 items-center justify-center bg-gray-100 rounded-lg">Loading Map...</div>;
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden shadow-sm relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onClick={handleGoogleMapClick}
        onLoad={onLoadMap}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[80%] max-w-sm z-10">
          <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
            <input
              type="text"
              placeholder="Search map..."
              className="w-full px-4 py-2 rounded-md shadow-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white text-gray-800"
            />
          </Autocomplete>
        </div>

        {gcps.map((gcp) => (
          <Marker
            key={gcp.id}
            position={{ lat: gcp.geo_lat, lng: gcp.geo_lon }}
            label={{
              text: gcp.label ?? `GCP-${gcp.id ?? '1'}`,
              className: 'bg-white px-1 py-0.5 rounded text-xs font-semibold shadow-sm mt-8',
            }}
          />
        ))}

        {pendingMapCoords && (
          <Marker
            position={{ lat: pendingMapCoords.lat, lng: pendingMapCoords.lng }}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
