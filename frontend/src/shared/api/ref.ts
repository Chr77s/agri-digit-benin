import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Department, ValueChain } from './types';

export const useValueChains = () =>
  useQuery({ queryKey: ['ref', 'value-chains'], queryFn: () => api<ValueChain[]>('/ref/value-chains'), staleTime: Infinity });

export const useDepartments = () =>
  useQuery({ queryKey: ['ref', 'departments'], queryFn: () => api<Department[]>('/ref/departments'), staleTime: Infinity });

/** Libellé lisible d'un code de filière. */
export function useVcName() {
  const q = useValueChains();
  return (code: string) => q.data?.find((v) => v.code === code)?.name ?? code;
}
