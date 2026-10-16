import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import { Button, EmptyState, Notice, PageHeader, QueryState, Table, fmtNum } from '../../shared/ui';
import { usePlaceName } from '../../shared/api/ref';

interface ConsentedProducer { id: string; code: string; first_name: string; last_name: string; commune: string }
interface Factor { name: string; weight: number; value: number | string; contribution: number }
interface Score { score: number; factors: Factor[]; disclaimer: string }

/** Agent financier : producteurs ayant consenti, puis score et facteurs (chaque consultation est journalisée côté serveur). */
export function CreditPage() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const [sel, setSel] = useState<ConsentedProducer | null>(null);
  const q = useQuery({ queryKey: ['credit-producers'], queryFn: async () => rows(await api<Paginated<ConsentedProducer> | ConsentedProducer[]>('/credit/consented-producers?page_size=100')) });
  const score = useQuery({ queryKey: ['credit-score', sel?.id], queryFn: () => api<Score>(`/credit/scores/${sel!.id}`), enabled: !!sel, staleTime: 0 });
  return (
    <>
      <PageHeader title={t('nav.credit')} />
      <Notice tone="warn">{t('credit.notice')}</Notice>
      <h2 className="mb-2 mt-4 text-xl font-semibold">{t('credit.consented')}</h2>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('credit.empty')}>{t('credit.emptyHelp')}</EmptyState>}>
        {(d) => (
          <Table<ConsentedProducer> caption={t('credit.consentedCaption')} data={d} rowKey={(r) => r.id} columns={[
            { key: 'code', label: t('common.code') },
            { key: 'last_name', label: t('common.name'), render: (r) => `${r.first_name} ${r.last_name}` },
            { key: 'commune', label: t('common.commune'), render: (r) => place(r.commune) },
            { key: 'act', label: t('credit.score'), sortable: false, render: (r) => <Button variant="secondary" onClick={() => setSel(r)}>{t('credit.consult')}</Button> },
          ]} />
        )}
      </QueryState>
      {sel && (
        <section className="mt-6 flex flex-col gap-3" aria-live="polite">
          <h2 className="text-xl font-semibold">{t('credit.scoreOf', { name: `${sel.first_name} ${sel.last_name}`, code: sel.code })}</h2>
          <QueryState q={score}>
            {(s) => (
              <>
                <p className="text-2xl font-semibold">{t('credit.outOf100', { score: fmtNum(s.score, 0) })}</p>
                <Table<Factor> caption={t('credit.factorsCaption')} data={s.factors} rowKey={(r) => r.name} columns={[
                  { key: 'name', label: t('credit.factor') },
                  { key: 'weight', label: t('credit.weight'), render: (r) => fmtNum(r.weight, 2) },
                  { key: 'value', label: t('credit.value'), render: (r) => (typeof r.value === 'number' ? fmtNum(r.value, 2) : r.value) },
                  { key: 'contribution', label: t('credit.contribution'), render: (r) => fmtNum(r.contribution, 1) },
                ]} />
                <p className="rounded border border-warn bg-warn-bg p-3 font-semibold text-warn">{s.disclaimer}</p>
              </>
            )}
          </QueryState>
        </section>
      )}
    </>
  );
}

/** Producteur : accorder ou retirer le partage du profil pour le crédit. */
export function CreditConsentBox({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (on: boolean) => api(on ? '/credit/consent' : '/credit/consent/withdraw', { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }),
  });
  return (
    <div className="mb-4 flex flex-col gap-2 rounded border-2 border-brand bg-surface p-4">
      <h2 className="text-lg font-semibold">{t('credit.shareTitle')}</h2>
      <p>{t('credit.shareText')}</p>
      <div aria-live="polite">{m.error && <Notice tone="error">{m.error.message}</Notice>}</div>
      {active
        ? <Button variant="danger" className="self-start" busy={m.isPending} onClick={() => m.mutate(false)}>{t('credit.withdrawShare')}</Button>
        : <Button className="self-start" busy={m.isPending} onClick={() => m.mutate(true)}>{t('credit.acceptShare')}</Button>}
    </div>
  );
}
