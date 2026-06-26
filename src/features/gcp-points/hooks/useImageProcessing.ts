import { useCallback, useState } from 'react';
import { UploadedImage } from '../types';
import { useAutoCropImageMutation } from '@/store/api/gcpApi';
import { toast } from 'sonner';

export function useImageProcessing(
  images: UploadedImage[], 
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>
) {
  const [autoCropImage] = useAutoCropImageMutation();
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const processImages = useCallback(async () => {
    setIsProcessingAll(true);
    let allSuccess = true;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.processingStatus === 'done') continue;

      // Mark as processing
      setImages(prev => prev.map(p => p.id === img.id ? { ...p, processingStatus: 'processing' } : p));

      try {
        const result = await autoCropImage({ id: img.id, url: img.url }).unwrap();
        
        // Mark as done
        setImages(prev => prev.map(p => p.id === img.id ? { 
          ...p, 
          processingStatus: 'done',
          processedUrl: result.url 
        } : p));
      } catch (error) {
        console.error('Failed to process image:', error);
        allSuccess = false;
        // Mark as error
        setImages(prev => prev.map(p => p.id === img.id ? { ...p, processingStatus: 'error' } : p));
      }
    }

    setIsProcessingAll(false);
    if (allSuccess) {
      toast.success('All images processed successfully');
    } else {
      toast.error('Some images failed to process');
    }
  }, [images, setImages, autoCropImage]);

  const allProcessed = images.length > 0 && images.every(img => img.processingStatus === 'done');

  return {
    processImages,
    isProcessingAll,
    allProcessed
  };
}
