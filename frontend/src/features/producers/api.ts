import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { Paginated, Producer, ProducerRegister, ProducerVersion } from '../../shared/api/types';

export const useRegisterProducer = () =>
  useMutation({ mutationFn: (b: ProducerRegister) => api<Producer>('/producers/register', { method: 'POST', body: b }) });

export const useProducers = (f: { status?: string; search?: string }) =>
  useQuery({
    queryKey: ['producers', f],
    queryFn: async () => rows(await api<Paginated<Producer> | Producer[]>(`/producers${qs({ ...f, page_size: 100 })}`)),
  });

export const useProducer = (id: string) =>
  useQuery({ queryKey: ['producer', id], queryFn: () => api<Producer>(`/producers/${id}`) });

export const useProducerVersions = (id: string) =>
  useQuery({
    queryKey: ['producer', id, 'versions'],
    queryFn: async () => rows(await api<Paginated<ProducerVersion> | ProducerVersion[]>(`/producers/${id}/versions`)),
  });

export function useProducerActions(id: string) {
  const qc = useQueryClient();
  const done = () => { void qc.invalidateQueries({ queryKey: ['producer', id] }); void qc.invalidateQueries({ queryKey: ['producers'] }); };
  return {
    validate: useMutation({ mutationFn: () => api<Producer>(`/producers/${id}/validate`, { method: 'POST', body: {} }), onSuccess: done }),
    reject: useMutation({ mutationFn: (reason: string) => api<Producer>(`/producers/${id}/reject`, { method: 'POST', body: { reason } }), onSuccess: done }),
    patch: useMutation({ mutationFn: (b: Partial<Producer>) => api<Producer>(`/producers/${id}`, { method: 'PATCH', body: b }), onSuccess: done }),
  };
}
