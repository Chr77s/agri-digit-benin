import { useMutation, useQuery } from '@tanstack/react-query';
import { api, qs } from '../../shared/api/client';
import type { User } from '../../shared/api/types';

export const useRequestOtp = () =>
  useMutation({ mutationFn: (phone: string) => api<{ detail: string; requires_password: boolean }>('/auth/otp/request', { method: 'POST', body: { phone } }) });

export const useVerifyOtp = () =>
  useMutation({
    mutationFn: (b: { phone: string; code: string; password?: string }) =>
      api<{ access: string; user: User }>('/auth/otp/verify', { method: 'POST', body: b }),
  });

export const useOtpInbox = (phone: string, enabled: boolean) =>
  useQuery({
    queryKey: ['otp-inbox', phone],
    queryFn: () => api<{ body: string; created_at: string }[]>(`/demo/otp-inbox${qs({ phone })}`),
    enabled,
    refetchInterval: enabled ? 3000 : false,
    retry: false,
  });
