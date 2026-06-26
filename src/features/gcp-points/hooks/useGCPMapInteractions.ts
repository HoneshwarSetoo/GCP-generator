import { useCallback } from 'react';
import { toast } from 'sonner';
import { GCP, UploadedImage } from '../types';

interface UseGCPMapInteractionsProps {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  gcps: GCP[];
  setGcps: React.Dispatch<React.SetStateAction<GCP[]>>;
  activeImage: UploadedImage | null;
  activeImageId: string | null;
  setActiveImageId: (id: string | null) => void;
  setMode: (mode: 'align' | 'point') => void;
  mode: 'align' | 'point';
  isLocked: boolean;
  imageBounds: any;
  imageDimensions: any;
  setPromptMessage: (msg: string | null) => void;
  projectionRef: React.RefObject<google.maps.MapCanvasProjection | null>;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  savedRenderedWidthRef: React.MutableRefObject<number | null>;
  localTransform: { x: number; y: number; scale: number; rotation: number };
  handleTransformChange: (transform: { x: number; y: number; scale: number; rotation: number }) => void;
  handleAddPoint: (lat: number, lng: number, pixelX: number, pixelY: number, altitude?: number | null) => void;
  updateGCPPosition: (id: string, lat: number, lng: number, pxcel_x?: number, pxcel_y?: number) => void;
}

