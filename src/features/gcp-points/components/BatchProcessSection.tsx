import React from 'react';
import { UploadedImage } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/features/ui/card';
import { Loader2, Crop, ArrowRight } from 'lucide-react';
import { useImageProcessing } from '../hooks/useImageProcessing';

interface BatchProcessSectionProps {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  onCustomCrop: () => void;
  onProceed: () => void;
}

export function BatchProcessSection({ images, setImages, onCustomCrop, onProceed }: BatchProcessSectionProps) {
  const { processImages, isProcessingAll, allProcessed } = useImageProcessing(images, setImages);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
        <CardTitle className="text-xl">Process Images</CardTitle>
        <div className="flex gap-3">
          <button
            onClick={onCustomCrop}
            className="flex items-center gap-2 px-4 py-2 bg-white text-foreground hover:bg-gray-50 border border-border text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            <Crop size={16} />
            Custom Crop
          </button>
          <button
            onClick={processImages}
            disabled={isProcessingAll || allProcessed || images.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {isProcessingAll && <Loader2 size={16} className="animate-spin" />}
            Auto Crop White Space
          </button>
          <button
            onClick={onProceed}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            Proceed to Generate TIFF
            <ArrowRight size={16} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map(img => (
            <div key={img.id} className="relative aspect-square border rounded-md overflow-hidden bg-muted">
              <img 
                src={img.processedUrl || img.url} 
                alt={img.name} 
                className={`w-full h-full object-cover transition-all ${img.processingStatus === 'processing' ? 'blur-sm scale-105 opacity-50' : ''}`}
              />
              {img.processingStatus === 'processing' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-primary" />
                </div>
              )}
              {img.processingStatus === 'done' && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
                  Done
                </div>
              )}
              {img.processingStatus === 'error' && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                  Error
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] truncate px-2 py-1">
                {img.name}
              </div>
            </div>
          ))}
        </div>


      </CardContent>
    </Card>
  );
}
