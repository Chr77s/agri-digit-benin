import { VcOptions } from '../../shared/ui/VcOptions';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, rows } from '../../shared/api/client';
import type { Application, ApplicationStatus, Paginated, Program } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDate } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useValueChains, useVcName } from '../../shared/api/ref';

const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: async () => rows(await api<Paginated<Program> | Program[]>('/programs')) });
const useApplications = () => useQuery({ queryKey: ['applications'], queryFn: async () => rows(await api<Paginated<Application> | Application[]>('/applications?page_size=100')) });

const appTone = (s: ApplicationStatus) => (s === 'acceptee' ? 'success' : s === 'refusee' ? 'error' : 'warn');
const isOpen = (p: Program) => (p.is_closed !== undefined ? !p.is_closed : p.is_open ?? new Date(p.closes_at) > new Date());

export function ProgramsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const q = usePrograms();
  const apps = useApplications();
  const vcName = useVcName();
  const qc = useQueryClient();
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const setResult = (r: { id: string; ok: boolean; msg: string }) => setResults((x) => ({ ...x, [r.id]: r }));
  const apply = useMutation({
    mutationFn: (id: string) => api<Application>(`/programs/${id}/apply`, { method: 'POST', body: {} }),
    onSuccess: (_d, id) => { setResult({ id, ok: true, msg: t('programs.applied') }); void qc.invalidateQueries({ queryKey: ['applications'] }); },
    onError: (e, id) => setResult({ id, ok: false, msg: e instanceof ApiError ? e.message : t('programs.applyFail') }),
  });
  const isProducer = user?.role === 'producteur';
  const myApp = (pid: string) => apps.data?.find((a) => a.program === pid);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <PageHeader title={t('programs.title')} listen={t('programs.listen')}
        actions={user?.role === 'responsable_programme' && <Button onClick={() => setCreateOpen(true)}>{t('programs.create')}</Button>} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('programs.empty')}>{t('programs.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-3">
            {d.map((p) => {
              const open = isOpen(p);
              const mine = myApp(p.id);
              return (
                <li key={p.id} className="flex flex-col gap-2 rounded border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{p.name}</h2>
                    {open ? <Badge tone="success">{t('programs.openUntil', { date: fmtDate(p.closes_at) })}</Badge> : <Badge tone="error">{t('programs.closedSince', { date: fmtDate(p.closes_at) })}</Badge>}
                  </div>
                  <p>{p.description}</p>
                  <p className="text-muted"><strong>{t('programs.conditionsLabel')}</strong> {p.conditions}</p>
                  {p.value_chains?.length > 0 && <p className="text-sm text-muted">{t('programs.valueChainsLine', { list: p.value_chains.map(vcName).join(', ') })}</p>}
                  {isProducer && (mine
                    ? <p>{t('programs.yourApplication')} <Badge tone={appTone(mine.status)}>{t(`programs.appStatus.${mine.status}`)}</Badge> {mine.reason && <span>{t('programs.reasonLine', { reason: mine.reason })}</span>}</p>
                    : <Button className="self-start" busy={apply.isPending && apply.variables === p.id} onClick={() => apply.mutate(p.id)}>{t('programs.apply')}</Button>)}
                  <div aria-live="polite">{results[p.id] && <Notice tone={results[p.id].ok ? 'success' : 'error'}>{results[p.id].msg}</Notice>}</div>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
      <CreateProgramDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function CreateProgramDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vcs = useValueChains();
  const [v, setV] = useState({ name: '', description: '', conditions: '', value_chains: [] as string[], closes_at: '' });
  const [err, setErr] = useState('');
  // closes_at reste une date seule (AAAA-MM-JJ) : le serveur refuse un horodatage ISO complet.
  const m = useMutation({ mutationFn: () => api<Program>('/programs', { method: 'POST', body: v }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['programs'] }); onClose(); } });
  return (
    <Dialog open={open} onClose={onClose} title={t('programs.create')}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!v.name || !v.closes_at) { setErr(t('programs.errCreate')); return; } setErr(''); m.mutate(); }}>
        <Field label={t('common.name')}>{(p) => <input {...p} className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <Field label={t('programs.description')}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
        <Field label={t('programs.conditions')}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={v.conditions} onChange={(e) => setV({ ...v, conditions: e.target.value })} />}</Field>
        <Field label={t('common.valueChainsMulti')}>{(p) => <select {...p} multiple className={`${inputCls} h-32`} value={v.value_chains} onChange={(e) => setV({ ...v, value_chains: Array.from(e.target.selectedOptions, (o) => o.value) })}><VcOptions vcs={vcs.data} /></select>}</Field>
        <Field label={t('programs.closeDate')} error={err}>{(p) => <input {...p} type="date" className={inputCls} value={v.closes_at} onChange={(e) => setV({ ...v, closes_at: e.target.value })} />}</Field>
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <Button type="submit" busy={m.isPending}>{t('programs.save')}</Button>
      </form>
    </Dialog>
  );
}

export function ApplicationsPage() {
  const { t } = useTranslation();
  const q = useApplications();
  const qc = useQueryClient();
  const [sel, setSel] = useState<Application | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>('en_instruction');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const decide = useMutation({
    mutationFn: () => api(`/applications/${sel!.id}/decide`, { method: 'POST', body: { status, reason } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['applications'] }); setSel(null); },
  });
  return (
    <>
      <PageHeader title={t('nav.applications')} />
      <div aria-live="polite">{decide.isSuccess && <Notice tone="success">{t('programs.decided')}</Notice>}</div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('programs.appsEmpty')} />}>
        {(d) => (
          <Table<Application> caption={t('nav.applications')} data={d} rowKey={(r) => r.id} exportName="candidatures" columns={[
            { key: 'program_name', label: t('programs.programCol'), render: (r) => r.program_name ?? r.program },
            { key: 'producer_name', label: t('common.producer'), render: (r) => r.producer_name ?? r.producer_code ?? r.producer },
            { key: 'status', label: t('common.status'), render: (r) => <Badge tone={appTone(r.status)}>{t(`programs.appStatus.${r.status}`)}</Badge> },
            { key: 'created_at', label: t('programs.depositedOn'), render: (r) => fmtDate(r.created_at) },
            { key: 'actions', label: t('common.action'), sortable: false, render: (r) => <Button variant="secondary" onClick={() => { setSel(r); setReason(''); setErr(''); decide.reset(); }}>{t('programs.decide')}</Button> },
          ]} />
        )}
      </QueryState>
      <Dialog open={!!sel} onClose={() => setSel(null)} title={t('programs.decisionTitle')}>
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim().length < 5) { setErr(t('programs.errDecision')); return; }
          decide.mutate();
        }}>
          <Field label={t('programs.decision')}>{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)} options={(['en_instruction', 'acceptee', 'refusee'] as const).map((s) => ({ value: s, label: t(`programs.appStatus.${s}`) }))} />}</Field>
          <Field label={t('common.reason')} error={err}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} />}</Field>
          {decide.error && <Notice tone="error" live>{decide.error.message}</Notice>}
          <Button type="submit" busy={decide.isPending}>{t('programs.saveDecision')}</Button>
        </form>
      </Dialog>
    </>
  );
}
