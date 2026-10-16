import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import type { Consent, Paginated } from '../../shared/api/types';
import { CreditConsentBox } from '../credit/CreditPage';
import { Badge, Button, EmptyState, Notice, PageHeader, QueryState, fmtDateTime } from '../../shared/ui';

const useConsents = () =>
  useQuery({ queryKey: ['consents'], queryFn: async () => rows(await api<Paginated<Consent> | Consent[]>('/consents/mine')) });
const useWithdraw = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/consents/${id}/withdraw`, { method: 'POST', body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }) });
};

export function ConsentsPage() {
  const { t } = useTranslation();
  const q = useConsents();
  const w = useWithdraw();
  return (
    <>
      <PageHeader title={t('nav.consents')} listen={t('consents.listen')} />
      <p className="mb-4">{t('consents.intro')}</p>
      <div aria-live="polite" className="mb-3">
        {w.isSuccess && <Notice tone="success">{t('consents.withdrawn')}</Notice>}
        {w.error && <Notice tone="error">{w.error.message}</Notice>}
      </div>
      <QueryState q={q}>
        {(d) => (
          <>
          <CreditConsentBox active={d.some((c) => c.type === 'credit' && !c.withdrawn_at)} />
          {d.length === 0 && <EmptyState title={t('consents.empty')} />}
          <ul className="flex flex-col gap-2">
            {d.map((c) => {
              const purpose = String(c.type ?? c.purpose ?? 'registration');
              const withdrawn = !!c.withdrawn_at;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface p-3">
                  <div>
                    <p className="font-semibold">{t(`consents.purpose.${purpose}`, purpose)}</p>
                    <p className="text-sm text-muted">{t(c.channel ? 'consents.detailChannel' : 'consents.detail', { version: String(c.text_version ?? 'v1'), date: fmtDateTime(String(c.accepted_at ?? c.created_at ?? '')), channel: String(c.channel ?? '') })}</p>
                    {withdrawn ? <Badge tone="error">{t('consents.withdrawnOn', { date: fmtDateTime(c.withdrawn_at) })}</Badge> : <Badge tone="success">{t('consents.active')}</Badge>}
                  </div>
                  {!withdrawn && <Button variant="danger" busy={w.isPending && w.variables === c.id} onClick={() => w.mutate(c.id)}>{t('consents.withdraw')}</Button>}
                </li>
              );
            })}
          </ul>
          </>
        )}
      </QueryState>
    </>
  );
}
