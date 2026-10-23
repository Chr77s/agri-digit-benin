import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { Alert, Notification, OutboxMessage, Paginated, SendResult } from '../../shared/api/types';

export const useAlerts = () =>
  useQuery({ queryKey: ['alerts'], queryFn: async () => rows(await api<Paginated<Alert> | Alert[]>('/alerts')) });

export function useAlertActions() {
  const qc = useQueryClient();
  const done = () => { void qc.invalidateQueries({ queryKey: ['alerts'] }); void qc.invalidateQueries({ queryKey: ['outbox'] }); };
  return {
    create: useMutation({ mutationFn: (b: Omit<Alert, 'id' | 'status'>) => api<Alert>('/alerts', { method: 'POST', body: b }), onSuccess: done }),
    approve: useMutation({ mutationFn: (id: string) => api<Alert>(`/alerts/${id}/approve`, { method: 'POST', body: {} }), onSuccess: done }),
    send: useMutation({ mutationFn: (id: string) => api<SendResult>(`/alerts/${id}/send`, { method: 'POST', body: {} }), onSuccess: done }),
  };
}

export const useNotifications = (opts?: { refetchInterval?: number; refetchIntervalInBackground?: boolean }) =>
  useQuery({ ...opts, queryKey: ['notifications'], queryFn: async () => rows(await api<Paginated<Notification> | Notification[]>('/notifications')) });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'POST', body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
}

export const useOutbox = (channel: string) =>
  useQuery({ queryKey: ['outbox', channel], queryFn: async () => rows(await api<Paginated<OutboxMessage> | OutboxMessage[]>(`/outbox${qs({ channel, page_size: 100 })}`)), refetchInterval: 5000 });
