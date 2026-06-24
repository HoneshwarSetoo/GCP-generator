import { useState, useCallback, useEffect } from 'react';
import { GCP } from '../types';
import { useCreateGCPPointsMutation } from '@/store/api/gcpApi';
import { toast } from 'sonner';

export function useGCPPoints() {
  const [gcps, setGcps] = useState<GCP[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pendingImageCoords, setPendingImageCoords] = useState<{ x: number; y: number } | null>(null);
  const [pendingMapCoords, setPendingMapCoords] = useState<{ lat: number; lng: number; altitude?: number | null } | null>(null);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  
  const [createGCPPoints, { isLoading }] = useCreateGCPPointsMutation();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setPendingImageCoords(null);
      setPendingMapCoords(null);
      setGcps([]);
    }
  }, []);

  const handleImageClick = useCallback((x: number, y: number) => {
    setPendingImageCoords({ x, y });
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number, altitude?: number | null) => {
    setPendingMapCoords({ lat, lng, altitude });
  }, []);

  useEffect(() => {
    if (pendingImageCoords && pendingMapCoords) {
      const newGcp: GCP = {
        id: crypto.randomUUID(),
        label: `GCP-${gcps.length + 1}`,
        pxcel_x: pendingImageCoords.x,
        pxcel_y: pendingImageCoords.y,
        geo_lat: pendingMapCoords.lat,
        geo_lon: pendingMapCoords.lng,
        altitude: pendingMapCoords.altitude,
        status: 'mapped',
      };
      setGcps((prev) => [...prev, newGcp]);
      setPendingImageCoords(null);
      setPendingMapCoords(null);
      setPromptMessage(null);
      toast.success('GCP point added');
    } else if (pendingImageCoords && !pendingMapCoords) {
      setPromptMessage('Now click on the map');
    } else if (!pendingImageCoords && pendingMapCoords) {
      setPromptMessage('Now click on the image');
    } else {
      setPromptMessage(null);
    }
  }, [pendingImageCoords, pendingMapCoords, gcps.length]);

  useEffect(() => {
    if (promptMessage) {
      const timer = setTimeout(() => setPromptMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [promptMessage]);

  const handleRemoveGcp = useCallback((id: string) => {
    setGcps((prev) => prev.filter((gcp) => gcp.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (gcps.length === 0) {
      toast.error('No GCP points selected');
      return;
    }

    try {
      await createGCPPoints({ points: gcps }).unwrap();
      toast.success('GCP points submitted successfully');
      setGcps([]); // Clear after successful submission
      setImageFile(null);
      setImageUrl(null);
    } catch (error) {
      console.error('Failed to submit GCPs:', error);
      toast.error('Failed to submit GCP points');
    }
  }, [gcps, createGCPPoints]);

  return {
    gcps,
    isLoading,
    imageUrl,
    pendingImageCoords,
    pendingMapCoords,
    promptMessage,
    setPromptMessage,
    handleImageUpload,
    handleImageClick,
    handleMapClick,
    handleRemoveGcp,
    handleSubmit,
  };
}
