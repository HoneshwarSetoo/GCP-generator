import React, { useRef, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, OverlayView, Polygon, Polyline, type GoogleMapProps } from '@react-google-maps/api';
import { GCP } from '../types';
import { useGCPMap } from '../hooks/useGCPMap';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMapsConfig';
import { toast } from 'sonner';

const containerStyle = {
  width: '100%',
  height: '700px',
  minHeight: '60vh',
  borderRadius: '0.5rem',
};

interface GCPMapProps {
  gcps: GCP[];
  onMapClick: (lat: number, lng: number, altitude?: number | null) => void;
  onProjectionChange?: (projection: google.maps.MapCanvasProjection | null) => void;
  onMapLoad?: (map: google.maps.Map | null) => void;
  onMarkerDragEnd?: (id: string, lat: number, lng: number) => void;
  children?: React.ReactNode;
}

export function GCPMap({ gcps, onMapClick, onProjectionChange, onMapLoad, onMarkerDragEnd, children }: GCPMapProps) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_CONFIG);
  const { handleMapClick } = useGCPMap({ onMapClick });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const markerRefs = useRef<{ [key: string]: google.maps.Marker }>({});
  const [center, setCenter] = useState({ lat: 18.52043, lng: 73.856744 });
  const inputRef = useRef<HTMLInputElement>(null);

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (onMapLoad) onMapLoad(map);
  }, [onMapLoad]);

  const onLoadAutocomplete = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const searchLocation = useCallback((query: string) => {
    if (!query || !query.trim()) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query.trim() }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results.length > 0 && results[0].geometry.location) {
        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();
        setCenter({ lat, lng });
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
      } else {
        toast.error(`Location "${query}" not found on map.`);
      }
    });
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (!place || !place.geometry || !place.geometry.location) {
        const query = inputRef.current?.value || place?.name;
        if (query) {
          searchLocation(query);
        }
        return;
      }
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCenter({ lat, lng });
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(15);
      }
    }
  }, [searchLocation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        return;
      }
      const query = inputRef.current?.value || '';
      if (query.trim()) {
        searchLocation(query);
      }
    }
  }, [searchLocation]);

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
          fullscreenControl: false,
          zoomControl: false,
        }}
      >
        <OverlayView
          position={center}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          onLoad={(overlay) => {
            if (onProjectionChange) {
              onProjectionChange(overlay.getProjection());
            }
          }}
          onUnmount={() => {
            if (onProjectionChange) {
              onProjectionChange(null);
            }
          }}
        >
          <div style={{ display: 'none' }} />
        </OverlayView>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[80%] max-w-sm z-10">
          <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search map..."
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 rounded-md shadow-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white text-gray-800"
            />
          </Autocomplete>
        </div>

        {gcps.filter(gcp => gcp.pointType !== 'auto').map((gcp) => (
          <Marker
            key={gcp.id}
            onLoad={(marker) => {
              if (gcp.id) markerRefs.current[gcp.id] = marker;
            }}
            position={{ lat: gcp.geo_lat, lng: gcp.geo_lon }}
            draggable={true}
            onDragEnd={() => {
              if (onMarkerDragEnd && gcp.id) {
                const marker = markerRefs.current[gcp.id];
                const pos = marker?.getPosition();
                if (pos) {
                  onMarkerDragEnd(gcp.id, pos.lat(), pos.lng());
                }
              }
            }}
            icon={typeof google !== 'undefined' ? {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#ffffff',
              scale: 5,
            } : undefined}
            /* label={{
              text: gcp.label ?? `GCP-${gcp.id ?? '1'}`,
              className: 'bg-white px-1 py-0.5 rounded text-xs font-semibold shadow-sm mt-8',
            }} */
          />
        ))}

        {(() => {
          const userPoints = gcps.filter(gcp => gcp.pointType !== 'auto');
          if (userPoints.length > 2) {
            const path = userPoints.map(gcp => ({ lat: gcp.geo_lat, lng: gcp.geo_lon }));
            return (
              <Polygon
                path={path}
                options={{
                  fillColor: '#FF8A4C',
                  fillOpacity: 0.35,
                  strokeColor: '#FF8A4C',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
            );
          } else if (userPoints.length === 2) {
            const path = userPoints.map(gcp => ({ lat: gcp.geo_lat, lng: gcp.geo_lon }));
            return (
              <Polyline
                path={path}
                options={{
                  strokeColor: '#FF8A4C',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
            );
          }
          return null;
        })()}

        {children}
      </GoogleMap>
    </div>
  );
}
