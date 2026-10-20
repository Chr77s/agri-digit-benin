import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import { Alert, Badge, Button, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Table, Tabs, Textarea, fmtDate, fmtNum, toast } from '../../shared/ui';
import { EQUIPMENT_KINDS, type Equipment } from './EquipmentPage';

interface Req {
  id: string; role: 'sent' | 'received'; status: 'demandee' | 'acceptee' | 'refusee' | 'realisee' | 'annulee'; operation: string; area_ha: number; wished_on: string; notes: string;
  estimate_xof: number | null; area_done_ha: number | null; price_xof: number | null; counterpart: string; counterpart_phone: string | null;
  equipment: { id: string; kind: string; label: string; hire_rate_xof_per_ha: number | null };
}
const OPERATIONS = ['labour', 'semis', 'traitement', 'recolte', 'battage', 'transport'];
const TONE = { demandee: 'wait', acceptee: 'ok', refusee: 'bad', realisee: 'ok', annulee: 'draft' } as const;
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;
const useRequests = () => useQuery({ queryKey: ['mech-requests'], queryFn: async () => rows(await api<Paginated<Req>>('/mechanization/requests')) });

/** Mécanisation : trouver un prestataire dans sa zone, demander une prestation, répondre aux demandes reçues. */
export function MechanizationPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('find');
  const reqs = useRequests();
  const sent = reqs.data?.filter((r) => r.role === 'sent') ?? [];
  const received = reqs.data?.filter((r) => r.role === 'received') ?? [];
  return (
    <>
      <PageHeader title={t('mech.title')} desc={t('mech.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.mechanization') }]} listen={t('mech.desc')} />
      <Tabs label={t('mech.title')} value={tab} onChange={setTab} tabs={[
        { id: 'find', label: t('mech.tab.find'), content: <Providers /> },
        { id: 'sent', label: t('mech.tab.sent'), count: sent.length, content: <Requests q={reqs} list={sent} /> },
        { id: 'received', label: t('mech.tab.received'), count: received.filter((r) => r.status === 'demandee' || r.status === 'acceptee').length, content: <Requests q={reqs} list={received} /> },
      ]} />
    </>
  );
}

function Providers() {
  const { t } = useTranslation();
  const [kind, setKind] = useState('');
  const [pick, setPick] = useState<Equipment | null>(null);
  const q = useQuery({ queryKey: ['mech-providers', kind], queryFn: async () => rows(await api<Paginated<Equipment>>(`/mechanization/providers${kind ? `?kind=${kind}` : ''}`)) });
  return (
    <div className="stack" style={gap(14)}>
      <Field label={t('eqp.kind')}>{(p) => <Select {...p} value={kind} onChange={(e) => setKind(e.target.value)} placeholder={t('mech.allKinds')} options={EQUIPMENT_KINDS.map((k) => ({ value: k, label: t(`eqp.kinds.${k}`) }))} />}</Field>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="truck" title={t('mech.noProvider')}>{t('mech.noProviderHelp')}</EmptyState></div>}>
        {(d) => (
          <Table<Equipment> caption={t('mech.providers')} title={t('mech.providers')} data={d} rowKey={(r) => r.id} columns={[
            { key: 'kind', label: t('eqp.kind'), render: (r) => <><span className="cell-main">{t(`eqp.kinds.${r.kind}`)}</span>{r.label && <span className="cell-sub">{r.label}</span>}</>, csv: (r) => r.kind },
            { key: 'owner', label: t('mech.provider'), render: (r) => <span className="num">{r.owner}</span> },
            { key: 'commune', label: t('common.commune') },
            { key: 'condition', label: t('eqp.condition'), render: (r) => t(`eqp.conditions.${r.condition}`), csv: (r) => r.condition },
            { key: 'hire_rate_xof_per_ha', label: t('mech.rate'), num: true, render: (r) => fmtNum(r.hire_rate_xof_per_ha) },
            { key: 'act', label: t('common.action'), actions: true, render: (r) => <Button size="sm" onClick={() => setPick(r)}>{t('mech.request')}</Button> },
          ]} />
        )}
      </QueryState>
      {pick && <RequestDialog e={pick} onClose={() => setPick(null)} />}
    </div>
  );
}

