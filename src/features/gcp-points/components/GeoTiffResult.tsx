'use client';

import React, { useMemo } from 'react';
import { Download, FileCheck, RotateCcw, MapPin, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/features/ui/card';
import { Button } from '@/features/ui/button';

interface GeoTiffResultProps {
  tiffDataUrl: string;
  tiffFileName: string;
  gcpCount: number;
  sourceImageUrl: string | null;
  onDownload: () => void;
  onReset: () => void;
}

function formatBytes(base64: string): string {
  // base64 string length → approximate byte size
  const byteSize = Math.round((base64.length * 3) / 4);
  if (byteSize < 1024 * 1024) return `${(byteSize / 1024).toFixed(1)} KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(2)} MB`;
}

export function GeoTiffResult({
  tiffDataUrl,
  tiffFileName,
  gcpCount,
  sourceImageUrl,
  onDownload,
  onReset,
}: GeoTiffResultProps) {
  const fileSize = useMemo(() => formatBytes(tiffDataUrl), [tiffDataUrl]);

  return (
    <Card className="shadow-sm border-green-200 bg-green-50/40 dark:border-green-900 dark:bg-green-950/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 shrink-0">
              <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-green-800 dark:text-green-300">
                GeoTIFF Generated
              </CardTitle>
              <CardDescription className="text-green-700/70 dark:text-green-400/70">
                Your georeferenced image is ready to download
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2 border-green-300 text-green-800 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/40"
            >
              <RotateCcw className="h-4 w-4" />
              Start New
            </Button>
            <Button
              size="sm"
              onClick={onDownload}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File metadata row */}
        <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-green-200/60 dark:border-green-800/40">
          <div className="flex items-center gap-2 text-sm">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{tiffFileName}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Size: <strong className="text-foreground">{fileSize}</strong></span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span><strong className="text-foreground">{gcpCount}</strong> GCP points applied</span>
          </div>
        </div>

        {/* Preview area */}
        {sourceImageUrl && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source image reference
            </p>
            <div className="relative rounded-lg overflow-hidden border border-green-200/60 dark:border-green-800/40 bg-checker-pattern">
              <img
                src={sourceImageUrl}
                alt="Source image used for georeferencing"
                className="w-full max-h-64 object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                  <FileCheck className="h-3.5 w-3.5 text-green-400" />
                  Georeferenced as GeoTIFF
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 The downloaded <strong>.tif</strong> file contains embedded geographic coordinates
              (WGS84) and can be opened in QGIS, ArcGIS, or any GIS application.
            </p>
          </div>
        )}

        {/* Full-width download button */}
        <Button
          onClick={onDownload}
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-11 text-base dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Download className="h-5 w-5" />
          Download {tiffFileName}
        </Button>
      </CardContent>
    </Card>
  );
}
