import React from 'react';
import { GCP } from '../types';
import { Button } from '@/features/ui/button';
import { Trash2 } from 'lucide-react';

interface GCPListProps {
  gcps: GCP[];
  onRemove: (id: string) => void;
}

export function GCPList({ gcps, onRemove }: GCPListProps) {
  if (gcps.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-gray-50 text-gray-500 text-sm p-4 text-center">
        No GCP points selected yet. Upload an image and click on both the image and the map to add points.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
      {gcps.map((gcp) => (
        <div key={gcp.id} className="flex items-center justify-between rounded-lg border p-3 bg-white shadow-sm">
          <div className="space-y-2 w-full">
            <p className="text-sm font-bold leading-none text-primary">{gcp.label}</p>
            
            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
              <div><span className="font-medium text-gray-700">Image X:</span> {gcp.pxcel_x}</div>
              <div><span className="font-medium text-gray-700">Image Y:</span> {gcp.pxcel_y}</div>
              <div><span className="font-medium text-gray-700">Lat:</span> {gcp.geo_lat.toFixed(6)}</div>
              <div><span className="font-medium text-gray-700">Lng:</span> {gcp.geo_lon.toFixed(6)}</div>
              <div><span className="font-medium text-gray-700">Alt:</span> {gcp.altitude != null ? `${gcp.altitude.toFixed(2)} m` : 'N/A'}</div>
              <div><span className="font-medium text-gray-700">Residual:</span> {gcp.residual != null ? gcp.residual.toFixed(3) : 'N/A'}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
            onClick={() => gcp.id && onRemove(gcp.id)}
            title="Remove GCP"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
