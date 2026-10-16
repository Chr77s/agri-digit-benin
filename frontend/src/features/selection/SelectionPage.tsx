import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { Candidate, Contest, Paginated, SelectionRun, Weights } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDateTime, fmtNum } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useDepartments } from '../../shared/api/ref';

// Le contrat ne liste pas GET /selection-runs : on le tente, sinon on garde les lancements de la session.
const useRuns = () => useQuery({ queryKey: ['selection-runs'], queryFn: async () => rows(await api<Paginated<SelectionRun> | SelectionRun[]>('/selection-runs')), retry: false });
const useCandidates = (id: string, selected: string) =>
  useQuery({ queryKey: ['candidates', id, selected], queryFn: async () => rows(await api<Paginated<Candidate> | Candidate[]>(`/selection-runs/${id}/candidates${qs({ selected, page_size: 100 })}`)), enabled: !!id });
const useContests = (id: string) =>
  useQuery({ queryKey: ['contests', id], queryFn: async () => rows(await api<Paginated<Contest> | Contest[]>(`/selection-runs/${id}/contests`)), enabled: !!id });

export function SelectionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const runs = useRuns();
  const deps = useDepartments();
  const [local, setLocal] = useState<SelectionRun[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [w, setW] = useState<Weights>({ confidence: 0.5, road_distance: 0.3, area: 0.2 });
  const [target, setTarget] = useState(2000);
  const [dep, setDep] = useState('');
  const [wErr, setWErr] = useState('');
  const canLaunch = user?.role === 'responsable_programme' || user?.role === 'admin_maep';

  const launch = useMutation({
    mutationFn: () => api<SelectionRun>('/selection-runs', { method: 'POST', body: { target_count: target, weights: w, ...(dep ? { department: dep } : {}) } }),
    onSuccess: (r) => { setLocal((l) => [r, ...l]); setCurrent(r.id); void qc.invalidateQueries({ queryKey: ['selection-runs'] }); },
  });
  const all = [...local, ...(runs.data ?? []).filter((r) => !local.some((l) => l.id === r.id))];
  const run = all.find((r) => r.id === current);
  const sum = w.confidence + w.road_distance + w.area;

  return (
    <>
      <PageHeader title="Sélection des bénéficiaires" />
      <Notice tone="warn">Le calcul produit une <strong>proposition</strong>. Un agent valide et motive la décision ; un producteur exclu peut contester (loi n° 2017-20, art. 401).</Notice>
      {canLaunch && (
        <form className="my-4 grid gap-3 rounded border border-border bg-surface p-4 md:grid-cols-3" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (Math.abs(sum - 1) > 0.001) { setWErr(`La somme des pondérations doit faire 1 (actuellement ${fmtNum(sum, 2)}). Ajustez les valeurs.`); return; }
          setWErr(''); launch.mutate();
        }}>
          <h2 className="text-xl font-semibold md:col-span-3">Lancer une sélection</h2>
          <p className="md:col-span-3 text-muted">Critères du POC, fixés avant le calcul et conservés avec le résultat.</p>
          {([['confidence', 'Confiance de détection du maïs'], ['road_distance', 'Proximité de la route'], ['area', 'Taille de la parcelle']] as const).map(([k, l]) => (
            <Field key={k} label={`${l} (poids)`}>
              {(p) => <input {...p} type="number" step="0.05" min="0" max="1" className={inputCls} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />}
            </Field>
          ))}
          <Field label="Nombre cible de bénéficiaires">{(p) => <input {...p} type="number" min="1" className={inputCls} value={target} onChange={(e) => setTarget(Number(e.target.value))} />}</Field>
          <Field label="Département (facultatif)">{(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder="Tous" options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <p className="self-end" aria-live="polite">Somme des poids : <strong>{fmtNum(sum, 2)}</strong></p>
          {wErr && <p role="alert" className="text-sm text-error md:col-span-3">{wErr}</p>}
          {launch.error && <div className="md:col-span-3"><Notice tone="error" live>{launch.error.message}</Notice></div>}
          <Button type="submit" busy={launch.isPending} className="self-start">Calculer la proposition</Button>
        </form>
      )}
      <h2 className="mb-2 mt-4 text-xl font-semibold">Sélections</h2>
      {all.length === 0 ? (
        runs.isLoading ? <p>Chargement...</p> : <EmptyState title="Aucune sélection.">{canLaunch ? 'Fixez les pondérations ci-dessus puis lancez le calcul.' : 'Le responsable de programme n’a encore lancé aucune sélection.'}</EmptyState>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {all.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setCurrent(r.id)} aria-current={r.id === current || undefined} className={`flex min-h-touch w-full flex-wrap items-center gap-3 rounded border bg-surface p-3 text-left ${r.id === current ? 'border-brand border-2' : 'border-border'}`}>
                <Badge tone={r.status === 'validee' ? 'success' : 'warn'}>{r.status === 'validee' ? 'Validée' : 'Proposition'}</Badge>
                <span>{fmtDateTime(r.created_at)}, cible {fmtNum(r.target_count)}, retenus {fmtNum(r.selected_count)}</span>
                <span className="text-sm text-muted">Poids : confiance {r.weights.confidence}, route {r.weights.road_distance}, surface {r.weights.area}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {run && <RunDetail run={run} onUpdated={(r) => setLocal((l) => [r, ...l.filter((x) => x.id !== r.id)])} />}
    </>
  );
}

function RunDetail({ run, onUpdated }: { run: SelectionRun; onUpdated: (r: SelectionRun) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('true');
  const cands = useCandidates(run.id, filter);
  const contests = useContests(run.id);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [contestFarm, setContestFarm] = useState<string | null>(null);
  const [cReason, setCReason] = useState('');
  const validate = useMutation({
    mutationFn: () => api<SelectionRun>(`/selection-runs/${run.id}/validate`, { method: 'POST', body: { reason } }),
    onSuccess: (r) => { onUpdated(r); void qc.invalidateQueries({ queryKey: ['selection-runs'] }); },
  });
  const contest = useMutation({
    mutationFn: () => api<Contest>(`/selection-runs/${run.id}/contest`, { method: 'POST', body: { farm_id: contestFarm, reason: cReason } }),
    onSuccess: () => { setContestFarm(null); void qc.invalidateQueries({ queryKey: ['contests', run.id] }); },
  });
  const canValidate = (user?.role === 'agent_atda' || user?.role === 'admin_maep') && run.status === 'proposition';

  return (
    <section className="flex flex-col gap-4">
      {canValidate && (
        <form className="flex flex-col gap-3 rounded border border-border bg-surface p-4" onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim().length < 5) { setErr('Motivez la validation en une phrase.'); return; }
          setErr(''); validate.mutate();
        }}>
          <h3 className="text-lg font-semibold">Valider cette proposition</h3>
          <Field label="Motif de la validation" error={err}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          {validate.error && <Notice tone="error" live>{validate.error.message}</Notice>}
          <Button type="submit" busy={validate.isPending} className="self-start">Valider la sélection</Button>
        </form>
      )}
      {run.status === 'validee' && <Notice tone="success" live>Sélection validée{run.validation_reason ? ` : ${run.validation_reason}` : '.'}</Notice>}
      <div className="w-64">
        <Field label="Afficher">{(p) => <Select {...p} value={filter} onChange={(e) => setFilter(e.target.value)} options={[{ value: 'true', label: 'Retenus' }, { value: 'false', label: 'Non retenus' }]} />}</Field>
      </div>
      <QueryState q={cands} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun candidat dans cette catégorie." />}>
        {(d) => (
          <Table<Candidate> caption="Candidats" data={d} rowKey={(r) => r.farm_id} exportName="candidats" columns={[
            { key: 'rank', label: 'Rang' },
            { key: 'farm_id', label: 'Ferme' },
            { key: 'commune', label: 'Commune' },
            { key: 'score', label: 'Score', render: (r) => fmtNum(r.score, 3) },
            { key: 'confidence', label: 'Confiance', render: (r) => fmtNum(r.confidence, 2) },
            { key: 'road_distance_m', label: 'Route (m)', render: (r) => fmtNum(r.road_distance_m) },
            { key: 'area_ha', label: 'Surface (ha)', render: (r) => fmtNum(r.area_ha, 2) },
            ...(filter === 'false' ? [{ key: 'contest', label: 'Contestation', sortable: false, render: (r: Candidate) => <Button variant="secondary" onClick={() => { setContestFarm(r.farm_id); setCReason(''); }}>Contester</Button> }] : []),
          ]} />
        )}
      </QueryState>
      <h3 className="text-lg font-semibold">Contestations</h3>
      <QueryState q={contests} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune contestation déposée." />}>
        {(d) => <ul className="flex flex-col gap-2">{d.map((c) => <li key={c.id} className="rounded border border-border bg-surface p-3"><strong>{c.farm_id}</strong> : {c.reason} <Badge tone="warn">{c.status}</Badge></li>)}</ul>}
      </QueryState>
      <Dialog open={!!contestFarm} onClose={() => setContestFarm(null)} title={`Contester l'exclusion de ${contestFarm ?? ''}`}>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (cReason.trim().length >= 5) contest.mutate(); }}>
          <Field label="Motif de la contestation" error={cReason && cReason.trim().length < 5 ? 'Expliquez en une phrase.' : undefined}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={cReason} onChange={(e) => setCReason(e.target.value)} />}</Field>
          {contest.error && <Notice tone="error" live>{contest.error.message}</Notice>}
          <Button type="submit" busy={contest.isPending}>Déposer la contestation</Button>
        </form>
      </Dialog>
    </section>
  );
}
