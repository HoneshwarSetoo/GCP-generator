import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/features/ui/card';
import { CheckCircle2, Maximize2, X } from 'lucide-react';
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
  const [previewImage, setPreviewImage] = React.useState<UploadedImage | null>(null);
  
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
              className={`relative flex-shrink-0 w-32 rounded-md border-2 overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${
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
              <img src={img.processedUrl || img.url} alt={img.name} className="w-full h-24 object-contain" />
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
              <button 
                onClick={(e) => { e.stopPropagation(); setPreviewImage(img); }}
                className="absolute top-1 left-1 bg-white/90 text-foreground p-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                title="Preview Image"
              >
                <Maximize2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img 
              src={previewImage.processedUrl || previewImage.url} 
              alt={previewImage.name} 
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-md shadow-2xl" 
            />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white transition-colors p-1.5 rounded-full shadow-lg"
            >
              <X size={20} />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-sm truncate px-4 py-3 rounded-b-md">
              {previewImage.name}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
