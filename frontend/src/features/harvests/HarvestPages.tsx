import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, list, qs } from '../../shared/api/client';
import type { Harvest } from '../../shared/api/types';
import { Alert, Badge, Button, Chips, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Radio, Select, Table, Textarea, fieldError, fmtDate, fmtDateTime, fmtNum, toast } from '../../shared/ui';
import { useVcName } from '../../shared/api/ref';

export interface HarvestCreate { campaign: string; harvested_at: string; quantity_kg: number; stored_kg: number; sold_kg: number; sale_price_xof_per_kg?: number }

export const useHarvests = (f: { campaign?: string; flagged?: boolean; to_check?: boolean }) =>
  useQuery({ queryKey: ['harvests', f], queryFn: () => list<Harvest>(`/harvests${qs(f)}`) });
export function useCreateHarvest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: HarvestCreate) => api<Harvest>('/harvests', { method: 'POST', body: b }), onSuccess: () => qc.invalidateQueries({ queryKey: ['harvests'] }) });
}

/** Conclusion de l'agent sur une récolte signalée (POST /harvests/{id}/check). */
export function useCheckHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...b }: { id: string; conclusion: string; reason: string; quantity_kg?: number }) => api<Harvest>(`/harvests/${id}/check`, { method: 'POST', body: b }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['harvests'] }); void qc.invalidateQueries({ queryKey: ['sea'] }); },
  });
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

const CONCLUSIONS = ['confirmee', 'corrigee', 'visite'] as const;

