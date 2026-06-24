import React, { useRef, MouseEvent, useState } from 'react';
import { GCP } from '../types';

interface ImagePickerProps {
  imageUrl: string;
  gcps: GCP[];
  pendingImageCoords: { x: number; y: number } | null;
  onImageClick: (x: number, y: number) => void;
}

export function ImagePicker({ imageUrl, gcps, pendingImageCoords, onImageClick }: ImagePickerProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const imageX = clickX * scaleX;
    const imageY = clickY * scaleY;

    onImageClick(imageX, imageY);
  };

  return (
    <div className="w-full flex items-center justify-center bg-gray-100 rounded-lg overflow-auto min-h-125 border shadow-sm p-4">
      <div className="relative inline-block shadow-md">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Map for GCPs"
          onClick={handleImageClick}
          onLoad={() => setLoaded(true)}
          className="bg-white"
          style={{
            maxWidth: "100%",
            maxHeight: "500px",
            objectFit: "contain",
          }}
        />
        
        {loaded && imgRef.current && (
          <>
            {gcps.map((gcp) => {
              const leftPct = (gcp.pxcel_x / imgRef.current!.naturalWidth) * 100;
              const topPct = (gcp.pxcel_y / imgRef.current!.naturalHeight) * 100;
              return (
                <div
                  key={gcp.id}
                  className="absolute w-4 h-4 -ml-2 -mt-2 bg-blue-500 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-1.5 py-0.5 rounded text-xs font-bold shadow-sm text-blue-700 whitespace-nowrap">
                    {gcp.label}
                  </div>
                </div>
              );
            })}

            {pendingImageCoords && (
              <div
                className="absolute w-4 h-4 -ml-2 -mt-2 bg-yellow-500 rounded-full border-2 border-white shadow-md pointer-events-none animate-pulse"
                style={{
                  left: `${(pendingImageCoords.x / imgRef.current.naturalWidth) * 100}%`,
                  top: `${(pendingImageCoords.y / imgRef.current.naturalHeight) * 100}%`,
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
