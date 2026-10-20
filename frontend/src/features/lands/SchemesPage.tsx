import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import type { Paginated, Scheme, Works } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Stat, Table, Textarea, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;
const KINDS = ['bas_fond', 'irrigue', 'plateau'];
const TYPES = ['rehabilitation', 'nouvel_amenagement', 'entretien'];
const STATUS_TONE = { operationnel: 'ok', projet: 'draft', a_rehabiliter: 'bad', en_travaux: 'wait' } as const;
const WORKS_TONE = { planifie: 'draft', en_cours: 'wait', termine: 'ok', abandonne: 'bad' } as const;

const useSchemes = () => useQuery({ queryKey: ['schemes'], queryFn: async () => rows(await api<Paginated<Scheme>>('/schemes')) });

/** Aménagements (bas-fonds, périmètres irrigués, plateaux) : superficies, état, travaux de réhabilitation et d'entretien. */
export function SchemesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = user?.role === 'agent_atda' || user?.role === 'admin_maep';
  const [adding, setAdding] = useState(false);
  const q = useSchemes();
  return (
    <>
      <PageHeader title={t('sch.title')} desc={t('sch.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.schemes') }]}
        actions={canWrite ? <Button icon="plus" onClick={() => setAdding(true)}>{t('sch.add')}</Button> : undefined} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="drop" title={t('sch.empty')}>{t('sch.emptyHelp')}</EmptyState></div>}>
        {(d) => (
          <div className="stack" style={gap(20)}>
            <div className="grid-fit" style={{ '--min': '170px' } as React.CSSProperties}>
              <Stat label={t('sch.kpi.count')} value={fmtNum(d.length)} />
              <Stat label={t('sch.kpi.available')} value={fmtNum(d.reduce((a, s) => a + s.area_available_ha, 0), 1)} unit="ha" />
              <Stat label={t('sch.kpi.arable')} value={fmtNum(d.reduce((a, s) => a + s.area_arable_ha, 0), 1)} unit="ha" />
              <Stat label={t('sch.kpi.used')} value={fmtNum(d.reduce((a, s) => a + s.area_used_ha, 0), 1)} unit="ha" />
            </div>
            {d.map((s) => <SchemeCard key={s.id} s={s} canWrite={canWrite} />)}
          </div>
        )}
      </QueryState>
      {adding && <SchemeDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function SchemeCard({ s, canWrite }: { s: Scheme; canWrite: boolean }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const qc = useQueryClient();
  const [works, setWorks] = useState(false);
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api(`/works/${id}`, { method: 'PATCH', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['schemes'] }),
  });
  const next = (w: Works) => (w.status === 'planifie' ? [['en_cours', 'start']] : w.status === 'en_cours' ? [['termine', 'finish']] : []) as [string, string][];
  return (
    <Card title={s.name} sub={[t(`sch.kind.${s.kind}`), place(s.commune) || place(s.department)].filter(Boolean).join(' · ')} actions={<Badge tone={STATUS_TONE[s.status]}>{t(`sch.status.${s.status}`)}</Badge>}>
      <div className="stack" style={gap(14)}>
        <p className="small">{t('sch.areas', { available: fmtNum(s.area_available_ha, 1), arable: fmtNum(s.area_arable_ha, 1), used: fmtNum(s.area_used_ha, 1) })}</p>
        {patch.error && <Alert tone="danger" live>{patch.error.message}</Alert>}
        {s.works.length === 0 ? <p className="muted small">{t('sch.noWorks')}</p> : (
          <Table<Works> caption={t('sch.worksOf', { name: s.name })} data={s.works} rowKey={(w) => w.id} pageSize={5} columns={[
            { key: 'title', label: t('sch.col.works'), render: (w) => <><span className="cell-main">{w.title}</span><span className="cell-sub">{t(`sch.type.${w.type}`)}{w.contractor ? ` · ${w.contractor}` : ''}</span></>, csv: (w) => w.title },
            { key: 'status', label: t('sch.col.state'), render: (w) => <Badge tone={WORKS_TONE[w.status]}>{t(`sch.worksStatus.${w.status}`)}</Badge>, csv: (w) => w.status },
            { key: 'progress_pct', label: t('sch.col.progress'), num: true, render: (w) => `${w.progress_pct} %` },
            { key: 'cost_xof', label: t('sch.col.cost'), num: true, render: (w) => (w.cost_xof ? fmtNum(w.cost_xof) : '—'), csv: (w) => w.cost_xof },
            { key: 'planned_on', label: t('sch.col.date'), render: (w) => fmtDate(w.finished_on ?? w.started_on ?? w.planned_on), csv: (w) => w.finished_on ?? w.started_on ?? w.planned_on },
            ...(canWrite ? [{ key: 'act', label: t('common.action'), actions: true, render: (w: Works) => (
              <span className="cluster">
                {next(w).map(([to, k]) => <Button key={to} size="sm" variant="secondary" busy={patch.isPending && patch.variables?.id === w.id} onClick={() => patch.mutate({ id: w.id, body: { status: to } })}>{t(`sch.act.${k}`)}</Button>)}
                {(w.status === 'planifie' || w.status === 'en_cours') && <Button size="sm" variant="ghost" onClick={() => patch.mutate({ id: w.id, body: { status: 'abandonne' } })}>{t('sch.act.abandon')}</Button>}
              </span>) }] : []),
          ]} />
        )}
        {canWrite && <div className="cluster"><Button variant="secondary" icon="plus" onClick={() => setWorks(true)}>{t('sch.addWorks')}</Button></div>}
        {works && <WorksDialog s={s} onClose={() => setWorks(false)} />}
      </div>
    </Card>
  );
}

function SchemeDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const deps = useDepartments();
  const { user } = useAuth();
  const [v, setV] = useState({ name: '', kind: 'bas_fond', department: user?.department ?? '', commune: '', available: '', arable: '', used: '', status: 'operationnel' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/schemes', { method: 'POST', body: { name: v.name.trim(), kind: v.kind, department: v.department, commune: v.commune, area_available_ha: Number(v.available), area_arable_ha: Number(v.arable), area_used_ha: Number(v.used || 0), status: v.status } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['schemes'] }); toast(t('sch.saved')); onClose(); },
  });
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  const num = (k: 'available' | 'arable' | 'used', label: string, err?: string) => (
    <Field label={label} error={err}>{(p) => <div className="input-group"><Input {...p} inputMode="decimal" className="input-num" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} /><span className="addon addon--end">ha</span></div>}</Field>
  );
  return (
    <Dialog open onClose={onClose} title={t('sch.add')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-scheme" busy={m.isPending}>{t('common.save')}</Button></>}>
      <form id="f-scheme" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (v.name.trim().length < 2) er.name = t('sch.errName');
        if (!v.department) er.department = t('sch.errDepartment');
        if (!(Number(v.available) > 0)) er.available = t('sch.errArea');
        else if (Number(v.arable) > Number(v.available) || Number(v.used || 0) > Number(v.arable)) er.arable = t('sch.errOrder');
        setErrs(er);
        if (!Object.keys(er).length) m.mutate();
      }}>
        <Field label={t('sch.name')} error={errs.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <div className="form-grid">
          <Field label={t('sch.kindLabel')}>{(p) => <Select {...p} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} options={KINDS.map((k) => ({ value: k, label: t(`sch.kind.${k}`) }))} />}</Field>
          <Field label={t('sch.statusLabel')}>{(p) => <Select {...p} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} options={['operationnel', 'a_rehabiliter', 'projet'].map((k) => ({ value: k, label: t(`sch.status.${k}`) }))} />}</Field>
          <Field label={t('common.department')} error={errs.department}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <Field label={t('common.commune')} optional>{(p) => <Select {...p} value={v.commune} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        </div>
        {num('available', t('sch.available'), errs.available)}
        {num('arable', t('sch.arable'), errs.arable)}
        {num('used', t('sch.used'))}
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

function WorksDialog({ s, onClose }: { s: Scheme; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [v, setV] = useState({ type: s.status === 'projet' ? 'nouvel_amenagement' : 'rehabilitation', title: '', planned_on: '', cost: '', contractor: '', notes: '' });
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => api(`/schemes/${s.id}/works`, { method: 'POST', body: { type: v.type, title: v.title.trim(), contractor: v.contractor, notes: v.notes, ...(v.planned_on ? { planned_on: v.planned_on } : {}), ...(v.cost ? { cost_xof: Number(v.cost) } : {}) } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['schemes'] }); toast(t('sch.worksSaved')); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('sch.addWorksTitle', { name: s.name })} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form={`f-works-${s.id}`} busy={m.isPending}>{t('common.save')}</Button></>}>
      <form id={`f-works-${s.id}`} noValidate className="stack" onSubmit={(e) => { e.preventDefault(); if (v.title.trim().length < 2) return setErr(t('sch.errTitle')); setErr(''); m.mutate(); }}>
        <Field label={t('sch.worksType')}>{(p) => <Select {...p} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} options={TYPES.map((k) => ({ value: k, label: t(`sch.type.${k}`) }))} />}</Field>
        <Field label={t('sch.worksTitle')} error={err}>{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <div className="form-grid">
          <Field label={t('sch.plannedOn')} optional>{(p) => <Input {...p} type="date" value={v.planned_on} onChange={(e) => setV({ ...v, planned_on: e.target.value })} />}</Field>
          <Field label={t('sch.cost')} optional>{(p) => <div className="input-group"><Input {...p} inputMode="numeric" className="input-num" value={v.cost} onChange={(e) => setV({ ...v, cost: e.target.value.replace(/\D/g, '') })} /><span className="addon addon--end">FCFA</span></div>}</Field>
        </div>
        <Field label={t('sch.contractor')} optional>{(p) => <Input {...p} value={v.contractor} onChange={(e) => setV({ ...v, contractor: e.target.value })} />}</Field>
        <Field label={t('sch.notes')} optional>{(p) => <Textarea {...p} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}
