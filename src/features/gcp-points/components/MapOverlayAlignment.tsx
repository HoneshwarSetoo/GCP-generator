import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/features/ui/card';
import { Send, MapPin, Move } from 'lucide-react';
import { GCPMap } from './GCPMap';
import { InteractiveImageOverlay } from './InteractiveImageOverlay';
import { DraggableImageControls } from './DraggableImageControls';
import { OverlayView } from '@react-google-maps/api';
import { toast } from 'sonner';
import { GCP, UploadedImage } from '../types';

interface MapOverlayAlignmentProps {
  images: UploadedImage[];
  gcps: GCP[];
  activeImageId: string | null;
  activeImage: UploadedImage | null;
  setActiveImageId: (id: string | null) => void;
  isLocked: boolean;
  opacity: number;
  setOpacity: (val: number) => void;
  mode: 'align' | 'point';
  setMode: (mode: 'align' | 'point') => void;
  handleSubmit: () => void;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  projectionRef: React.MutableRefObject<google.maps.MapCanvasProjection | null>;
  setMapInstance: (map: google.maps.Map | null) => void;
  onMapClick: (lat: number, lng: number, altitude?: number | null) => void;
  handleMarkerDragEnd: (id: string, lat: number, lng: number) => void;
  localTransform: any;
  handleTransformChange: (transform: any) => void;
  handleRemoveFromMap: (id: string) => void;
  handleToggleLock: () => void;
  handleControlsPosChange: (id: string, pos: any) => void;
  handleUnlockSpecificImage: (img: UploadedImage) => void;
}

export function MapOverlayAlignment({
  images, gcps, activeImageId, activeImage, setActiveImageId, isLocked, opacity, setOpacity, mode, setMode,
  handleSubmit, mapContainerRef, imageRef, projectionRef, setMapInstance, onMapClick, handleMarkerDragEnd,
  localTransform, handleTransformChange, handleRemoveFromMap, handleToggleLock, handleControlsPosChange, handleUnlockSpecificImage
}: MapOverlayAlignmentProps) {
  const imageUrl = activeImage?.url || null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <CardTitle>Map Overlay Alignment</CardTitle>
            <CardDescription>
              {isLocked 
                ? 'Image is locked to the map. Zoom freely to plot accurate points.' 
                : 'Drag an image here, align it, then click the lock button.'}
            </CardDescription>
          </div>

          <button
              onClick={handleSubmit}
              disabled={gcps.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF8A4C] text-white hover:bg-[#F27D3F] text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              <Send size={16} /> Generate TIFF
            </button>
          
          <div className="flex flex-wrap items-center gap-4 bg-muted/50 p-2 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Opacity</span>
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={opacity} 
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-24 accent-primary"
              />
            </div>
            
            <div className="h-6 w-px bg-border mx-1"></div>
            
            <div className="flex bg-background rounded-md shadow-sm border border-border p-0.5">
              <button
                onClick={() => {
                  if (mode !== 'align') {
                    setMode('align');
                    toast.info('Switched to Align mode');
                  }
                }}
                disabled={isLocked || !activeImageId}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                  mode === 'align' && !isLocked ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                }`}
              >
                <Move size={14} /> Align
              </button>
              <button
                onClick={() => {
                  if (mode !== 'point') {
                    setMode('point');
                    toast.info('Switched to Add Point mode');
                  }
                }}
                disabled={!activeImageId}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                  mode === 'point' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                }`}
              >
                <MapPin size={14} /> Add Point
              </button>
            </div>
          </div>
          
        </div>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <div 
          ref={mapContainerRef} 
          className="w-full relative"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={(e) => {
            e.preventDefault();
            const imgId = e.dataTransfer.getData('imageId');
            if (!imgId) return;
            
            if (activeImageId && activeImageId !== imgId && activeImage && !activeImage.isLocked) {
              toast.error("Previous image must be locked before editing a new one.");
              return;
            }
            setActiveImageId(imgId);
            const droppedImage = images.find(img => img.id === imgId);
            if (droppedImage && !droppedImage.isLocked) {
              setMode('align');
            }
            toast.success("Image dropped to map");
          }}
        >
          <GCPMap 
            gcps={gcps}
            onMapClick={onMapClick} 
            onProjectionChange={(proj) => { projectionRef.current = proj; }}
            onMapLoad={setMapInstance}
            onMarkerDragEnd={handleMarkerDragEnd}
          >
            {activeImageId && !isLocked && imageUrl && (
              <InteractiveImageOverlay 
                ref={imageRef}
                imageUrl={imageUrl} 
                opacity={opacity} 
                isInteractive={mode === 'align'} 
                gcps={gcps.filter(g => g.imageId === activeImageId)}
                transform={localTransform}
                onTransformChange={handleTransformChange}
                onRemove={() => handleRemoveFromMap(activeImageId)}
                onLock={handleToggleLock}
                controlsPos={activeImage?.controlsPos}
                onControlsPosChange={(pos) => handleControlsPosChange(activeImageId, pos)}
              />
            )}
            
            {images.filter(img => img.isLocked && img.bounds).map(img => {
              const bounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(img.bounds!.south, img.bounds!.west),
                new google.maps.LatLng(img.bounds!.north, img.bounds!.east)
              );
              return (
              <OverlayView
                key={`close-${img.id}`}
                bounds={bounds}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="w-full h-full pointer-events-none absolute inset-0">
                  <DraggableImageControls
                    isLocked={true}
                    onToggleLock={() => handleUnlockSpecificImage(img)}
                    onRemove={() => handleRemoveFromMap(img.id)}
                    title={`${img.name} Controls`}
                    posState={img.controlsPos}
                    onPosChange={(pos) => handleControlsPosChange(img.id, pos)}
                  />
                </div>
              </OverlayView>
              );
            })}
          </GCPMap>
        </div>
      </CardContent>
    </Card>
  );
}
