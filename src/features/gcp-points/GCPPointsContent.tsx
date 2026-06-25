'use client';

import React, { useRef } from 'react';
import { useGCPPoints } from './hooks/useGCPPoints';
import { useGCPMapState } from './hooks/useGCPMapState';
import { useGCPMapInteractions } from './hooks/useGCPMapInteractions';
import { X } from 'lucide-react';

import { ImageUploadSection } from './components/ImageUploadSection';
import { UploadedImagesSection } from './components/UploadedImagesSection';
import { MapOverlayAlignment } from './components/MapOverlayAlignment';
import { SelectedPointsSection } from './components/SelectedPointsSection';

export function GCPPointsContent() {
  const { 
    gcps, setGcps, images, setImages, activeImageId, setActiveImageId,
    isLoading, promptMessage, setPromptMessage, handleImageUpload, 
    handleAddPoint, handleRemoveGcp, handleSubmit,
    updateGCPPosition,
  } = useGCPPoints();

  const {
    opacity, setOpacity, mode, setMode, setMapInstance,
    activeImage, isLocked, imageBounds, imageDimensions,
    localTransform, handleTransformChange,
  } = useGCPMapState(images, setImages, activeImageId);

  const imageRef = useRef<HTMLImageElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const projectionRef = useRef<google.maps.MapCanvasProjection | null>(null);
  const savedRenderedWidthRef = useRef<number | null>(null);

  const interactions = useGCPMapInteractions({
    images, setImages, gcps, setGcps, activeImage, activeImageId, setActiveImageId,
    setMode, mode, isLocked, imageBounds, imageDimensions, setPromptMessage,
    projectionRef, mapContainerRef, imageRef, savedRenderedWidthRef,
    localTransform, handleTransformChange, handleAddPoint, updateGCPPosition
  });

  return (
    <div className="space-y-6 relative">
      {promptMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-black/70 backdrop-blur-sm text-white rounded-full shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="text-sm font-medium tracking-wide">{promptMessage}</span>
          <button 
            onClick={() => setPromptMessage(null)} 
            className="text-white/70 hover:text-white transition-colors p-1 -mr-2"
            aria-label="Close prompt"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">GCP Points Selection</h1>
        <p className="text-muted-foreground">
          Upload images, drop them onto the map, lock them, and select points.
        </p>
      </div>

      {images.length === 0 && (
        <ImageUploadSection handleImageUpload={handleImageUpload} />
      )}

      {images.length > 0 && (
        <UploadedImagesSection 
          images={images} 
          activeImageId={activeImageId} 
          setActiveImageId={setActiveImageId}
          activeImage={activeImage}
          setMode={setMode}
        />
      )}

      {images.length > 0 && (
        <>
          <MapOverlayAlignment 
            images={images} gcps={gcps} activeImageId={activeImageId} activeImage={activeImage}
            setActiveImageId={setActiveImageId} isLocked={isLocked} opacity={opacity} setOpacity={setOpacity}
            mode={mode} setMode={setMode} handleSubmit={handleSubmit} mapContainerRef={mapContainerRef}
            imageRef={imageRef} projectionRef={projectionRef} setMapInstance={setMapInstance}
            onMapClick={interactions.onMapClick} handleMarkerDragEnd={interactions.handleMarkerDragEnd}
            localTransform={localTransform} handleTransformChange={handleTransformChange}
            handleRemoveFromMap={interactions.handleRemoveFromMap} handleToggleLock={interactions.handleToggleLock}
            handleControlsPosChange={interactions.handleControlsPosChange} handleUnlockSpecificImage={interactions.handleUnlockSpecificImage}
          />

          {/* <SelectedPointsSection 
            gcps={gcps} activeImage={activeImage} handleRemoveGcp={handleRemoveGcp}
            handleSubmit={handleSubmit} isLoading={isLoading}
          /> */}
        </>
      )}
    </div>
  );
}
