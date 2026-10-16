import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs } from '../../shared/api/client';
import type { SeaDashboard, SeaIndicator } from '../../shared/api/types';
import { EmptyState, Field, Notice, PageHeader, QueryState, Select, fmtDateTime, fmtNum } from '../../shared/ui';
import { useDepartments, useVcName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';

/** Une valeur absente (`null`) n'est jamais affichée comme 0 : le serveur n'a pas de source pour elle. */
function useFormat() {
  const { t } = useTranslation();
  return (v: number | null | undefined, unit: string) =>
    v === null || v === undefined ? t('common.notAvailable') : `${fmtNum(v, 1)}${unit ? ` ${unit}` : ''}`;
}

function Breakdown({ ind }: { ind: SeaIndicator }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const format = useFormat();
  if (!ind.breakdown || ind.breakdown.length === 0) return null;
  const label = (l: string) => (ind.key.endsWith('_by_chain') ? vcName(l) : ind.key === 'campaigns_by_stage' ? t(`stage.${l}`, { defaultValue: l }) : l);
  return (
    <table className="mt-3 w-full border-collapse text-left">
      <caption className="sr-only">{t('sea.breakdownCaption', { label: ind.label })}</caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className="py-1 pr-2 text-sm font-semibold">{t('sea.breakdownLabel')}</th>
          <th scope="col" className="py-1 text-right text-sm font-semibold">{t('sea.breakdownValue')}{ind.unit ? ` (${ind.unit})` : ''}</th>
        </tr>
      </thead>
      <tbody>
        {ind.breakdown.map((b) => (
          <tr key={b.label} className="border-b border-border last:border-0">
            <th scope="row" className="break-words py-1 pr-2 font-normal">{label(b.label)}</th>
            <td className="py-1 text-right font-semibold">{format(b.value, '')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IndicatorCard({ ind }: { ind: SeaIndicator }) {
  const { t } = useTranslation();
  const format = useFormat();
  const missing = ind.value === null || ind.value === undefined;
  return (
    <li className="rounded border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">{ind.label}</h2>
      <p className={missing ? 'text-xl italic text-muted' : 'text-2xl font-semibold'}>{format(ind.value, ind.unit)}</p>
      <p className="mt-1 break-words text-sm text-muted">{t('sea.source')} : {ind.source}</p>
      <p className="text-sm text-muted">{t('sea.updatedAt')} : {fmtDateTime(ind.updated_at)}</p>
      <Breakdown ind={ind} />
    </li>
  );
}

export function SeaPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const [dep, setDep] = useState('');
  // L'agent ATDA est borné à son département par le serveur : pas de filtre pour lui.
  const canFilter = user?.role !== 'agent_atda';
  const q = useQuery({ queryKey: ['sea', dep], queryFn: () => api<SeaDashboard>(`/dashboard/sea${qs({ department: canFilter ? dep : '' })}`) });
  return (
    <>
      <PageHeader title={t('sea.title')} />
      <div className="mb-4 flex flex-col gap-3">
        <Notice tone="warn">{t('sea.note')}</Notice>
        {canFilter && (
          <div className="w-full max-w-xs">
            <Field label={t('common.department')}>
              {(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder={t('sea.allCountry')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}
            </Field>
          </div>
        )}
      </div>
      <QueryState q={q} empty={(d) => d.indicators.length === 0} emptyText={<EmptyState title={t('sea.empty')} />}>
        {(d) => (
          <section aria-label={t('sea.title')}>
            <p className="mb-3 font-semibold" aria-live="polite">{t('sea.scope', { name: typeof d.scope === 'string' ? d.scope : d.scope?.name ?? '' })}</p>
            <ul className="grid gap-3 md:grid-cols-2">
              {d.indicators.map((ind) => <IndicatorCard key={ind.key} ind={ind} />)}
            </ul>
          </section>
        )}
      </QueryState>
    </>
  );
}
