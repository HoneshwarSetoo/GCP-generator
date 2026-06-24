'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useGCPPoints } from './hooks/useGCPPoints';
import { GCPMap } from './components/GCPMap';
import { GCPList } from './components/GCPList';
import { InteractiveImageOverlay } from './components/InteractiveImageOverlay';
import { Button } from '@/features/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Send, Loader2, Upload, X, MapPin, Move, Lock, Unlock } from 'lucide-react';
import { GroundOverlay } from '@react-google-maps/api';

export function GCPPointsContent() {
  const { 
    gcps, 
    isLoading, 
    imageUrl, 
    promptMessage,
    setPromptMessage,
    handleImageUpload, 
    handleAddPoint, 
    handleRemoveGcp, 
    handleSubmit 
  } = useGCPPoints();

  const [opacity, setOpacity] = useState(0.5);
  const [mode, setMode] = useState<'align' | 'point'>('align');
  const [isLocked, setIsLocked] = useState(false);
  const [imageBounds, setImageBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const projectionRef = useRef<google.maps.MapCanvasProjection | null>(null);

  const handleToggleLock = useCallback(() => {
    if (isLocked) {
      setIsLocked(false);
      setImageBounds(null);
      return;
    }

    const proj = projectionRef.current;
    const img = imageRef.current;
    const mapDiv = mapContainerRef.current;

    if (!proj || !img || !mapDiv) {
      setPromptMessage('Map projection or image not ready.');
      return;
    }

    const imgRect = img.getBoundingClientRect();
    const mapRect = mapDiv.getBoundingClientRect();

    const topLeftPixel = { x: imgRect.left - mapRect.left, y: imgRect.top - mapRect.top };
    const bottomRightPixel = { x: imgRect.right - mapRect.left, y: imgRect.bottom - mapRect.top };

    const sw = proj.fromContainerPixelToLatLng({ x: topLeftPixel.x, y: bottomRightPixel.y });
    const ne = proj.fromContainerPixelToLatLng({ x: bottomRightPixel.x, y: topLeftPixel.y });

    if (!sw || !ne) {
      setPromptMessage('Failed to calculate geographic bounds');
      return;
    }

    setImageBounds({
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng()
    });
    
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setIsLocked(true);
    setMode('point'); // Auto-switch to point mode when locked
  }, [isLocked, setPromptMessage]);

  const onMapClick = useCallback((lat: number, lng: number, altitude?: number | null) => {
    if (mode !== 'point') return;
    
    if (!isLocked || !imageBounds || !imageDimensions) {
      setPromptMessage('Please lock the image to the map first before adding points.');
      return;
    }

    // Check if the click is within the geographic bounds of the image
    if (
      lat > imageBounds.north || 
      lat < imageBounds.south || 
      lng > imageBounds.east || 
      lng < imageBounds.west
    ) {
      setPromptMessage('Please click within the overlaid image to add a point.');
      return;
    }

    const fractionX = (lng - imageBounds.west) / (imageBounds.east - imageBounds.west);
    const fractionY = (imageBounds.north - lat) / (imageBounds.north - imageBounds.south);

    const pixelX = fractionX * imageDimensions.width;
    const pixelY = fractionY * imageDimensions.height;

    handleAddPoint(lat, lng, pixelX, pixelY, altitude);
  }, [mode, isLocked, imageBounds, imageDimensions, handleAddPoint, setPromptMessage]);

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
          Upload an image, align it over the map, lock it, and then add GCP points.
        </p>
      </div>

      {!imageUrl ? (
        <Card className="shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Upload Map Image</h3>
              <p className="text-sm text-muted-foreground mb-4">Select a PNG or JPG file to georeference</p>
              <label className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm transition-colors">
                Select File
                <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                  <CardTitle>Map Overlay Alignment</CardTitle>
                  <CardDescription>
                    {isLocked 
                      ? 'Image is locked to the map. Zoom freely to plot accurate points.' 
                      : 'Drag and scale the image to align it with the map below, then click Lock.'}
                  </CardDescription>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-muted/50 p-2 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Opacity</span>
                    <input 
                      type="range" 
                      min="0.1" max="1" step="0.05" 
                      value={opacity} 
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-24 accent-primary"
                    />
                  </div>
                  
                  <div className="h-6 w-px bg-border mx-1"></div>
                  
                  <div className="flex bg-background rounded-md shadow-sm border border-border p-0.5">
                    <button
                      onClick={() => { setMode('align'); setIsLocked(false); }}
                      disabled={isLocked}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                        mode === 'align' && !isLocked ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                      }`}
                    >
                      <Move size={14} /> Align
                    </button>
                    <button
                      onClick={() => setMode('point')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                        mode === 'point' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <MapPin size={14} /> Add Point
                    </button>
                  </div>

                  <div className="h-6 w-px bg-border mx-1"></div>

                  <button
                    onClick={handleToggleLock}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md shadow-sm border transition-colors ${
                      isLocked 
                        ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' 
                        : 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                    }`}
                  >
                    {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                    {isLocked ? 'Unlock Image' : 'Lock to Map'}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <div ref={mapContainerRef} className="w-full relative">
                <GCPMap 
                  gcps={gcps} 
                  onMapClick={onMapClick} 
                  onProjectionChange={(proj) => { projectionRef.current = proj; }}
                >
                  {!isLocked && (
                    <InteractiveImageOverlay 
                      ref={imageRef}
                      imageUrl={imageUrl} 
                      opacity={opacity} 
                      isInteractive={mode === 'align'} 
                      gcps={gcps}
                    />
                  )}
                  {isLocked && imageBounds && (
                    <GroundOverlay
                      url={imageUrl}
                      bounds={imageBounds}
                      opacity={opacity}
                    />
                  )}
                </GCPMap>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Selected Points</CardTitle>
              <CardDescription>
                {gcps.length} point{gcps.length !== 1 ? 's' : ''} selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <GCPList gcps={gcps} onRemove={handleRemoveGcp} />
              
              <Button 
                className="w-full sm:w-auto" 
                onClick={handleSubmit} 
                disabled={gcps.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Points
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
