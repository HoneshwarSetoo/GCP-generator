import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface BackendHealth {
  status: 'ok' | string;
  service: string;
  version: string;
  uptime_seconds: number;
  container: {
    hostname: string;
    python: string;
    platform: string;
    gdal: string;
  };
  render: {
    service_name: string | null;
    service_id: string | null;
    instance_id: string | null;
    git_commit: string | null;
  };
}

export const gcpApi = createApi({
  reducerPath: 'gcpApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  }),
  endpoints: (builder) => ({
    createGCPPoints: builder.mutation<ArrayBuffer, { formData: FormData; isBatch: boolean }>({
      query: ({ formData, isBatch }) => ({
        url: isBatch ? '/geotiff/batch' : '/geotiff',
        method: 'POST',
        body: formData,
        responseHandler: (response) => response.arrayBuffer(),
      }),
    }),
    checkHealth: builder.query<BackendHealth, void>({
      query: () => '/health',
    }),
    autoCropImage: builder.mutation<{ success: boolean; url: string }, { id: string, url: string }>({
      queryFn: async (arg) => {
        // Mock backend processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Mock returning the same url as the "processed" url for now
        return { data: { success: true, url: arg.url } };
      },
    }),
    saveCustomCrop: builder.mutation<{ success: boolean; url: string }, { id: string, blob: Blob }>({
      queryFn: async (arg) => {
        // Mock S3 upload delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const url = URL.createObjectURL(arg.blob);
        return { data: { success: true, url } };
      },
    }),
    removeBackground: builder.mutation<{ success: boolean; url: string }, { id: string, url: string }>({
      queryFn: async (arg) => {
        // Mock AI background removal delay
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Mock returning the same url as the "processed" url for now
        // In a real app, this would return a URL to a PNG with transparency
        return { data: { success: true, url: arg.url } };
      },
    }),
  }),
});

export const {
  useCreateGCPPointsMutation,
  useCheckHealthQuery,
  useAutoCropImageMutation,
  useSaveCustomCropMutation,
  useRemoveBackgroundMutation
} = gcpApi;