export function useGCPMapInteractions({
  images, setImages, gcps, setGcps, activeImage, activeImageId, setActiveImageId,
  setMode, mode, isLocked, imageBounds, imageDimensions, setPromptMessage,
  projectionRef, mapContainerRef, imageRef, savedRenderedWidthRef,
  localTransform, handleTransformChange, handleAddPoint, updateGCPPosition
}: UseGCPMapInteractionsProps) {

  const handleRemoveFromMap = useCallback((id: string) => {
    setImages(prev => prev.map(img => img.id === id ? {
      ...img,
      isLocked: false,
      bounds: null,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 }
    } : img));
    setGcps(prev => prev.filter(gcp => gcp.imageId !== id));
    if (activeImageId === id) {
      setActiveImageId(null);
    }
    setMode('align');
    toast.success('Image removed from map');
  }, [activeImageId, setImages, setGcps, setActiveImageId, setMode]);

  const handleUnlockSpecificImage = useCallback((img: UploadedImage) => {
    setActiveImageId(img.id);
    const proj = projectionRef.current;
    const mapDiv = mapContainerRef.current;
    
    if (proj && mapDiv && img.bounds && savedRenderedWidthRef.current) {
      const swPixel = proj.fromLatLngToContainerPixel(new google.maps.LatLng(img.bounds.south, img.bounds.west));
      const nePixel = proj.fromLatLngToContainerPixel(new google.maps.LatLng(img.bounds.north, img.bounds.east));
      
      if (swPixel && nePixel) {
        const renderedW = nePixel.x - swPixel.x;
        const renderedH = swPixel.y - nePixel.y;
        
        const originalRatio = (img.dimensions?.width || 1) / (img.dimensions?.height || 1);
        const renderedRatio = renderedW / renderedH;
        
        let scale = 1;
        if (Math.abs(originalRatio - renderedRatio) > 0.01) {
          const expectedH = renderedW / originalRatio;
          scale = expectedH / renderedH;
        }

        const mapCenterX = mapDiv.clientWidth / 2;
        const mapCenterY = mapDiv.clientHeight / 2;
        const imgCenterX = swPixel.x + renderedW / 2;
        const imgCenterY = nePixel.y + renderedH / 2;
        
        const tx = imgCenterX - mapCenterX;
        const ty = imgCenterY - mapCenterY;
        
        setImages(prev => prev.map(i => i.id === img.id ? {
          ...i,
          isLocked: false,
          bounds: null,
          transform: { x: tx, y: ty, scale: scale, rotation: 0 }
        } : i));
      }
    } else {
      setImages(prev => prev.map(i => i.id === img.id ? {
        ...i,
        isLocked: false,
        bounds: null
      } : i));
    }
    
    setMode('align');
    setGcps(prev => prev.filter(gcp => gcp.imageId !== img.id));
    toast.success("Image unlocked. Re-align as needed.");
  }, [setActiveImageId, projectionRef, mapContainerRef, savedRenderedWidthRef, setImages, setMode, setGcps]);

  const handleToggleVisibility = useCallback((id: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, isHidden: !img.isHidden } : img));
  }, [setImages]);

  const handleControlsPosChange = useCallback((id: string, pos: { edge: 'top' | 'bottom' | 'left' | 'right'; percent: number }) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, controlsPos: pos } : img));
  }, [setImages]);

  const handleToggleLock = useCallback(() => {
    if (!activeImage) return;

    if (activeImage.isLocked) {
      handleUnlockSpecificImage(activeImage);
      return;
    }

    const proj = projectionRef.current;
    const mapDiv = mapContainerRef.current;

    if (!proj || !mapDiv) {
      setPromptMessage('Map projection not ready.');
      return;
    }

    const imgElement = imageRef.current;
    if (!imgElement) {
      setPromptMessage('Image not loaded.');
      return;
    }

    const imgRect = imgElement.getBoundingClientRect();
    const mapRect = mapDiv.getBoundingClientRect();

    const topLeftPixel = { x: imgRect.left - mapRect.left, y: imgRect.top - mapRect.top };
    const bottomRightPixel = { x: imgRect.right - mapRect.left, y: imgRect.bottom - mapRect.top };

    const sw = proj.fromContainerPixelToLatLng(new google.maps.Point(topLeftPixel.x, bottomRightPixel.y));
    const ne = proj.fromContainerPixelToLatLng(new google.maps.Point(bottomRightPixel.x, topLeftPixel.y));

    if (!sw || !ne) {
      setPromptMessage('Failed to calculate geographic bounds');
      return;
    }

    setImages(prev => prev.map(img => img.id === activeImage.id ? {
      ...img,
      isLocked: true,
      bounds: { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() },
      dimensions: { width: imgElement.naturalWidth, height: imgElement.naturalHeight }
    } : img));
    
    savedRenderedWidthRef.current = imgRect.width / localTransform.scale;
    
    setGcps(prev => {
      const existing = prev.filter(g => g.imageId === activeImage.id);
      if (existing.length === 0) {
        const points: GCP[] = [];
        const cols = 10;
        const rows = 5;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const fractionX = col / (cols - 1);
            const fractionY = row / (rows - 1);
            points.push({
              id: crypto.randomUUID(),
              imageId: activeImage.id,
              label: `GCP-${points.length + 1}`,
              status: 'mapped',
              pxcel_x: Math.round(fractionX * imgElement.naturalWidth),
              pxcel_y: Math.round(fractionY * imgElement.naturalHeight),
              geo_lat: ne.lat() - fractionY * (ne.lat() - sw.lat()),
              geo_lon: sw.lng() + fractionX * (ne.lng() - sw.lng()),
            });
          }
        }
        toast.success('50 points automatically generated');
        return [...prev, ...points];
      } else {
        toast.success('Updated coordinates for existing points');
        return prev.map(gcp => {
          if (gcp.imageId === activeImage.id) {
            const fractionX = gcp.pxcel_x / imgElement.naturalWidth;
            const fractionY = gcp.pxcel_y / imgElement.naturalHeight;
            return {
              ...gcp,
              geo_lat: ne.lat() - fractionY * (ne.lat() - sw.lat()),
              geo_lon: sw.lng() + fractionX * (ne.lng() - sw.lng()),
            };
          }
          return gcp;
        });
      }
    });

    setMode('point');
  }, [activeImage, projectionRef, mapContainerRef, imageRef, localTransform, setImages, setGcps, setMode, setPromptMessage, handleUnlockSpecificImage, savedRenderedWidthRef]);

  const onMapClick = useCallback((lat: number, lng: number, altitude?: number | null) => {
    if (mode !== 'point') return;
    
    if (!isLocked || !imageBounds || !imageDimensions) {
      setPromptMessage('Please lock the image to the map first before adding points.');
      return;
    }

    if (
      lat > imageBounds.north || lat < imageBounds.south || 
      lng > imageBounds.east || lng < imageBounds.west
    ) {
      setPromptMessage('Please click within the overlaid image to add a point.');
      return;
    }

    const fractionX = (lng - imageBounds.west) / (imageBounds.east - imageBounds.west);
    const fractionY = (imageBounds.north - lat) / (imageBounds.north - imageBounds.south);

    const pixelX = Math.round(fractionX * imageDimensions.width);
    const pixelY = Math.round(fractionY * imageDimensions.height);

    handleAddPoint(lat, lng, pixelX, pixelY, altitude);
  }, [mode, isLocked, imageBounds, imageDimensions, handleAddPoint, setPromptMessage]);

  const handleMarkerDragEnd = useCallback((id: string, lat: number, lng: number) => {
    let pixelX: number | undefined;
    let pixelY: number | undefined;

    if (isLocked && imageBounds && imageDimensions) {
      const fractionX = (lng - imageBounds.west) / (imageBounds.east - imageBounds.west);
      const fractionY = (imageBounds.north - lat) / (imageBounds.north - imageBounds.south);

      pixelX = Math.round(fractionX * imageDimensions.width);
      pixelY = Math.round(fractionY * imageDimensions.height);
    }

    updateGCPPosition(id, lat, lng, pixelX, pixelY);
  }, [isLocked, imageBounds, imageDimensions, updateGCPPosition]);

  return {
    handleRemoveFromMap,
    handleUnlockSpecificImage,
    handleControlsPosChange,
    handleToggleLock,
    onMapClick,
    handleMarkerDragEnd,
    handleToggleVisibility
  };
}
