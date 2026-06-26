import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { GCPPayload } from '@/features/gcp-points/types';

export const gcpApi = createApi({
  reducerPath: 'gcpApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  }),
  endpoints: (builder) => ({
    createGCPPoints: builder.mutation<{ success: boolean; message?: string }, GCPPayload>({
      query: (payload) => ({
        url: '/gcp-points',
        method: 'POST',
        body: payload,
      }),
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
  useAutoCropImageMutation, 
  useSaveCustomCropMutation,
  useRemoveBackgroundMutation
} = gcpApi;
