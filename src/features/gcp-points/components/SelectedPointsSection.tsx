import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { GCPList } from './GCPList';
import { GCP, UploadedImage } from '../types';

interface SelectedPointsSectionProps {
  gcps: GCP[];
  activeImage: UploadedImage | null;
  handleRemoveGcp: (id: string) => void;
  handleSubmit: () => void;
  isLoading: boolean;
}

export function SelectedPointsSection({ gcps, activeImage, handleRemoveGcp, handleSubmit, isLoading }: SelectedPointsSectionProps) {
  const activeGcps = activeImage ? gcps.filter(g => g.imageId === activeImage.id) : [];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Selected Points</CardTitle>
        <CardDescription>
          {activeImage ? `${activeGcps.length} points selected for ${activeImage.name}` : 'Select an image to see points'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeImage ? (
          <GCPList gcps={activeGcps} onRemove={handleRemoveGcp} />
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">No image selected</div>
        )}
        
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
              Send All Points
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
