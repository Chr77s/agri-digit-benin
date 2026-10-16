import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { Campaign, CampaignCreate, Paginated, Parcel, ParcelCreate, Stage } from '../../shared/api/types';
import { postOrQueue } from '../outbox/offlineQueue';

export const useParcels = (producer?: string) =>
  useQuery({ queryKey: ['parcels', producer], queryFn: async () => rows(await api<Paginated<Parcel> | Parcel[]>(`/parcels${qs({ producer })}`)) });

export function useCreateParcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ParcelCreate) => postOrQueue<Parcel>('/parcels', b, `Parcelle « ${b.name} »`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcels'] }),
  });
}

export const useCampaigns = () =>
  useQuery({ queryKey: ['campaigns'], queryFn: async () => rows(await api<Paginated<Campaign> | Campaign[]>('/campaigns')) });

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CampaignCreate) => postOrQueue<Campaign>('/campaigns', b, `Campagne ${b.value_chain} ${b.season}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useSetStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) => api<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: { stage } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