function RequestDialog({ e, onClose }: { e: Equipment; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [v, setV] = useState({ operation: 'labour', area: '', date: '', notes: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/mechanization/requests', { method: 'POST', body: { equipment: e.id, operation: v.operation, area_ha: Number(v.area), wished_on: v.date, notes: v.notes } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['mech-requests'] }); toast(t('mech.sent')); onClose(); },
  });
  const estimate = Number(v.area) > 0 ? Math.round(Number(v.area) * (e.hire_rate_xof_per_ha ?? 0)) : null;
  return (
    <Dialog open onClose={onClose} title={t('mech.requestTitle', { kind: t(`eqp.kinds.${e.kind}`) })} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-mech" busy={m.isPending}>{t('mech.send')}</Button></>}>
      <form id="f-mech" noValidate className="stack" onSubmit={(ev) => {
        ev.preventDefault();
        const er: Record<string, string> = {};
        if (!(Number(v.area) > 0)) er.area = t('mech.errArea');
        if (!v.date) er.date = t('mech.errDate');
        setErrs(er);
        if (!Object.keys(er).length) m.mutate();
      }}>
        <Field label={t('mech.operation')}>{(p) => <Select {...p} value={v.operation} onChange={(ev) => setV({ ...v, operation: ev.target.value })} options={OPERATIONS.map((o) => ({ value: o, label: t(`mech.op.${o}`) }))} />}</Field>
        <div className="form-grid">
          <Field label={t('mech.area')} error={errs.area}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="decimal" value={v.area} onChange={(ev) => setV({ ...v, area: ev.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} /><span className="addon addon--end">ha</span></div>}</Field>
          <Field label={t('mech.wishedOn')} error={errs.date}>{(p) => <Input {...p} type="date" min={new Date().toISOString().slice(0, 10)} value={v.date} onChange={(ev) => setV({ ...v, date: ev.target.value })} />}</Field>
        </div>
        <Field label={t('mech.notes')} optional>{(p) => <Textarea {...p} rows={2} maxLength={500} value={v.notes} onChange={(ev) => setV({ ...v, notes: ev.target.value })} />}</Field>
        {estimate !== null && <Alert tone="info" icon="info">{t('mech.estimate', { n: fmtNum(estimate) })}</Alert>}
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

function Requests({ q, list }: { q: { isLoading: boolean; isError: boolean; error: unknown; data: Req[] | undefined; refetch: () => unknown }; list: Req[] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [done, setDone] = useState<Req | null>(null);
  const act = useMutation({
    mutationFn: ({ id, path, body }: { id: string; path: string; body?: Record<string, unknown> }) => api(`/mechanization/requests/${id}/${path}`, { method: 'POST', body: body ?? {} }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mech-requests'] }),
  });
  return (
    <QueryState q={{ ...q, data: list }} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="truck" title={t('mech.noRequest')}>{t('mech.noRequestHelp')}</EmptyState></div>}>
      {(d) => (
        <div className="stack" style={gap(10)}>
          {act.error && <Alert tone="danger" live>{act.error.message}</Alert>}
          <Table<Req> caption={t('mech.requests')} data={d} rowKey={(r) => r.id} columns={[
            { key: 'operation', label: t('mech.operation'), render: (r) => <><span className="cell-main">{t(`mech.op.${r.operation}`)} · {fmtNum(r.area_ha, 1)} ha</span><span className="cell-sub">{t(`eqp.kinds.${r.equipment.kind}`)} · {t('mech.for', { date: fmtDate(r.wished_on) })}</span></>, csv: (r) => r.operation },
            { key: 'counterpart', label: t(d[0]?.role === 'received' ? 'mech.requester' : 'mech.provider'), render: (r) => <><span className="num">{r.counterpart}</span>{r.counterpart_phone && <span className="cell-sub">{r.counterpart_phone}</span>}</> },
            { key: 'price', label: t('mech.price'), num: true, render: (r) => (r.price_xof != null ? fmtNum(r.price_xof) : r.estimate_xof != null ? `~${fmtNum(r.estimate_xof)}` : '—'), csv: (r) => r.price_xof ?? r.estimate_xof },
            { key: 'status', label: t('common.status'), render: (r) => <Badge tone={TONE[r.status]}>{t(`mech.status.${r.status}`)}</Badge>, csv: (r) => r.status },
            { key: 'act', label: t('common.action'), actions: true, render: (r) => (
              <span className="cluster">
                {r.role === 'received' && r.status === 'demandee' && <><Button size="sm" onClick={() => act.mutate({ id: r.id, path: 'decide', body: { accept: true } })}>{t('mech.accept')}</Button><Button size="sm" variant="ghost" onClick={() => act.mutate({ id: r.id, path: 'decide', body: { accept: false } })}>{t('mech.refuse')}</Button></>}
                {r.role === 'received' && r.status === 'acceptee' && <Button size="sm" variant="secondary" onClick={() => setDone(r)}>{t('mech.complete')}</Button>}
                {r.role === 'sent' && (r.status === 'demandee' || r.status === 'acceptee') && <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: r.id, path: 'cancel' })}>{t('mech.cancel')}</Button>}
              </span>) },
          ]} />
          <p className="hint">{t('mech.payHelp')}</p>
          {done && <CompleteDialog r={done} onClose={() => setDone(null)} />}
        </div>
      )}
    </QueryState>
  );
}

function CompleteDialog({ r, onClose }: { r: Req; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [area, setArea] = useState(String(r.area_ha));
  const m = useMutation({
    mutationFn: () => api(`/mechanization/requests/${r.id}/complete`, { method: 'POST', body: { area_done_ha: Number(area) } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['mech-requests'] }); toast(t('mech.completed')); onClose(); },
  });
  const price = Number(area) > 0 ? Math.round(Number(area) * (r.equipment.hire_rate_xof_per_ha ?? 0)) : 0;
  return (
    <Dialog open onClose={onClose} title={t('mech.completeTitle')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-done" busy={m.isPending}>{t('mech.completeConfirm')}</Button></>}>
      <form id="f-done" noValidate className="stack" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Field label={t('mech.areaDone')}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))} /><span className="addon addon--end">ha</span></div>}</Field>
        <Alert tone="info" icon="info">{t('mech.finalPrice', { n: fmtNum(price) })}</Alert>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}
