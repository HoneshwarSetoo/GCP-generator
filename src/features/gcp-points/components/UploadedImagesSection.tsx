import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/features/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { UploadedImage } from '../types';
import { toast } from 'sonner';

interface UploadedImagesSectionProps {
  images: UploadedImage[];
  activeImageId: string | null;
  setActiveImageId: (id: string | null) => void;
  activeImage: UploadedImage | null;
  setMode: (mode: 'align' | 'point') => void;
}

export function UploadedImagesSection({ images, activeImageId, setActiveImageId, activeImage, setMode }: UploadedImagesSectionProps) {
  if (images.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Uploaded Images</CardTitle>
        <CardDescription>Select an image from the list below</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {images.map(img => (
            <div 
              key={img.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('imageId', img.id); }}
              className={`relative flex-shrink-0 w-32 rounded-md border-2 overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                img.id === activeImageId ? 'border-primary shadow-sm' : 'border-border opacity-80'
              }`}
              onClick={() => {
                 if (activeImageId && activeImageId !== img.id && activeImage && !activeImage.isLocked) {
                   toast.error("Please lock the active image before switching.");
                   return;
                 }
                 setActiveImageId(img.id);
                 if (!img.isLocked) {
                   setMode('align');
                 }
                 if (activeImageId !== img.id) {
                   toast.info(`Selected ${img.name} for map overlay`);
                 }
              }}
            >
              <img src={img.url} alt={img.name} className="w-full h-24 object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 backdrop-blur-sm text-xs text-white truncate text-center" title={img.name}>
                {img.name}
              </div>
              <div className="absolute top-1 right-1 flex gap-1 items-center">
                {img.isLocked && (
                  <div className="bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 size={14} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