/** Récoltes signalées (écart de plus de 50 % avec l'estimation) : l'agent les vérifie, rien n'est corrigé automatiquement. */
export function FlaggedHarvestsPage() {
  const { t } = useTranslation();
  const vcName = useVcName();
  const todo = useHarvests({ to_check: true });
  const done = useHarvests({ to_check: false });
  const [view, setView] = useState(['todo']);
  const [chain, setChain] = useState('');
  const [target, setTarget] = useState<Harvest | null>(null);
  const showDone = view[0] === 'done';
  const q = showDone ? done : todo;
  const chains = [...new Set([...(todo.data ?? []), ...(done.data ?? [])].map((h) => h.value_chain).filter((c): c is string => !!c))];
  return (
    <>
      <PageHeader title={t('nav.flaggedHarvests')} desc={t('harvest.flaggedIntro')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.flaggedHarvests') }]} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="demo" title={t('harvest.estimatesTitle')}>{t('harvest.estimatesText')}</Alert>
        <QueryState q={q} empty={(d) => d.length === 0 && !chain && (showDone || !done.data?.length)}emptyText={<div className="card"><EmptyState title={showDone ? t('harvest.noneChecked') : t('harvest.flaggedEmpty')}>{showDone ? undefined : t('harvest.flaggedEmptyHelp')}</EmptyState></div>}>
          {(d) => (
            <Table<Harvest> title={showDone ? t('harvest.checkedTitle') : t('harvest.toCheckTitle')} caption={t('nav.flaggedHarvests')} data={d.filter((h) => !chain || h.value_chain === chain)} rowKey={(r) => r.id} exportName="recoltes-signalees"
              toolbar={<>
                <Chips single label={t('harvest.viewLabel')} value={view} onChange={setView}
                  options={[{ value: 'todo', label: t('harvest.toCheck'), count: todo.data?.length }, { value: 'done', label: t('harvest.verified'), count: done.data?.length }]} />
                {chains.length > 1 && <div className="field min-w-[180px]"><label className="sr-only" htmlFor="h-chain">{t('common.valueChain')}</label>
                  <Select id="h-chain" value={chain} onChange={(e) => setChain(e.target.value)} placeholder={t('harvest.allChains')} options={chains.map((c) => ({ value: c, label: vcName(c) }))} /></div>}
              </>}
              columns={[
                { key: 'producer_code', label: t('common.producer'), render: (r) => <span className="cell-main num">{r.producer_code}</span> },
                { key: 'value_chain', label: t('common.valueChain'), render: (r) => (r.value_chain ? vcName(r.value_chain) : '') },
                { key: 'harvested_at', label: t('harvest.date'), num: true, render: (r) => fmtDate(r.harvested_at) },
                { key: 'quantity_kg', label: t('harvest.declared'), num: true, render: (r) => <>{fmtNum(r.quantity_kg)}{r.declared_kg ? <span className="cell-sub">{t('harvest.wasDeclared', { q: fmtNum(r.declared_kg) })}</span> : null}</> },
                { key: 'estimated_kg', label: t('harvest.estimated'), num: true, render: (r) => (r.estimated_kg === null ? t('common.notAvailable') : fmtNum(r.estimated_kg)) },
                { key: 'deviation_pct', label: t('harvest.deviationCol'), num: true, render: (r) => (r.deviation_pct === null ? '—' : <Badge tone={r.flagged ? 'bad' : 'ok'} icon={false}>{r.deviation_pct > 0 ? '+' : ''}{fmtNum(r.deviation_pct, 1)} %</Badge>) },
                showDone
                  ? { key: 'check_status', label: t('harvest.conclusionCol'), render: (r) => <><Badge tone="ok">{t(`harvest.concl.${r.check_status}.t`)}</Badge><span className="cell-sub">{r.check_reason}{r.checked_at ? ` · ${fmtDateTime(r.checked_at)}` : ''}</span></> }
                  : { key: 'act', label: t('common.action'), actions: true, render: (r) => <span className="cluster">{r.check_status === 'visite' && <Badge tone="wait" icon="clock">{t('harvest.visitBadge')}</Badge>}<Button size="sm" variant="secondary" onClick={() => setTarget(r)}>{t('harvest.checkBtn')}</Button></span> },
              ]} />
          )}
        </QueryState>
      </div>
      {target && <CheckDialog h={target} onClose={() => setTarget(null)} />}
    </>
  );
}

function CheckDialog({ h, onClose }: { h: Harvest; onClose: () => void }) {
  const { t } = useTranslation();
  const m = useCheckHarvest();
  const [conclusion, setConclusion] = useState<string>('confirmee');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const err = (k: string) => errs[k] ?? fieldError(m.error, k);
  return (
    <Dialog open onClose={onClose} title={t('harvest.checkTitle', { code: h.producer_code ?? '' })}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-check" busy={m.isPending}>{t('harvest.checkSend')}</Button></>}>
      <form id="f-check" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (conclusion === 'corrigee' && !(Number(qty) > 0)) er.quantity_kg = t('harvest.errQuantity');
        if (reason.trim().length < 5) er.reason = t('common.errReason');
        setErrs(er);
        if (Object.keys(er).length) return;
        m.mutate({ id: h.id, conclusion, reason: reason.trim(), ...(conclusion === 'corrigee' ? { quantity_kg: Number(qty) } : {}) }, { onSuccess: () => { toast(t('harvest.checked')); onClose(); } });
      }}>
        <dl className="dl">
          <dt>{t('harvest.declared')}</dt><dd className="num">{t('common.kg', { n: fmtNum(h.quantity_kg) })}</dd>
          <dt>{t('harvest.estimated')}</dt><dd className="num">{h.estimated_kg === null ? t('common.notAvailable') : t('common.kg', { n: fmtNum(h.estimated_kg) })}</dd>
          <dt>{t('harvest.stored')} · {t('harvest.sold')}</dt><dd className="num">{t('common.kg', { n: fmtNum(h.stored_kg) })} · {t('common.kg', { n: fmtNum(h.sold_kg) })}</dd>
        </dl>
        <fieldset className="fieldset">
          <legend className="label">{t('harvest.conclusionLegend')}</legend>
          {CONCLUSIONS.map((c) => <Radio key={c} name="concl" checked={conclusion === c} onChange={() => setConclusion(c)} label={t(`harvest.concl.${c}.t`)} hint={t(`harvest.concl.${c}.d`)} />)}
        </fieldset>
        {conclusion === 'corrigee' && (
          <Field label={t('harvest.correctedQty')} error={err('quantity_kg')}>
            {(p) => <div className="input-group"><Input {...p} className="input-num" type="number" min="0" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /><span className="addon addon--end">kg</span></div>}
          </Field>
        )}
        <Field label={t('harvest.reasonLabel')} error={err('reason')}>{(p) => <Textarea {...p} rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setErrs((x) => ({ ...x, reason: '' })); }} />}</Field>
        {m.error && !fieldError(m.error, 'quantity_kg') && !fieldError(m.error, 'reason') && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}
