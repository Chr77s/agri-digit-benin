import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, list, qs } from '../../shared/api/client';
import type { Cooperative, MemberRole, Membership } from '../../shared/api/types';

export const useCooperatives = (f: { department?: string; search?: string }) =>
  useQuery({ queryKey: ['cooperatives', f], queryFn: () => list<Cooperative>(`/cooperatives${qs(f)}`) });
export const useCooperative = (id: string) =>
  useQuery({ queryKey: ['cooperative', id], queryFn: () => api<Cooperative>(`/cooperatives/${id}`) });
export const useMembers = (id: string, active: boolean) =>
  useQuery({ queryKey: ['cooperative', id, 'members', active], queryFn: () => list<Membership>(`/cooperatives/${id}/members${qs({ active })}`) });
export const useMyMemberships = () =>
  useQuery({ queryKey: ['memberships', 'mine'], queryFn: () => list<Membership>('/memberships/mine') });

/** Coopérative proposée au producteur, avec l'état de sa dernière demande (jamais le téléphone du gestionnaire). */
export interface NearbyCoop { id: string; name: string; department: string; commune: string; value_chains: string[]; members_count: number; request_id: string | null; request_status: 'en_attente' | 'acceptee' | 'refusee' | null; request_reason: string }
export interface JoinRequest { id: string; cooperative: string; cooperative_name: string; producer_code: string; producer_name: string; producer_commune: string; message: string; status: 'en_attente' | 'acceptee' | 'refusee'; decision_reason: string; decided_at: string | null; created_at: string }

export const useNearbyCooperatives = () =>
  useQuery({ queryKey: ['coop-nearby'], queryFn: async () => (await api<{ results: NearbyCoop[] }>('/cooperatives/nearby')).results });
export const useJoinRequests = (f: { cooperative?: string; status?: string }) =>
  useQuery({ queryKey: ['join-requests', f], queryFn: () => list<JoinRequest>(`/join-requests${qs(f)}`) });
export function useJoinCooperative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => api<JoinRequest>(`/cooperatives/${id}/join-request`, { method: 'POST', body: { message } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coop-nearby'] }),
  });
}
export function useDecideJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'acceptee' | 'refusee'; reason?: string }) => api<JoinRequest>(`/join-requests/${id}/decide`, { method: 'POST', body: { status, reason } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['join-requests'] }); void qc.invalidateQueries({ queryKey: ['cooperative'] }); },
  });
}

export interface CoopCreate { name: string; department: string; commune: string; value_chains: string[]; registration_number?: string }
export function useCreateCooperative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CoopCreate) => api<Cooperative>('/cooperatives', { method: 'POST', body: b }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cooperatives'] }),
  });
}
export function useMembershipActions(coopId: string) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['cooperative', coopId] });
  return {
    add: useMutation({ mutationFn: (b: { producer: string; role: MemberRole }) => api<Membership>(`/cooperatives/${coopId}/members`, { method: 'POST', body: b }), onSuccess: done }),
    end: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api<Membership>(`/memberships/${id}/end`, { method: 'POST', body: { reason } }), onSuccess: done }),
  };
}
