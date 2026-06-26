import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { gcpApi } from './api/gcpApi';

export const store = configureStore({
  reducer: {
    [gcpApi.reducerPath]: gcpApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          `${gcpApi.reducerPath}/executeMutation/pending`,
          `${gcpApi.reducerPath}/executeMutation/fulfilled`,
          `${gcpApi.reducerPath}/executeMutation/rejected`,
        ],
        ignoredPaths: [`${gcpApi.reducerPath}.mutations`],
      },
    }).concat(gcpApi.middleware),
});

setupListeners(store.dispatch);

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
