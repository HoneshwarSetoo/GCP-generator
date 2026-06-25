import { GCPPayload } from '@/features/gcp-points/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Converts a binary Response to a base64 data URL string.
 * This keeps Redux state fully serializable (no Blob objects in state).
 */
async function tiffResponseToDataUrl(response: Response): Promise<string> {
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read TIFF response'));
    reader.readAsDataURL(blob);
  });
}

export const gcpApi = createApi({
  reducerPath: 'gcpApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  }),
  endpoints: (builder) => ({
    /**
     * Sends multipart/form-data (image + GCP JSON) to the Next.js proxy,
     * which forwards to the Python GDAL backend.
     * Returns a base64 data URL string (serializable in Redux state).
     */
    createGeoTiff: builder.mutation<string, GCPPayload>({
      query: (formData) => ({
        url: '/gcp-points',
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type — browser sets the multipart boundary
        responseHandler: tiffResponseToDataUrl,
      }),
    }),
  }),
});

export const { useCreateGeoTiffMutation } = gcpApi;

