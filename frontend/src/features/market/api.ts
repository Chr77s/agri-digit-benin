import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, list, qs } from '../../shared/api/client';
import type { Match, Offer, OfferType, Payment } from '../../shared/api/types';

export type OfferFilter = { type?: OfferType | ''; value_chain?: string; department?: string };
export type OfferCreate = {
  type: OfferType; value_chain: string; quantity_kg: number; price_xof_per_kg: number;
  department: string; commune: string; description: string;
};
export type PaymentCreate = { match: string; amount_xof: number; payer_phone: string };

export const useOffers = (f: OfferFilter) =>
  useQuery({ queryKey: ['offers', f], queryFn: () => list<Offer>(`/offers${qs(f)}`) });

/** `enabled` à false pour l'administrateur : /matches/mine lui est interdit. */
export const useMatches = (enabled = true) =>
  useQuery({ queryKey: ['matches'], queryFn: () => list<Match>('/matches/mine'), enabled });

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: OfferCreate) => api<Offer>('/offers', { method: 'POST', body: b }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  });
}

export function useContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api<Match>(`/offers/${id}/contact`, { method: 'POST', body: { message } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['matches'] }),
  });
}

export function useOfferStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Offer['status'] }) =>
      api<Offer>(`/offers/${id}/status`, { method: 'POST', body: { status } }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['offers'] }), qc.invalidateQueries({ queryKey: ['matches'] })]),
  });
}

export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      api<Match>(`/matches/${id}/${accept ? 'accept' : 'refuse'}`, { method: 'POST' }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['matches'] }), qc.invalidateQueries({ queryKey: ['offers'] })]),
  });
}

export const useCreatePayment = () =>
  useMutation({ mutationFn: (b: PaymentCreate) => api<Payment>('/payments', { method: 'POST', body: b }) });

/** Interroge le paiement chaque seconde tant qu'il est en attente (FakePay conclut après environ 3 s). */
export const usePayment = (id: string | null) =>
  useQuery({
    queryKey: ['payment', id],
    queryFn: () => api<Payment>(`/payments/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === 'en_attente' ? 1000 : false),
  });

export function useRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Payment>(`/payments/${id}/refund`, { method: 'POST' }),
    onSuccess: (p) => qc.setQueryData(['payment', p.id], p),
  });
}
