import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/features/ui/card';
import { Send, MapPin, Move, Loader2, ArrowLeft, X } from 'lucide-react';
import { GCPMap } from './GCPMap';
import { InteractiveImageOverlay } from './InteractiveImageOverlay';
import { DraggableImageControls } from './DraggableImageControls';
import { OverlayView } from '@react-google-maps/api';
import { toast } from 'sonner';
import { GCP, UploadedImage } from '../types';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Layers, Eye, EyeOff, Lock, Unlock, Trash2, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/features/ui/tooltip';

function OverlaySidebar({ 
  images, 
  activeImageId, 
  mapInstance,
  handleUnlockSpecificImage, 
  handleToggleLock, 
  handleRemoveFromMap,
  handleToggleVisibility
}: {
  images: UploadedImage[];
  activeImageId: string | null;
  mapInstance: google.maps.Map | null;
  handleUnlockSpecificImage: (img: UploadedImage) => void;
  handleToggleLock: () => void;
  handleRemoveFromMap: (id: string) => void;
  handleToggleVisibility: (id: string) => void;
}) {
  const onMapImages = images.filter(img => img.id === activeImageId || img.isLocked);

  if (onMapImages.length === 0) return null;

  const handleNavigateToImage = (img: UploadedImage) => {
    if (!mapInstance) return;
    if (img.bounds) {
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(img.bounds.south, img.bounds.west),
        new google.maps.LatLng(img.bounds.north, img.bounds.east)
      );
      mapInstance.fitBounds(bounds);
    } else if (img.id === activeImageId) {
      toast.info("Image is currently unlocked. Realign and lock it to save its bounds.");
    }
  };

  return (
    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-50 flex items-center group">
      {/* Trigger icon */}
      <div className="bg-white py-4 px-1 rounded-r-md shadow-[2px_0_8px_rgba(0,0,0,0.15)] cursor-pointer border border-l-0 border-border group-hover:hidden transition-colors hover:bg-muted/50">
        <ChevronRight size={20} className="text-gray-700" />
      </div>

      {/* Expanded panel */}
      <TooltipProvider>
        <div className="hidden group-hover:flex flex-col bg-white rounded-r-md shadow-[4px_0_12px_rgba(0,0,0,0.15)] border border-l-0 border-border w-72 h-[60vh] overflow-hidden transition-all origin-left animate-in fade-in slide-in-from-left-2 duration-200">
        <div className="p-3 border-b border-border bg-muted/30 font-semibold text-sm flex items-center gap-2">
          <Layers size={16} /> Map Overlays
        </div>
        <div className="p-2 flex flex-col gap-2 overflow-y-auto h-full">
          {onMapImages.map(img => {
             const isActive = img.id === activeImageId;
             return (
               <div key={img.id} className="flex flex-col p-2 rounded-md bg-muted/50 border border-transparent hover:border-border/50 transition-colors group/item">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="relative cursor-pointer mb-2 rounded overflow-hidden" 
                        onClick={() => handleNavigateToImage(img)}
                      >
                    <img 
                      src={img.processedUrl || img.url} 
                      alt={img.name} 
                      className="w-[200px] mx-auto object-contain shadow-sm border border-border group-hover/item:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black/60 text-white p-2 rounded-full shadow-lg">
                        <MapPin size={24} />
                      </div>
                    </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to locate on map</p>
                  </TooltipContent>
                </Tooltip>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-800 flex-1 min-w-0" title={img.name}>
                      {img.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <button onClick={() => handleToggleVisibility(img.id)} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all">
                            {img.isHidden ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-blue-600" />}
                         </button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>Toggle Visibility</p>
                       </TooltipContent>
                     </Tooltip>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <button 
                           onClick={() => {
                             if (isActive) {
                               handleToggleLock();
                             } else {
                               if (activeImageId) {
                                 toast.error("Previous image must be locked before editing a new one.");
                               } else {
                                 handleUnlockSpecificImage(img);
                               }
                             }
                           }} 
                           className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all"
                         >
                            {isActive ? <Unlock size={14} className="text-orange-500" /> : <Lock size={14} className="text-green-600" />}
                         </button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>{isActive ? "Lock Image" : "Unlock Image"}</p>
                       </TooltipContent>
                     </Tooltip>
                      <Tooltip>
                       <TooltipTrigger asChild>
                         <button onClick={() => handleRemoveFromMap(img.id)} className="p-1.5 hover:bg-white hover:shadow-sm rounded text-red-500 transition-all">
                            <Trash2 size={14} />
                         </button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>Remove</p>
                       </TooltipContent>
                     </Tooltip>
                   </div>
                 </div>
               </div>
             )
          })}
        </div>
      </div>
      </TooltipProvider>
    </div>
  )
}

function GmStylePortal({ children, mapContainerRef }: { children: React.ReactNode, mapContainerRef: React.RefObject<HTMLDivElement | null> }) {
  const [targetNode, setTargetNode] = useState<Element | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    let overlayContainer: HTMLDivElement | null = null;

    // The .gm-style element is created asynchronously by Google Maps
    const findGmStyle = () => {
      const el = mapContainerRef.current?.querySelector('.gm-style');
      if (el) {
        overlayContainer = document.createElement('div');
        overlayContainer.className = 'custom-overlay-container pointer-events-none';
        overlayContainer.style.position = 'absolute';
        overlayContainer.style.inset = '0';
        overlayContainer.style.zIndex = '0'; // Match base map z-index so controls sit on top

        // Insert immediately after the first child (which contains the map tiles/panes)
        // This ensures our overlay sits ABOVE the map, but BELOW the controls (which are subsequent children)
        if (el.firstChild && el.firstChild.nextSibling) {
          el.insertBefore(overlayContainer, el.firstChild.nextSibling);
        } else {
          el.appendChild(overlayContainer);
        }

        setTargetNode(overlayContainer);
        return true;
      }
      return false;
    };

    if (!findGmStyle()) {
      const interval = setInterval(() => {
        if (findGmStyle()) {
          clearInterval(interval);
        }
      }, 100);
      return () => {
        clearInterval(interval);
        if (overlayContainer && overlayContainer.parentNode) {
          overlayContainer.parentNode.removeChild(overlayContainer);
        }
      };
    }
    return () => {
      if (overlayContainer && overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
      }
    };
  }, [mapContainerRef]);

  if (!targetNode) return null;
  return createPortal(children, targetNode);
}

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
  isLoading: boolean;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  projectionRef: React.MutableRefObject<google.maps.MapCanvasProjection | null>;
  mapInstance: google.maps.Map | null;
  setMapInstance: (map: google.maps.Map | null) => void;
  onMapClick: (lat: number, lng: number, altitude?: number | null) => void;
  handleMarkerDragEnd: (id: string, lat: number, lng: number) => void;
  localTransform: any;
  handleTransformChange: (transform: any) => void;
  handleRemoveFromMap: (id: string) => void;
  handleToggleLock: () => void;
  handleControlsPosChange: (id: string, pos: any) => void;
  handleUnlockSpecificImage: (img: UploadedImage) => void;
  handleToggleVisibility: (id: string) => void;
  onBack?: () => void;
}

