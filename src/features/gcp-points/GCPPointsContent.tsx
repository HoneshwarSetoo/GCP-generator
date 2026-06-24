'use client';

import React from 'react';
import { useGCPPoints } from './hooks/useGCPPoints';
import { GCPMap } from './components/GCPMap';
import { GCPList } from './components/GCPList';
import { ImagePicker } from './components/ImagePicker';
import { Button } from '@/features/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Send, Loader2, Upload, X } from 'lucide-react';

export function GCPPointsContent() {
  const { 
    gcps, 
    isLoading, 
    imageUrl, 
    pendingImageCoords, 
    pendingMapCoords, 
    promptMessage,
    setPromptMessage,
    handleImageUpload, 
    handleImageClick, 
    handleMapClick, 
    handleRemoveGcp, 
    handleSubmit 
  } = useGCPPoints();

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
          Upload an image, then click a point on the image and the corresponding point on the map to create a Ground Control Point.
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Image Picker</CardTitle>
                <CardDescription>
                  Click on the uploaded image to select the source pixel.
                  {pendingImageCoords && !pendingMapCoords && <span className="ml-2 text-yellow-600 font-medium">Now click the map.</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImagePicker
                  imageUrl={imageUrl}
                  gcps={gcps}
                  pendingImageCoords={pendingImageCoords}
                  onImageClick={handleImageClick}
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Map View</CardTitle>
                <CardDescription>
                  Click on the map to select the geographic coordinates.
                  {!pendingImageCoords && pendingMapCoords && <span className="ml-2 text-yellow-600 font-medium">Now click the image.</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GCPMap 
                  gcps={gcps} 
                  pendingMapCoords={pendingMapCoords}
                  onMapClick={handleMapClick} 
                />
              </CardContent>
            </Card>
          </div>

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
