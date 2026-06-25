import { useState, useCallback, useEffect } from 'react';
import { GCP } from '../types';
import { useCreateGCPPointsMutation } from '@/store/api/gcpApi';
import { toast } from 'sonner';

export function useGCPPoints() {
  const [gcps, setGcps] = useState<GCP[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  
  const [createGCPPoints, { isLoading }] = useCreateGCPPointsMutation();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setGcps([]);
    }
  }, []);

  const handleAddPoint = useCallback((lat: number, lng: number, pixelX: number, pixelY: number, altitude?: number | null) => {
    const newGcp: GCP = {
      id: crypto.randomUUID(),
      label: `GCP-${gcps.length + 1}`,
      pxcel_x: pixelX,
      pxcel_y: pixelY,
      geo_lat: lat,
      geo_lon: lng,
      altitude: altitude,
      status: 'mapped',
    };
    setGcps((prev) => [...prev, newGcp]);
    toast.success('GCP point added');
  }, [gcps.length]);

  const setMultiplePoints = useCallback((points: Omit<GCP, 'id' | 'label' | 'status'>[]) => {
    const newGcps = points.map((p, i) => ({
      ...p,
      id: crypto.randomUUID(),
      label: `GCP-${i + 1}`,
      status: 'mapped' as const,
    }));
    setGcps(newGcps);
    if (points.length > 0) {
      toast.success(`${points.length} points automatically generated`);
    }
  }, []);

  useEffect(() => {
    if (promptMessage) {
      const timer = setTimeout(() => setPromptMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [promptMessage]);

  const handleRemoveGcp = useCallback((id: string) => {
    setGcps((prev) => prev.filter((gcp) => gcp.id !== id));
    toast.success('GCP point removed');
  }, []);

  const updateGCPPosition = useCallback((id: string, lat: number, lng: number, pxcel_x?: number, pxcel_y?: number) => {
    setGcps((prev) => 
      prev.map((gcp) => {
        if (gcp.id === id) {
          toast.success(`Position updated for ${gcp.label}`);
          return {
            ...gcp,
            geo_lat: lat,
            geo_lon: lng,
            ...(pxcel_x !== undefined ? { pxcel_x } : {}),
            ...(pxcel_y !== undefined ? { pxcel_y } : {}),
          };
        }
        return gcp;
      })
    );
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
    promptMessage,
    setPromptMessage,
    handleImageUpload,
    handleAddPoint,
    handleRemoveGcp,
    handleSubmit,
    setMultiplePoints,
    updateGCPPosition,
  };
}
