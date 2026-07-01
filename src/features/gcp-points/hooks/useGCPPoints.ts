import { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { GCP, UploadedImage } from '../types';
import { toast } from 'sonner';
import { useCreateGCPPointsMutation } from '@/store/api/gcpApi';

export function useGCPPoints() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [gcps, setGcps] = useState<GCP[]>([]);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  const [tiffDataUrl, setTiffDataUrl] = useState<string | null>(null);
  const [tiffFileName, setTiffFileName] = useState<string>('output.tif');
  const [geojsonDataUrl, setGeojsonDataUrl] = useState<string | null>(null);
  const [geojsonFileName, setGeojsonFileName] = useState<string>('selected_points.geojson');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [createGCPPoints, { isLoading: isCreatingGCPPoints }] = useCreateGCPPointsMutation();

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, onSuccess?: () => void) => {
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
      onSuccess?.();
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
      geo_lat: Number(lat.toFixed(7)),
      geo_lon: Number(lng.toFixed(7)),
      altitude: altitude,
      status: 'mapped',
      pointType: 'user',
    };
    setGcps((prev) => [...prev, newGcp]);
    toast.success('GCP point added');
  }, [gcps.length, activeImageId]);

  const setMultiplePoints = useCallback((points: Omit<GCP, 'id' | 'label' | 'status' | 'imageId'>[]) => {
    if (!activeImageId) return;
    const newGcps = points.map((p, i) => ({
      ...p,
      geo_lat: Number(p.geo_lat.toFixed(7)),
      geo_lon: Number(p.geo_lon.toFixed(7)),
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
            geo_lat: Number(lat.toFixed(7)),
            geo_lon: Number(lng.toFixed(7)),
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
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    const userPoints = gcps.filter(g => g.pointType === 'user');
    if (userPoints.length < 3) {
      toast.error('Please select at least 3 points around the map image to generate TIFF and GeoJSON.');
      return false;
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

        const trimmedGcps = imageGcps.map(g => ({
          ...g,
          geo_lat: Number(g.geo_lat.toFixed(7)),
          geo_lon: Number(g.geo_lon.toFixed(7))
        }));

        if (isBatch) {
          // Batch: append all images and their GCP arrays in parallel arrays
          formData.append('images', imageBlob, image.name);
          formData.append('points', JSON.stringify(trimmedGcps));
        } else {
          // Single: use the simpler single-image field names
          formData.append('image', imageBlob, image.name);
          formData.append('points', JSON.stringify(trimmedGcps));
        }
      }

      const buffer = await createGCPPoints({ formData, isBatch }).unwrap();

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

      // Generate GeoJSON from user selected points
      const userPointsList = gcps.filter(gcp => gcp.pointType === 'user');
      if (userPointsList.length >= 3) {
        const polygonCoordinates = userPointsList.map(point => [Number(point.geo_lon.toFixed(7)), Number(point.geo_lat.toFixed(7))]);
        // Close the polygon by adding the first point to the end
        polygonCoordinates.push([...polygonCoordinates[0]]);

        const geojson = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [polygonCoordinates],
                crs: {
                  properties: { name: "EPSG:4326" },
                  type: "name"
                }
              },
              properties: {
                "felt:color": "#C93535",
                "felt:fillOpacity": 0.25,
                "felt:id": crypto.randomUUID(),
                "felt:locked": false,
                "felt:ordering": Date.now(),
                "felt:showArea": false,
                "felt:strokeOpacity": 1,
                "felt:strokeStyle": "solid",
                "felt:strokeWidth": 2,
                "felt:type": "Polygon"
              }
            }
          ]
        };
        const geojsonBlob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
        setGeojsonDataUrl(URL.createObjectURL(geojsonBlob));
        setGeojsonFileName('selected_points.geojson');
      } else {
        toast.error('Could not generate GeoJSON: At least 3 points are required.');
        setGeojsonDataUrl(null);
        return false;
      }

      toast.success(
        isBatch
          ? `Batch complete — ${imageEntries.length} GeoTIFFs ready as ZIP`
          : 'GeoTIFF generated successfully'
      );
      return true;
    } catch (error) {
      const message = getSubmitErrorMessage(error);
      console.error('Failed to generate GeoTIFF:', message);
      toast.error(`Failed to generate GeoTIFF: ${message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [createGCPPoints, gcps, images]);

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
    setGeojsonDataUrl(null);
    setGcps([]);
    setImages([]);
    setActiveImageId(null);
  }, []);

  const handleDownloadGeojson = useCallback(() => {
    if (!geojsonDataUrl) return;
    const link = document.createElement('a');
    link.href = geojsonDataUrl;
    link.download = geojsonFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [geojsonDataUrl, geojsonFileName]);

  return {
    gcps,
    setGcps,
    images,
    setImages,
    activeImageId,
    setActiveImageId,
    isLoading: isLoading || isCreatingGCPPoints,
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
    setTiffDataUrl,
    tiffFileName,
    handleDownload,
    geojsonDataUrl,
    setGeojsonDataUrl,
    geojsonFileName,
    handleDownloadGeojson,
    handleReset,
  };
}

function getSubmitErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;

    if (typeof data === 'string') return data;
    if (data instanceof ArrayBuffer) {
      return new TextDecoder().decode(data) || 'Server returned an error';
    }
    if (typeof data === 'object' && data !== null) {
      if ('detail' in data && typeof data.detail === 'string') return data.detail;
      if ('error' in data && typeof data.error === 'string') return data.error;
      return JSON.stringify(data);
    }
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  return 'Unknown error';
}
