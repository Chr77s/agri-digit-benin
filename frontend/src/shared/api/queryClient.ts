import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/** Mutations en « always » : par défaut TanStack Query suspend toute mutation hors ligne, et la file locale (postOrQueue) ne s'exécuterait jamais. */
export const makeQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { networkMode: 'always' },
  },
});
