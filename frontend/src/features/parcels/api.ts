import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { Campaign, CampaignCreate, Paginated, Parcel, ParcelCreate, Stage } from '../../shared/api/types';
import { postOrQueue, sendOrQueue } from '../outbox/offlineQueue';
import i18n from '../../i18n';

export const useParcels = (producer?: string) =>
  useQuery({ queryKey: ['parcels', producer], queryFn: async () => rows(await api<Paginated<Parcel> | Parcel[]>(`/parcels${qs({ producer })}`)) });

export function useCreateParcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ParcelCreate) => postOrQueue<Parcel>('/parcels', b, i18n.t('offline.label.parcel', { name: b.name })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcels'] }),
  });
}

export const useCampaigns = () =>
  useQuery({ queryKey: ['campaigns'], queryFn: async () => rows(await api<Paginated<Campaign> | Campaign[]>('/campaigns')) });

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CampaignCreate) => postOrQueue<Campaign>('/campaigns', b, i18n.t('offline.label.campaign', { crop: b.value_chain, season: b.season })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useSetStage() {
  const qc = useQueryClient();
  return useMutation({
    // UC-25 : base_version = version lue par le client ; en cas de 409 la saisie reste visible dans « Conflits de saisie ».
    mutationFn: ({ id, stage, base_version }: { id: string; stage: Stage; base_version?: number }) =>
      sendOrQueue<Campaign>('PATCH', `/campaigns/${id}`, { stage, base_version }, i18n.t('offline.label.stage', { stage: i18n.t(`stage.${stage}`) })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
