import { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadedImage } from '../types';

export function useGCPMapState(
  images: UploadedImage[], 
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>,
  activeImageId: string | null
) {
  const [opacity, setOpacity] = useState(0.5);
  const [mode, setMode] = useState<'align' | 'point'>('align');
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const activeImage = useMemo(() => images.find(img => img.id === activeImageId) || null, [images, activeImageId]);
  
  const isLocked = activeImage?.isLocked || false;
  const imageBounds = activeImage?.bounds || null;
  const imageDimensions = activeImage?.dimensions || null;
  const imageUrl = activeImage?.url || null;

  const [localTransform, setLocalTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });

  useEffect(() => {
    if (activeImage) {
      setLocalTransform(activeImage.transform);
    }
  }, [activeImage?.id]);

  const handleTransformChange = useCallback((transform: { x: number; y: number; scale: number; rotation: number }) => {
    setLocalTransform(transform);
    if (activeImageId) {
      setImages(prev => prev.map(img => img.id === activeImageId ? { ...img, transform } : img));
    }
  }, [activeImageId, setImages]);

  // Manage Native Overlays for ALL locked images
  useEffect(() => {
    if (!mapInstance) return;

    const overlays: google.maps.GroundOverlay[] = [];

    images.forEach(img => {
      if (img.isLocked && img.bounds && img.url && !img.isHidden) {
        const overlayOpacity = img.id === activeImageId ? opacity : 0.8;
        const overlay = new google.maps.GroundOverlay(img.url, img.bounds, { opacity: overlayOpacity, clickable: false });
        overlay.setMap(mapInstance);
        overlays.push(overlay);
      }
    });

    return () => {
      overlays.forEach(overlay => overlay.setMap(null));
    };
  }, [images, mapInstance, opacity, activeImageId]);

  return {
    opacity,
    setOpacity,
    mode,
    setMode,
    mapInstance,
    setMapInstance,
    activeImage,
    isLocked,
    imageBounds,
    imageDimensions,
    imageUrl,
    localTransform,
    handleTransformChange,
  };
}
