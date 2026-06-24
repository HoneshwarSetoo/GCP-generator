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
  }),
});

export const { useCreateGCPPointsMutation } = gcpApi;
