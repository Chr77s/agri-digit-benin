import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, list, qs } from '../../shared/api/client';
import type { Program, Support } from '../../shared/api/types';
import { Badge, Button, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDate, fmtNum } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useProducers } from '../producers/api';

export interface SupportCreate { producer: string; program?: string; item: string; quantity: number; unit: string; value_xof: number; repayable: boolean }

export const useSupports = (producer?: string) => useQuery({ queryKey: ['supports', producer], queryFn: () => list<Support>(`/supports${qs({ producer })}`) });
const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: () => list<Program>('/programs') });
export function useSupportActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['supports'] });
  return {
    create: useMutation({ mutationFn: (b: SupportCreate) => api<Support>('/supports', { method: 'POST', body: b }), onSuccess: done }),
    confirm: useMutation({ mutationFn: (id: string) => api<Support>(`/supports/${id}/confirm`, { method: 'POST', body: {} }), onSuccess: done }),
  };
}

const UNITS = ['kg', 'sac', 'litre', 'unite'];

export function SupportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isProducer = user?.role === 'producteur';
  const q = useSupports();
  const a = useSupportActions();
  const [msg, setMsg] = useState('');
  return (
    <>
      <PageHeader title={isProducer ? t('nav.mySupports') : t('nav.supports')} listen={isProducer ? t('supports.listen') : undefined} />
      {!isProducer && <SupportForm onDone={() => setMsg(t('supports.saved'))} />}
      <div aria-live="polite" className="mb-3">{msg && <Notice tone="success">{msg}</Notice>}{a.confirm.error && <Notice tone="error">{a.confirm.error.message}</Notice>}</div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('supports.empty')}>{isProducer ? t('supports.emptyProducer') : t('supports.emptyAgent')}</EmptyState>}>
        {(d) => isProducer ? (
          <ul className="flex flex-col gap-2">
            {d.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface p-3">
                <div>
                  <p className="text-lg font-semibold">{s.item} : {fmtNum(Number(s.quantity), 2)} {t(`supports.unit.${s.unit}`, s.unit)}</p>
                  <p className="text-muted">{t('supports.value', { v: fmtNum(s.value_xof) })}{s.repayable ? `, ${t('supports.repayable')}` : ''}</p>
                </div>
                {s.status === 'confirme'
                  ? <Badge tone="success">{t('supports.confirmedOn', { date: fmtDate(s.confirmed_at) })}</Badge>
                  : <Button busy={a.confirm.isPending && a.confirm.variables === s.id} onClick={() => a.confirm.mutate(s.id, { onSuccess: () => setMsg(t('supports.thanks')) })}>{t('supports.confirm')}</Button>}
              </li>
            ))}
          </ul>
        ) : (
          <Table<Support> caption={t('nav.supports')} data={d} rowKey={(r) => r.id} exportName="appuis" columns={[
            { key: 'producer_code', label: t('common.producer') },
            { key: 'item', label: t('supports.item') },
            { key: 'quantity', label: t('supports.quantity'), render: (r) => `${fmtNum(Number(r.quantity), 2)} ${t(`supports.unit.${r.unit}`, r.unit)}` },
            { key: 'value_xof', label: t('supports.valueXof'), render: (r) => fmtNum(r.value_xof) },
            { key: 'status', label: t('common.status'), render: (r) => <Badge tone={r.status === 'confirme' ? 'success' : 'warn'}>{t(`supports.status.${r.status}`)}</Badge> },
          ]} />
        )}
      </QueryState>
    </>
  );
}

function SupportForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const producers = useProducers({ status: 'valide' });
  const programs = usePrograms();
  const { create } = useSupportActions();
  const empty = { producer: '', program: '', item: '', quantity: '', unit: 'kg', value_xof: '', repayable: false };
  const [v, setV] = useState(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  return (
    <form noValidate className="mb-6 grid gap-3 rounded border border-border bg-surface p-4 md:grid-cols-3" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (!v.producer) er.producer = t('supports.errProducer');
      if (v.item.trim().length < 2) er.item = t('supports.errItem');
      if (!(Number(v.quantity) > 0)) er.quantity = t('supports.errQuantity');
      if (!(Number(v.value_xof) >= 0) || v.value_xof === '') er.value_xof = t('supports.errValue');
      setErrs(er);
      if (Object.keys(er).length) return;
      create.mutate({ producer: v.producer, program: v.program || undefined, item: v.item.trim(), quantity: Number(v.quantity), unit: v.unit, value_xof: Math.round(Number(v.value_xof)), repayable: v.repayable }, { onSuccess: () => { setV(empty); onDone(); } });
    }}>
      <h2 className="text-xl font-semibold md:col-span-3">{t('supports.formTitle')}</h2>
      <Field label={t('common.producer')} error={errs.producer}>{(p) => <Select {...p} value={v.producer} onChange={(e) => setV({ ...v, producer: e.target.value })} placeholder={t('common.choose')} options={(producers.data ?? []).map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />}</Field>
      <Field label={t('supports.program')}>{(p) => <Select {...p} value={v.program} onChange={(e) => setV({ ...v, program: e.target.value })} placeholder={t('supports.noProgram')} options={(programs.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />}</Field>
      <Field label={t('supports.item')} error={errs.item} hint={t('supports.itemHint')}>{(p) => <input {...p} className={inputCls} value={v.item} onChange={(e) => setV({ ...v, item: e.target.value })} />}</Field>
      <Field label={t('supports.quantity')} error={errs.quantity}>{(p) => <input {...p} type="number" inputMode="decimal" min="0" className={inputCls} value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} />}</Field>
      <Field label={t('supports.unitLabel')}>{(p) => <Select {...p} value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} options={UNITS.map((u) => ({ value: u, label: t(`supports.unit.${u}`) }))} />}</Field>
      <Field label={t('supports.valueXof')} error={errs.value_xof}>{(p) => <input {...p} type="number" inputMode="numeric" min="0" step="1" className={inputCls} value={v.value_xof} onChange={(e) => setV({ ...v, value_xof: e.target.value })} />}</Field>
      <label className="flex min-h-touch items-center gap-2 md:col-span-3"><input type="checkbox" className="h-5 w-5" checked={v.repayable} onChange={(e) => setV({ ...v, repayable: e.target.checked })} /> {t('supports.repayableLabel')}</label>
      {create.error && <div className="md:col-span-3"><Notice tone="error" live>{create.error.message}</Notice></div>}
      <Button type="submit" busy={create.isPending} className="self-start">{t('supports.submit')}</Button>
    </form>
  );
}
