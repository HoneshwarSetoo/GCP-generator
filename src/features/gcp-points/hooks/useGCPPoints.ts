import { useState, useCallback, useEffect } from 'react';
import { GCP } from '../types';
import { useCreateGeoTiffMutation } from '@/store/api/gcpApi';
import { toast } from 'sonner';

export function useGCPPoints() {
  const [gcps, setGcps] = useState<GCP[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  const [tiffDataUrl, setTiffDataUrl] = useState<string | null>(null);
  const [tiffFileName, setTiffFileName] = useState<string>('output.tif');

  const [createGeoTiff, { isLoading }] = useCreateGeoTiffMutation();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setGcps([]);
      setTiffDataUrl(null);
    }
  }, []);

  const handleAddPoint = useCallback(
    (lat: number, lng: number, pixelX: number, pixelY: number, altitude?: number | null) => {
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
    },
    [gcps.length],
  );

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

  const updateGCPPosition = useCallback(
    (id: string, lat: number, lng: number, pxcel_x?: number, pxcel_y?: number) => {
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
        }),
      );
    },
    [],
  );

  /**
   * Sends image + GCPs to the backend, receives GeoTIFF as base64 data URL,
   * and stores it in state for preview. Does not auto-download or reset.
   */
  const handleSubmit = useCallback(async () => {
    if (gcps.length === 0) {
      toast.error('No GCP points selected');
      return;
    }

    if (!imageFile) {
      toast.error('No image file found. Please re-upload the image.');
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('points', JSON.stringify(gcps));

    try {
      const dataUrl = await createGeoTiff(formData).unwrap();
      const baseName = imageFile.name.replace(/\.[^/.]+$/, '');
      setTiffDataUrl(dataUrl);
      setTiffFileName(`georef_${baseName}.tif`);
      toast.success('GeoTIFF generated successfully!');
    } catch (error) {
      console.error('Failed to generate GeoTIFF:', error);
      toast.error('Failed to generate GeoTIFF. Is the Python backend running?');
    }
  }, [gcps, imageFile, createGeoTiff]);

  /** Triggers a browser download of the stored GeoTIFF data URL. */
  const handleDownload = useCallback(() => {
    if (!tiffDataUrl) return;
    const anchor = document.createElement('a');
    anchor.href = tiffDataUrl;
    anchor.download = tiffFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    toast.success(`Downloading ${tiffFileName}`);
  }, [tiffDataUrl, tiffFileName]);

  /** Clears the result and resets the workspace for a new session. */
  const handleReset = useCallback(() => {
    setTiffDataUrl(null);
    setGcps([]);
    setImageFile(null);
    setImageUrl(null);
  }, []);

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
    tiffDataUrl,
    tiffFileName,
    handleDownload,
    handleReset,
  };
}
