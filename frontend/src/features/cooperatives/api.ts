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
