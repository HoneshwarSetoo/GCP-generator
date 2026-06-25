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

/**
 * The API accepts multipart/form-data with two fields:
 *   - image  : the raw JPG/PNG File object
 *   - points : JSON.stringify(GCP[])
 * We use the native FormData type for the mutation payload.
 */
export type GCPFormPayload = FormData;
