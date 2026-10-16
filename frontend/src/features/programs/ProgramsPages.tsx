import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, rows } from '../../shared/api/client';
import type { Application, ApplicationStatus, Paginated, Program } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDate } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useValueChains, useVcName } from '../../shared/api/ref';

const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: async () => rows(await api<Paginated<Program> | Program[]>('/programs')) });
const useApplications = () => useQuery({ queryKey: ['applications'], queryFn: async () => rows(await api<Paginated<Application> | Application[]>('/applications?page_size=100')) });

const appLabel: Record<ApplicationStatus, string> = { deposee: 'Déposée', en_instruction: 'En instruction', acceptee: 'Acceptée', refusee: 'Refusée' };
const appTone = (s: ApplicationStatus) => (s === 'acceptee' ? 'success' : s === 'refusee' ? 'error' : 'warn');
const isOpen = (p: Program) => (p.is_closed !== undefined ? !p.is_closed : p.is_open ?? new Date(p.closes_at) > new Date());

export function ProgramsPage() {
  const { user } = useAuth();
  const q = usePrograms();
  const apps = useApplications();
  const vcName = useVcName();
  const qc = useQueryClient();
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const setResult = (r: { id: string; ok: boolean; msg: string }) => setResults((x) => ({ ...x, [r.id]: r }));
  const apply = useMutation({
    mutationFn: (id: string) => api<Application>(`/programs/${id}/apply`, { method: 'POST', body: {} }),
    onSuccess: (_d, id) => { setResult({ id, ok: true, msg: 'Candidature déposée. Vous serez prévenu à chaque changement de statut.' }); void qc.invalidateQueries({ queryKey: ['applications'] }); },
    onError: (e, id) => setResult({ id, ok: false, msg: e instanceof ApiError ? e.message : 'Candidature impossible. Réessayez.' }),
  });
  const isProducer = user?.role === 'producteur';
  const myApp = (pid: string) => apps.data?.find((a) => a.program === pid);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <PageHeader title="Programmes d'appui" listen="Programmes. Touchez Candidater pour demander un appui. Un programme clos n'accepte plus de demande."
        actions={user?.role === 'responsable_programme' && <Button onClick={() => setCreateOpen(true)}>Créer un programme</Button>} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun programme publié.">Les programmes ouverts apparaîtront ici.</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-3">
            {d.map((p) => {
              const open = isOpen(p);
              const mine = myApp(p.id);
              return (
                <li key={p.id} className="flex flex-col gap-2 rounded border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{p.name}</h2>
                    {open ? <Badge tone="success">Ouvert jusqu'au {fmtDate(p.closes_at)}</Badge> : <Badge tone="error">Clos depuis le {fmtDate(p.closes_at)}</Badge>}
                  </div>
                  <p>{p.description}</p>
                  <p className="text-muted"><strong>Conditions :</strong> {p.conditions}</p>
                  {p.value_chains?.length > 0 && <p className="text-sm text-muted">Filières : {p.value_chains.map(vcName).join(', ')}</p>}
                  {isProducer && (mine
                    ? <p>Votre candidature : <Badge tone={appTone(mine.status)}>{appLabel[mine.status]}</Badge> {mine.reason && <span>Motif : {mine.reason}</span>}</p>
                    : <Button className="self-start" busy={apply.isPending && apply.variables === p.id} onClick={() => apply.mutate(p.id)}>Candidater</Button>)}
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
  const qc = useQueryClient();
  const vcs = useValueChains();
  const [v, setV] = useState({ name: '', description: '', conditions: '', value_chains: [] as string[], closes_at: '' });
  const [err, setErr] = useState('');
  const m = useMutation({ mutationFn: () => api<Program>('/programs', { method: 'POST', body: { ...v, closes_at: new Date(v.closes_at).toISOString() } }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['programs'] }); onClose(); } });
  return (
    <Dialog open={open} onClose={onClose} title="Créer un programme">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!v.name || !v.closes_at) { setErr('Le nom et la date de clôture sont obligatoires.'); return; } setErr(''); m.mutate(); }}>
        <Field label="Nom">{(p) => <input {...p} className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <Field label="Description">{(p) => <textarea {...p} className={`${inputCls} py-2`} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
        <Field label="Conditions">{(p) => <textarea {...p} className={`${inputCls} py-2`} value={v.conditions} onChange={(e) => setV({ ...v, conditions: e.target.value })} />}</Field>
        <Field label="Filières (Ctrl + clic pour plusieurs)">{(p) => <select {...p} multiple className={`${inputCls} h-32`} value={v.value_chains} onChange={(e) => setV({ ...v, value_chains: Array.from(e.target.selectedOptions, (o) => o.value) })}>{(vcs.data ?? []).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select>}</Field>
        <Field label="Date de clôture" error={err}>{(p) => <input {...p} type="date" className={inputCls} value={v.closes_at} onChange={(e) => setV({ ...v, closes_at: e.target.value })} />}</Field>
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <Button type="submit" busy={m.isPending}>Enregistrer le programme</Button>
      </form>
    </Dialog>
  );
}

export function ApplicationsPage() {
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
      <PageHeader title="Candidatures" />
      <div aria-live="polite">{decide.isSuccess && <Notice tone="success">Décision enregistrée. Le producteur a été notifié.</Notice>}</div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune candidature à instruire." />}>
        {(d) => (
          <Table<Application> caption="Candidatures" data={d} rowKey={(r) => r.id} exportName="candidatures" columns={[
            { key: 'program_name', label: 'Programme', render: (r) => r.program_name ?? r.program },
            { key: 'producer_name', label: 'Producteur', render: (r) => r.producer_name ?? r.producer_code ?? r.producer },
            { key: 'status', label: 'Statut', render: (r) => <Badge tone={appTone(r.status)}>{appLabel[r.status]}</Badge> },
            { key: 'created_at', label: 'Déposée le', render: (r) => fmtDate(r.created_at) },
            { key: 'actions', label: 'Action', sortable: false, render: (r) => <Button variant="secondary" onClick={() => { setSel(r); setReason(''); setErr(''); decide.reset(); }}>Décider</Button> },
          ]} />
        )}
      </QueryState>
      <Dialog open={!!sel} onClose={() => setSel(null)} title="Décision motivée">
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim().length < 5) { setErr('Le motif est obligatoire : expliquez la décision en une phrase.'); return; }
          decide.mutate();
        }}>
          <Field label="Décision">{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)} options={[{ value: 'en_instruction', label: 'En instruction' }, { value: 'acceptee', label: 'Acceptée' }, { value: 'refusee', label: 'Refusée' }]} />}</Field>
          <Field label="Motif" error={err}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} />}</Field>
          {decide.error && <Notice tone="error" live>{decide.error.message}</Notice>}
          <Button type="submit" busy={decide.isPending}>Enregistrer la décision</Button>
        </form>
      </Dialog>
    </>
  );
}