export function MapOverlayAlignment({
  images, gcps, activeImageId, activeImage, setActiveImageId, isLocked, opacity, setOpacity, mode, setMode,
  handleSubmit, isLoading, mapContainerRef, imageRef, projectionRef, mapInstance, setMapInstance, onMapClick, handleMarkerDragEnd,
  localTransform, handleTransformChange, handleRemoveFromMap, handleToggleLock, handleControlsPosChange, handleUnlockSpecificImage, handleToggleVisibility,
  onBack
}: MapOverlayAlignmentProps) {
  const imageUrl = activeImage?.processedUrl || activeImage?.url || null;
  const userPointsCount = gcps.filter(g => g.pointType === 'user').length;
  const isGenerateDisabled = isLoading || userPointsCount < 3;
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);

  useEffect(() => {
    if (isLocked) {
      setIsWarningDismissed(false);
    }
  }, [isLocked, userPointsCount]);

  return (
    <>
      {isLocked && userPointsCount < 3 && !isWarningDismissed && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg shadow-lg border border-destructive/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-medium">
            ⚠️ Add at least 3 points around edge ({userPointsCount}/3)
          </span>
          <button 
            type="button" 
            onClick={() => setIsWarningDismissed(true)} 
            className="p-1 hover:bg-destructive-foreground/10 rounded-full transition-colors"
            aria-label="Close warning"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors self-start xl:self-center mt-1 xl:mt-0"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              <div>
                <CardTitle>Map Overlay Alignment</CardTitle>
                <CardDescription>
                  {isLocked 
                    ? 'Image is locked to the map. Zoom freely to plot accurate points.' 
                    : 'Drag an image here, align it, then click the lock button.'}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-muted/50 px-3 py-1 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Opacity</span>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.05" 
                    value={opacity} 
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-20 accent-primary"
                  />
                </div>
                
                <div className="h-5 w-px bg-border mx-0.5"></div>
                
                <div className="flex bg-background rounded-md shadow-sm border border-border p-0.5">
                  <button
                    onClick={() => {
                      if (mode !== 'align') {
                        setMode('align');
                        toast.info('Switched to Align mode');
                      }
                    }}
                    disabled={isLocked || !activeImageId}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                      mode === 'align' && !isLocked ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                    }`}
                  >
                    <Move size={13} /> Align
                  </button>
                  <button
                    onClick={() => {
                      if (mode !== 'point') {
                        setMode('point');
                        toast.info('Switched to Add Point mode');
                      }
                    }}
                    disabled={!activeImageId}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                      mode === 'point' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                    }`}
                  >
                    <MapPin size={13} /> Add Point
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  if (userPointsCount < 3) {
                    e.preventDefault();
                    toast.error('Please select at least 3 points around the map image edge to generate TIFF and GeoJSON.');
                    return;
                  }
                  handleSubmit();
                }}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-md shadow-sm transition-colors ${
                  isGenerateDisabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400'
                    : 'bg-[#FF8A4C] hover:bg-[#F27D3F]'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Generating TIFF and GeoJSON...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Generate TIFF and GeoJSON
                  </>
                )}
              </button>
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
          <OverlaySidebar 
            images={images}
            activeImageId={activeImageId}
            mapInstance={mapInstance}
            handleUnlockSpecificImage={handleUnlockSpecificImage}
            handleToggleLock={handleToggleLock}
            handleRemoveFromMap={handleRemoveFromMap}
            handleToggleVisibility={handleToggleVisibility}
          />
          <GCPMap 
            gcps={gcps.filter(g => {
              const img = images.find(i => i.id === g.imageId);
              return img && !img.isHidden;
            })}
            onMapClick={onMapClick} 
            onProjectionChange={(proj) => { projectionRef.current = proj; }}
            onMapLoad={setMapInstance}
            onMarkerDragEnd={handleMarkerDragEnd}
          >
            {/* The InteractiveImageOverlay needs to be inside .gm-style to sit under the map controls. 
                We'll use a local state to find it and createPortal. */}
            <GmStylePortal mapContainerRef={mapContainerRef}>
              {activeImageId && !isLocked && imageUrl && !activeImage?.isHidden && (
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
            </GmStylePortal>
            
          </GCPMap>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
