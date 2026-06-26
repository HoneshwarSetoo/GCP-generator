'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Download, RotateCcw, Image as ImageIcon, MapPin, Archive, CheckCircle, FileCheck, Layers } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Rectangle, GroundOverlay } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMapsConfig';
import { GCP, UploadedImage } from '../types';
import JSZip from 'jszip';

interface GCPDownloadStepProps {
  tiffDataUrl: string | null;
  tiffFileName: string;
  images: UploadedImage[];
  gcps: GCP[];
  onDownload: () => void;
  onReset: () => void;
}

export function GCPDownloadStep({
  tiffDataUrl,
  tiffFileName,
  images,
  gcps,
  onDownload,
  onReset,
}: GCPDownloadStepProps) {
  const [selectedImageId, setSelectedImageId] = useState<string>(images[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'image' | 'map'>('image');
  const [fileSize, setFileSize] = useState<string>('Loading...');
  const [zipFiles, setZipFiles] = useState<string[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const { isLoaded: isMapLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const selectedImage = useMemo(() => 
    images.find((img) => img.id === selectedImageId) || images[0],
    [images, selectedImageId]
  );

  const selectedImageGcps = useMemo(() => 
    gcps.filter((gcp) => gcp.imageId === selectedImage?.id),
    [gcps, selectedImage]
  );

  // Fetch actual file size from the generated blob URL
  useEffect(() => {
    if (!tiffDataUrl) return;
    fetch(tiffDataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const size = blob.size;
        if (size < 1024 * 1024) {
          setFileSize(`${(size / 1024).toFixed(1)} KB`);
        } else {
          setFileSize(`${(size / (1024 * 1024)).toFixed(2)} MB`);
        }
      })
      .catch(() => setFileSize('Unknown'));
  }, [tiffDataUrl]);

  // Read zip contents if batch output
  useEffect(() => {
    if (tiffDataUrl && tiffFileName.endsWith('.zip')) {
      fetch(tiffDataUrl)
        .then((res) => res.blob())
        .then(async (blob) => {
          const zip = new JSZip();
          const content = await zip.loadAsync(blob);
          setZipFiles(Object.keys(content.files));
        })
        .catch(() => {});
    }
  }, [tiffDataUrl, tiffFileName]);

  const mapCenter = useMemo(() => {
    const bounds = selectedImage?.bounds;
    if (bounds) {
      return {
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2,
      };
    }
    return { lat: 18.52043, lng: 73.856744 };
  }, [selectedImage]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const isZip = tiffFileName.endsWith('.zip');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* Left Column: Preview */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => {
                  setSelectedImageId(img.id);
                  setImageSize(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all shrink-0 ${
                  img.id === selectedImageId
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-muted/50 border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {img.name}
              </button>
            ))}
          </div>
        )}

        <Card className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
          <CardHeader className="py-3 bg-muted/20 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">{selectedImage?.name}</CardTitle>
            </div>
            <div className="flex bg-muted rounded-md p-0.5 border">
              <button
                onClick={() => setActiveTab('image')}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                  activeTab === 'image' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                GCP Preview
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                  activeTab === 'map' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Map Location
              </button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex items-center justify-center relative bg-checker-pattern min-h-[350px]">
            {activeTab === 'image' ? (
              <div className="relative max-w-full max-h-[50vh] p-4 flex items-center justify-center">
                <img
                  src={selectedImage?.url}
                  alt={selectedImage?.name}
                  onLoad={handleImageLoad}
                  className="max-w-full max-h-[45vh] object-contain rounded-md shadow-sm select-none"
                />
                {imageSize && selectedImageGcps.map((gcp, idx) => {
                  const left = (gcp.pxcel_x / imageSize.width) * 100;
                  const top = (gcp.pxcel_y / imageSize.height) * 100;
                  return (
                    <div
                      key={gcp.id || idx}
                      className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-primary border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-md transition-all scale-100 hover:scale-125"
                      style={{ left: `${left}%`, top: `${top}%` }}
                      title={`${gcp.label} (Lat: ${gcp.geo_lat.toFixed(6)}, Lon: ${gcp.geo_lon.toFixed(6)})`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-full min-h-[350px]">
                {isMapLoaded && selectedImage?.bounds ? (
                  <GoogleMap
                    mapContainerClassName="w-full h-full min-h-[350px]"
                    center={mapCenter}
                    zoom={15}
                    onLoad={(map) => {
                      if (selectedImage.bounds) {
                        const boundsObj = new google.maps.LatLngBounds(
                          new google.maps.LatLng(selectedImage.bounds.south, selectedImage.bounds.west),
                          new google.maps.LatLng(selectedImage.bounds.north, selectedImage.bounds.east)
                        );
                        map.fitBounds(boundsObj);
                      }
                    }}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    <GroundOverlay
                      url={selectedImage.processedUrl || selectedImage.url}
                      bounds={selectedImage.bounds}
                      options={{
                        opacity: 0.85,
                        clickable: false,
                      }}
                    />
                    <Rectangle
                      bounds={selectedImage.bounds}
                      options={{
                        strokeColor: '#FB924E',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#FB924E',
                        fillOpacity: 0,
                      }}
                    />
                  </GoogleMap>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-muted-foreground h-full min-h-[350px]">
                    <MapPin className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Image boundary is not locked or maps API is not loaded.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Download Card */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <Card className="shadow-sm border-primary/20 bg-primary-50/5 dark:bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  Ready to Download
                </CardTitle>
                <CardDescription>
                  Georeferenced files generated successfully.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata Card */}
            <div className="p-4 rounded-xl border bg-muted/30 backdrop-blur-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2.5 items-center min-w-0">
                  {isZip ? (
                    <Archive className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Layers className="h-5 w-5 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground" title={tiffFileName}>
                      {tiffFileName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isZip ? 'ZIP Archive' : 'GeoTIFF Image'}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                  Ready
                </div>
              </div>

              <div className="h-px bg-border/60" />

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">File Size</span>
                  <strong className="text-foreground font-semibold mt-0.5 block">{fileSize}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Images Mapped</span>
                  <strong className="text-foreground font-semibold mt-0.5 block">{images.length} Image(s)</strong>
                </div>
              </div>
            </div>

            {/* Zip contents list */}
            {isZip && zipFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Archive Contents ({zipFiles.length})
                </p>
                <div className="max-h-36 overflow-y-auto border rounded-lg bg-background p-2 space-y-1.5 custom-scrollbar text-xs">
                  {zipFiles.map((file) => (
                    <div key={file} className="flex items-center gap-2 p-1.5 hover:bg-muted/40 rounded transition-colors text-muted-foreground hover:text-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="truncate">{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={onDownload}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg shadow-md transition-all hover:scale-[1.01]"
              >
                <Download className="h-4 w-4" />
                Download {isZip ? 'ZIP Package' : 'GeoTIFF'}
              </Button>

              <Button
                variant="outline"
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 border-border text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Start New Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tip text */}
        <p className="text-xs text-muted-foreground/80 leading-relaxed px-1">
          💡 <strong>Tip:</strong> The GeoTIFF format maps absolute latitude/longitude coordinates to image pixels. You can load this output file directly into standard GIS software like QGIS, ArcGIS, or Google Earth Pro.
        </p>
      </div>
    </div>
  );
}
