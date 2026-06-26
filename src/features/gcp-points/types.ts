export interface GCP {
  id?: string;
  imageId?: string;
  label?: string;
  pxcel_x: number;
  pxcel_y: number;
  geo_lat: number;
  geo_lon: number;
  altitude?: number | null;
  residual?: number;
  status?: 'mapped' | 'surveyed';
}

export interface GCPPayload {
  points: {
    image_id: string,
    gcp_points: GCP[]
  }[];
}

export interface UploadedImage {
  id: string;
  name: string;
  url: string;
  processedUrl?: string;
  processingStatus?: 'idle' | 'processing' | 'done' | 'error';
  isLocked: boolean;
  bounds: { north: number; south: number; east: number; west: number } | null;
  dimensions: { width: number; height: number } | null;
  transform: { x: number; y: number; scale: number; rotation: number };
  controlsPos?: { edge: 'top' | 'bottom' | 'left' | 'right'; percent: number };
  isHidden?: boolean;
}

export type WorkflowStep = 'upload' | 'process' | 'custom_crop' | 'align' | 'download';
