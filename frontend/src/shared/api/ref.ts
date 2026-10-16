import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Department, ValueChain } from './types';
import i18n from '../../i18n';

export const useValueChains = () =>
  useQuery({ queryKey: ['ref', 'value-chains'], queryFn: () => api<ValueChain[]>('/ref/value-chains'), staleTime: Infinity });

export const useDepartments = () =>
  useQuery({ queryKey: ['ref', 'departments'], queryFn: () => api<Department[]>('/ref/departments'), staleTime: Infinity });

/** Libellé lisible d'un code de filière. */
export function useVcName() {
  const q = useValueChains();
  return (code: string) => q.data?.find((v) => v.code === code)?.name ?? code;
}

/** Nom lisible d'un code de département ou de commune (le serveur envoie des codes). */
export function usePlaceName() {
  const q = useDepartments();
  return (code?: string | null) => {
    if (!code) return '';
    for (const d of q.data ?? []) {
      if (d.code === code) return d.name;
      const c = d.communes.find((x) => x.code === code);
      if (c) return c.name;
    }
    return code;
  };
}

/** Props pour <Select> : filières principales, puis « Filières de réserve » dans un groupe à part. */
export const useVcSelect = () => vcSelect(useValueChains().data);
export function vcSelect(data?: ValueChain[]) {
  const all = data ?? [];
  const opt = (v: ValueChain) => ({ value: v.code, label: v.name });
  return {
    options: all.filter((v) => !v.reserve).map(opt),
    groups: [{ label: i18n.t('common.reserveChains'), options: all.filter((v) => v.reserve).map(opt) }],
  };
}
