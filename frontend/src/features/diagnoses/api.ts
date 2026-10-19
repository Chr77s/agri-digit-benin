import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, list } from '../../shared/api/client';
import type { Diagnosis } from '../../shared/api/types';

/** L'endpoint image exige le jeton : on récupère l'octet-flux, l'appelant en fait une URL d'objet. */
export const fetchDiagnosisImage = (id: string, signal: AbortSignal): Promise<Blob> =>
  api<Blob>(`/diagnoses/${id}/image`, { raw: true, signal });

export const useDiagnoses = () => useQuery({ queryKey: ['diagnoses'], queryFn: () => list<Diagnosis>('/diagnoses') });

export function useCreateDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { image: File; value_chain: string }) => {
      const form = new FormData();
      form.append('image', v.image);
      form.append('value_chain', v.value_chain);
      return api<Diagnosis>('/diagnoses', { method: 'POST', form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnoses'] }),
  });
}

/** « Pas sûr ? » : le producteur demande l'avis d'un agronome sur un diagnostic automatique. */
export function useAskAgronome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api<Diagnosis>(`/diagnoses/${id}/ask-agronome`, { method: 'POST', body: { note } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnoses'] }),
  });
}

export function useReviewDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pathology, comment }: { id: string; pathology: string; comment: string }) =>
      api<Diagnosis>(`/diagnoses/${id}/review`, { method: 'POST', body: { pathology, comment } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnoses'] }),
  });
}
