import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, list, qs } from '../../shared/api/client';
import type { Harvest } from '../../shared/api/types';
import { Alert, Badge, Button, EmptyState, Field, Input, PageHeader, QueryState, Table, fieldError, fmtDate, fmtNum } from '../../shared/ui';
import { useVcName } from '../../shared/api/ref';

export interface HarvestCreate { campaign: string; harvested_at: string; quantity_kg: number; stored_kg: number; sold_kg: number; sale_price_xof_per_kg?: number }

export const useHarvests = (f: { campaign?: string; flagged?: boolean }) =>
  useQuery({ queryKey: ['harvests', f], queryFn: () => list<Harvest>(`/harvests${qs(f)}`) });
export function useCreateHarvest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: HarvestCreate) => api<Harvest>('/harvests', { method: 'POST', body: b }), onSuccess: () => qc.invalidateQueries({ queryKey: ['harvests'] }) });
}

/** Saisie d'une récolte depuis une campagne (maquette mobile recolte) ; affiche ensuite l'écart avec l'estimation et le signalement éventuel. */
export function HarvestForm({ campaign, estimated }: { campaign: string; estimated?: number | null }) {
  const { t } = useTranslation();
  const m = useCreateHarvest();
  const [v, setV] = useState({ harvested_at: new Date().toISOString().slice(0, 10), quantity_kg: '', stored_kg: '0', sold_kg: '0', price: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const q = Number(v.quantity_kg);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = Number(v.stored_kg || 0), so = Number(v.sold_kg || 0);
    const er: Record<string, string> = {};
    if (!(q > 0)) er.quantity_kg = t('harvest.errQuantity');
    if (st < 0) er.stored_kg = t('harvest.errNegative');
    if (so < 0) er.sold_kg = t('harvest.errNegative');
    if (q > 0 && st + so > q) er.sold_kg = t('harvest.errSum', { total: fmtNum(st + so), q: fmtNum(q) });
    if (v.price && !(Number(v.price) >= 0)) er.price = t('harvest.errNegative');
    if (!v.harvested_at) er.harvested_at = t('harvest.errDate');
    setErrs(er);
    if (Object.keys(er).length) return;
    m.mutate({ campaign, harvested_at: v.harvested_at, quantity_kg: q, stored_kg: st, sold_kg: so, ...(v.price ? { sale_price_xof_per_kg: Math.round(Number(v.price)) } : {}) });
  };
  const err = (k: string, api?: string) => errs[k] ?? fieldError(m.error, api ?? k);
  if (m.data) return <HarvestResult h={m.data} />;
  return (
    <form noValidate onSubmit={submit} className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <Field label={t('harvest.date')} error={err('harvested_at')}>{(p) => <Input {...p} type="date" value={v.harvested_at} onChange={set('harvested_at')} />}</Field>
      <Field label={t('harvest.quantity')} error={err('quantity_kg')} hint={q > 0 ? t('harvest.sacks', { n: fmtNum(q / 100, 1) }) : undefined}>{(p) => <Input {...p} type="number" inputMode="decimal" min="0" value={v.quantity_kg} onChange={set('quantity_kg')} />}</Field>
      <div className="form-grid">
        <Field label={t('harvest.stored')} error={err('stored_kg')}>{(p) => <Input {...p} type="number" inputMode="decimal" min="0" value={v.stored_kg} onChange={set('stored_kg')} />}</Field>
        <Field label={t('harvest.sold')} error={err('sold_kg')} hint={t('harvest.soldHint')}>{(p) => <Input {...p} type="number" inputMode="decimal" min="0" value={v.sold_kg} onChange={set('sold_kg')} />}</Field>
      </div>
      <Field label={t('harvest.price')} optional error={err('price', 'sale_price_xof_per_kg')}>{(p) => <Input {...p} type="number" inputMode="numeric" min="0" value={v.price} onChange={set('price')} />}</Field>
      {estimated != null && (
        <p className="small">{t('harvest.expected', { low: fmtNum(Math.round(estimated * 0.9 / 50) * 50), high: fmtNum(Math.round(estimated * 1.1 / 50) * 50) })} <Badge tone="demo">{t('harvest.refDemo')}</Badge></p>
      )}
      {m.error && !fieldError(m.error, 'quantity_kg') && <Alert tone="danger" live>{m.error.message}</Alert>}
      <Button type="submit" icon="check" busy={m.isPending}>{t('harvest.submit')}</Button>
    </form>
  );
}

function HarvestResult({ h }: { h: Harvest }) {
  const { t } = useTranslation();
  return (
    <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties} role="status" aria-live="polite">
      <Alert tone="ok">{t('harvest.saved', { q: fmtNum(h.quantity_kg) })}</Alert>
      <p>{t('harvest.estimate', { e: h.estimated_kg === null ? t('common.notAvailable') : t('common.kg', { n: fmtNum(h.estimated_kg) }) })}</p>
      <p>{t('harvest.deviation', { d: h.deviation_pct === null ? t('common.notAvailable') : `${h.deviation_pct > 0 ? '+' : ''}${fmtNum(h.deviation_pct, 1)} %` })}</p>
      {h.flagged ? <Alert tone="warn" icon="flag">{t('harvest.flagged')}</Alert> : <p className="muted">{t('harvest.notFlagged')}</p>}
    </div>
  );
}

export function FlaggedHarvestsPage() {
  const { t } = useTranslation();
  const vcName = useVcName();
  const q = useHarvests({ flagged: true });
  return (
    <>
      <PageHeader title={t('nav.flaggedHarvests')} />
      <p className="mb-3 text-muted">{t('harvest.flaggedIntro')}</p>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('harvest.flaggedEmpty')} />}>
        {(d) => (
          <Table<Harvest> caption={t('nav.flaggedHarvests')} data={d} rowKey={(r) => r.id} exportName="recoltes-signalees" columns={[
            { key: 'producer_code', label: t('common.producer') },
            { key: 'value_chain', label: t('common.valueChain'), render: (r) => (r.value_chain ? vcName(r.value_chain) : '') },
            { key: 'harvested_at', label: t('harvest.date'), render: (r) => fmtDate(r.harvested_at) },
            { key: 'quantity_kg', label: t('harvest.declared'), render: (r) => fmtNum(r.quantity_kg) },
            { key: 'estimated_kg', label: t('harvest.estimated'), render: (r) => fmtNum(r.estimated_kg) },
            { key: 'deviation_pct', label: t('harvest.deviationCol'), render: (r) => <Badge tone="warn">{fmtNum(r.deviation_pct, 1)} %</Badge> },
          ]} />
        )}
      </QueryState>
    </>
  );
}
