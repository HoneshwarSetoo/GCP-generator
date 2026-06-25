import React from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { Upload } from 'lucide-react';

interface ImageUploadSectionProps {
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUploadSection({ handleImageUpload }: ImageUploadSectionProps) {
  return (
    <Card className="shadow-sm border-2 border-dashed bg-muted/30 hover:bg-muted/50 transition-colors">
      <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="p-4 bg-background rounded-full shadow-sm mb-2 border">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg">Upload Map Images</h3>
          <p className="text-sm text-muted-foreground mb-6 mt-1">Select or drop PNG, JPG, or ZIP files here</p>
          <label className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm">
            Select Files
            <input type="file" multiple className="hidden" accept="image/png, image/jpeg, application/zip, .zip" onChange={handleImageUpload} />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
