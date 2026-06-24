export interface GCP {
  id?: string;
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
  points: GCP[];
}
