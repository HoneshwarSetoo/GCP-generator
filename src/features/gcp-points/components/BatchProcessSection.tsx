import React from 'react';
import { UploadedImage } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/features/ui/card';
import { Loader2, Crop, ArrowRight, X, Maximize2 } from 'lucide-react';
import { useImageProcessing } from '../hooks/useImageProcessing';

interface BatchProcessSectionProps {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  onCustomCrop: (imageId?: string) => void;
  onProceed: () => void;
  onBack: () => void;
}

export function BatchProcessSection({ images, setImages, onCustomCrop, onProceed, onBack }: BatchProcessSectionProps) {
  const { processImages, isProcessingAll, allProcessed } = useImageProcessing(images, setImages);
  const [previewImage, setPreviewImage] = React.useState<UploadedImage | null>(null);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between pb-4 border-b gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight size={16} className="rotate-180" />
            Back
          </button>
          <CardTitle className="text-xl">Process Images</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onCustomCrop()}
            className="flex items-center gap-2 px-4 py-2 bg-white text-foreground hover:bg-gray-50 border border-border text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            <Crop size={16} />
            Custom Crop All
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
            Proceed to Generate TIFF and GeoJSON
            <ArrowRight size={16} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map(img => (
            <div key={img.id} className="relative aspect-square border rounded-md overflow-hidden bg-muted group hover:shadow-md transition-shadow">
              <img 
                src={img.processedUrl || img.url} 
                alt={img.name} 
                className={`w-full h-full object-contain transition-all ${img.processingStatus === 'processing' ? 'blur-sm scale-105 opacity-50' : ''}`}
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
              
              <button 
                onClick={(e) => { e.stopPropagation(); onCustomCrop(img.id); }}
                className="absolute top-2 right-2 bg-white/90 text-foreground p-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                title="Custom Crop"
              >
                <Crop size={14} />
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setPreviewImage(img); }}
                className="absolute top-2 left-2 bg-white/90 text-foreground p-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                title="Preview Image"
              >
                <Maximize2 size={14} />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] truncate px-2 py-1">
                {img.name}
              </div>
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
            <button 
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); onCustomCrop(previewImage.id); }}
              className="absolute top-4 right-4 bg-primary text-primary-foreground p-2 rounded shadow-lg hover:bg-primary/90 transition-colors tooltip flex items-center gap-2"
              title="Edit in Custom Crop"
            >
              <Crop size={16} /> <span className="text-sm font-medium">Crop / Edit</span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
