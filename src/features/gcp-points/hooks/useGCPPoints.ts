import { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { GCP, UploadedImage } from '../types';
import { toast } from 'sonner';

export function useGCPPoints() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [gcps, setGcps] = useState<GCP[]>([]);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  const [tiffDataUrl, setTiffDataUrl] = useState<string | null>(null);
  const [tiffFileName, setTiffFileName] = useState<string>('output.tif');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.zip')) {
        try {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          for (const relativePath in zipContent.files) {
            const zipEntry = zipContent.files[relativePath];
            if (!zipEntry.dir && zipEntry.name.match(/\.(jpe?g|png|gif)$/i)) {
              const blob = await zipEntry.async('blob');
              const url = URL.createObjectURL(blob);
              newImages.push({
                id: crypto.randomUUID(),
                name: zipEntry.name,
                url,
                isLocked: false,
                bounds: null,
                dimensions: null,
                transform: { x: 0, y: 0, scale: 1, rotation: 0 },
              });
            }
          }
        } catch (err) {
          toast.error(`Failed to extract ZIP: ${file.name}`);
        }
      } else if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newImages.push({
          id: crypto.randomUUID(),
          name: file.name,
          url,
          isLocked: false,
          bounds: null,
          dimensions: null,
          transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        });
      } else {
        toast.error(`File ${file.name} is not a valid image or zip.`);
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      toast.success(`Successfully loaded ${newImages.length} images`);
    }

    // Clear input value to allow uploading the same file again
    e.target.value = '';
  }, []);

  const handleAddPoint = useCallback((lat: number, lng: number, pixelX: number, pixelY: number, altitude?: number | null) => {
    if (!activeImageId) return;
    const newGcp: GCP = {
      id: crypto.randomUUID(),
      imageId: activeImageId,
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
  }, [gcps.length, activeImageId]);

  const setMultiplePoints = useCallback((points: Omit<GCP, 'id' | 'label' | 'status' | 'imageId'>[]) => {
    if (!activeImageId) return;
    const newGcps = points.map((p, i) => ({
      ...p,
      id: crypto.randomUUID(),
      imageId: activeImageId,
      label: `GCP-${i + 1}`,
      status: 'mapped' as const,
    }));
    setGcps(prev => [...prev, ...newGcps]);
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

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setGcps((prev) => prev.filter((gcp) => gcp.imageId !== id));
    if (activeImageId === id) {
      setActiveImageId(null);
    }
    toast.success('Image removed');
  }, [activeImageId]);

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

  /**
   * Sends images + GCPs to the backend as multipart/form-data.
   * - Single image  → POST /api/gcp-points        → returns GeoTIFF binary
   * - Multiple images → POST /api/gcp-points/batch → returns ZIP of GeoTIFFs
   */
  const handleSubmit = useCallback(async () => {
    if (gcps.length === 0) {
      toast.error('No GCP points selected');
      return;
    }

    const pointsByImage = gcps.reduce((acc, gcp) => {
      const imgId = gcp.imageId;
      if (!imgId) return acc;
      if (!acc[imgId]) acc[imgId] = [];
      acc[imgId].push(gcp);
      return acc;
    }, {} as Record<string, GCP[]>);

    const imageEntries = Object.entries(pointsByImage);
    const isBatch = imageEntries.length > 1;

    setIsLoading(true);
    try {
      const formData = new FormData();

      for (const [imageId, imageGcps] of imageEntries) {
        const image = images.find((img) => img.id === imageId);
        if (!image) {
          toast.error(`Image not found for ID: ${imageId}`);
          continue;
        }

        const blobResponse = await fetch(image.url);
        const imageBlob = await blobResponse.blob();

        if (isBatch) {
          // Batch: append all images and their GCP arrays in parallel arrays
          formData.append('images', imageBlob, image.name);
          formData.append('points', JSON.stringify(imageGcps));
        } else {
          // Single: use the simpler single-image field names
          formData.append('image', imageBlob, image.name);
          formData.append('points', JSON.stringify(imageGcps));
        }
      }

      const endpoint = isBatch ? '/api/gcp-points/batch' : '/api/gcp-points';
      const response = await fetch(endpoint, { method: 'POST', body: formData });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error ?? `Server error ${response.status}`);
      }

      const buffer = await response.arrayBuffer();

      if (isBatch) {
        const zipBlob = new Blob([buffer], { type: 'application/zip' });
        setTiffDataUrl(URL.createObjectURL(zipBlob));
        setTiffFileName('georeferenced_batch.zip');
      } else {
        const tifBlob = new Blob([buffer], { type: 'image/tiff' });
        const firstImage = images.find((img) => img.id === imageEntries[0][0]);
        const stem = firstImage?.name.replace(/\.[^.]+$/, '') ?? 'output';
        setTiffDataUrl(URL.createObjectURL(tifBlob));
        setTiffFileName(`${stem}_georef.tif`);
      }

      toast.success(
        isBatch
          ? `Batch complete — ${imageEntries.length} GeoTIFFs ready as ZIP`
          : 'GeoTIFF generated successfully'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to generate GeoTIFF:', message);
      toast.error(`Failed to generate GeoTIFF: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [gcps, images]);

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
    setImages([]);
    setActiveImageId(null);
  }, []);

  return {
    gcps,
    setGcps,
    images,
    setImages,
    activeImageId,
    setActiveImageId,
    isLoading,
    promptMessage,
    setPromptMessage,
    handleImageUpload,
    handleAddPoint,
    handleRemoveGcp,
    handleRemoveImage,
    handleSubmit,
    setMultiplePoints,
    updateGCPPosition,
    tiffDataUrl,
    tiffFileName,
    handleDownload,
    handleReset,
  };
}
