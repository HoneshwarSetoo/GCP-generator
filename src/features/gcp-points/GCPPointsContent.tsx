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
import { WorkflowStepper } from './components/WorkflowStepper';
import { BatchProcessSection } from './components/BatchProcessSection';
import { CustomCropSection } from './components/CustomCropSection';
import { GCPDownloadStep } from './components/GCPDownloadStep';
import { RenderHealthStatus } from './components/RenderHealthStatus';
import { FullScreenLoader } from './components/FullScreenLoader';
import { useWorkflowStepper } from './hooks/useWorkflowStepper';
import { useEffect, useState } from 'react';
import { WorkflowStep } from './types';


export function GCPPointsContent() {
  const {
    gcps, setGcps, images, setImages, activeImageId, setActiveImageId,
    isLoading, promptMessage, setPromptMessage, handleImageUpload,
    handleAddPoint, handleRemoveGcp, handleSubmit,
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
  } = useGCPPoints();

  const {
    opacity, setOpacity, mode, setMode, mapInstance, setMapInstance,
    activeImage, isLocked, imageBounds, imageDimensions,
    localTransform, handleTransformChange,
  } = useGCPMapState(images, setImages, activeImageId);

  const { currentStep, setCurrentStep, goToProcess, goToCustomCrop, goToAlign, goToUpload } = useWorkflowStepper();
  const [customCropImageId, setCustomCropImageId] = useState<string | undefined>(undefined);
  const [pendingBackStep, setPendingBackStep] = useState<WorkflowStep | null>(null);

  const stepsOrder: WorkflowStep[] = ['upload', 'process', 'custom_crop', 'align', 'download'];

  const resetStepState = (fromStep: WorkflowStep, toStep: WorkflowStep) => {
    const fromIndex = stepsOrder.indexOf(fromStep);
    const toIndex = stepsOrder.indexOf(toStep);
    if (toIndex >= fromIndex) return;

    if (toStep === 'upload') {
      handleReset();
      return;
    }

    if (fromIndex >= 4 && toIndex < 4) {
      setTiffDataUrl(null);
      setGeojsonDataUrl(null);
    }

    if (fromIndex >= 3 && toIndex < 3) {
      setGcps([]);
      setImages(prev => prev.map(img => ({
        ...img,
        isLocked: false,
        bounds: null,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        controlsPos: undefined
      })));
    }

    if (fromIndex >= 1 && toIndex < 1) {
      setImages(prev => prev.map(img => ({
        ...img,
        processedUrl: undefined,
        processingStatus: 'idle'
      })));
    }
  };

  const handleStepNavigation = (targetStep: WorkflowStep) => {
    const currentIndex = stepsOrder.indexOf(currentStep);
    const targetIndex = stepsOrder.indexOf(targetStep);

    if (currentStep === 'download' && targetStep === 'align') {
      resetStepState(currentStep, targetStep);
      setCurrentStep(targetStep);
      return;
    }

    if (targetIndex < currentIndex && images.length > 0) {
      setPendingBackStep(targetStep);
    } else {
      if (targetIndex < currentIndex) {
        resetStepState(currentStep, targetStep);
      }
      setCurrentStep(targetStep);
    }
  };

  const handleCustomCrop = (imageId?: string) => {
    setCustomCropImageId(imageId);
    goToCustomCrop();
  };

  const onUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, () => {
      goToProcess();
    });
  };

  const onSubmitTiff = async () => {
    const success = await handleSubmit();
    if (success) {
      setCurrentStep('download');
    }
  };

  const onResetSession = () => {
    handleReset();
    setCurrentStep('upload');
  };

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

      <WorkflowStepper currentStep={currentStep} onStepClick={handleStepNavigation} />

      {currentStep === 'upload' && (
        <ImageUploadSection handleImageUpload={onUploadImage} />
      )}

      {currentStep === 'process' && (
        <BatchProcessSection 
          images={images} 
          setImages={setImages} 
          onCustomCrop={handleCustomCrop} 
          onProceed={goToAlign} 
          onBack={() => handleStepNavigation('upload')}
        />
      )}

      {currentStep === 'custom_crop' && (
        <CustomCropSection 
          images={images} 
          setImages={setImages} 
          onBack={() => handleStepNavigation('process')} 
          onProceed={goToAlign} 
          initialImageId={customCropImageId}
        />
      )}

      {currentStep === 'align' && images.length > 0 && (
        <>
          <UploadedImagesSection
            images={images}
            activeImageId={activeImageId}
            setActiveImageId={setActiveImageId}
            activeImage={activeImage}
            setMode={setMode}
          />
          <MapOverlayAlignment
            images={images} gcps={gcps} activeImageId={activeImageId} activeImage={activeImage}
            setActiveImageId={setActiveImageId} isLocked={isLocked} opacity={opacity} setOpacity={setOpacity}
            mode={mode} setMode={setMode} handleSubmit={onSubmitTiff} isLoading={isLoading} mapContainerRef={mapContainerRef}
            imageRef={imageRef} projectionRef={projectionRef} mapInstance={mapInstance} setMapInstance={setMapInstance}
            onMapClick={interactions.onMapClick} handleMarkerDragEnd={interactions.handleMarkerDragEnd}
            localTransform={localTransform} handleTransformChange={handleTransformChange}
            handleRemoveFromMap={interactions.handleRemoveFromMap} handleToggleLock={interactions.handleToggleLock}
            handleControlsPosChange={interactions.handleControlsPosChange} handleUnlockSpecificImage={interactions.handleUnlockSpecificImage}
            handleToggleVisibility={interactions.handleToggleVisibility}
            onBack={() => handleStepNavigation('process')}
          />
        </>
      )}

      {currentStep === 'download' && (
        <GCPDownloadStep
          tiffDataUrl={tiffDataUrl}
          tiffFileName={tiffFileName}
          geojsonDataUrl={geojsonDataUrl}
          geojsonFileName={geojsonFileName}
          images={images}
          gcps={gcps}
          onDownload={handleDownload}
          onDownloadGeojson={handleDownloadGeojson}
          onReset={onResetSession}
        />
      )}

      <RenderHealthStatus />

      {isLoading && (
        <FullScreenLoader message="Generating TIFF and GeoJSON..." />
      )}

      {/* Confirmation Modal for Moving Back */}
      {pendingBackStep && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Move Back to Previous Step?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you move back and modify your images or points, you may lose your current progress or need to re-generate downstream outputs like GeoTIFF files.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingBackStep(null)}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = pendingBackStep;
                  setPendingBackStep(null);
                  if (target) {
                    resetStepState(currentStep, target);
                    setCurrentStep(target);
                  }
                }}
                className="px-4 py-2 rounded-md bg-[#FF8A4C] hover:bg-[#F27D3F] text-white text-sm font-medium transition-colors shadow-sm"
              >
                Yes, Move Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
