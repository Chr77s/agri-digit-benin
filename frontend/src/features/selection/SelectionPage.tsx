import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <PageHeader title={t('selection.title')} />
      <Notice tone="warn"><Trans i18nKey="selection.notice" components={{ b: <strong /> }} /></Notice>
      {canLaunch && (
        <form className="my-4 grid gap-3 rounded border border-border bg-surface p-4 md:grid-cols-3" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (Math.abs(sum - 1) > 0.001) { setWErr(t('selection.errSum', { sum: fmtNum(sum, 2) })); return; }
          setWErr(''); launch.mutate();
        }}>
          <h2 className="text-xl font-semibold md:col-span-3">{t('selection.launch')}</h2>
          <p className="md:col-span-3 text-muted">{t('selection.criteria')}</p>
          {(['confidence', 'road_distance', 'area'] as const).map((k) => (
            <Field key={k} label={t(`selection.w.${k}`)}>
              {(p) => <input {...p} type="number" step="0.05" min="0" max="1" className={inputCls} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />}
            </Field>
          ))}
          <Field label={t('selection.target')}>{(p) => <input {...p} type="number" min="1" className={inputCls} value={target} onChange={(e) => setTarget(Number(e.target.value))} />}</Field>
          <Field label={t('selection.depOptional')}>{(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <p className="self-end" aria-live="polite"><Trans i18nKey="selection.sum" values={{ sum: fmtNum(sum, 2) }} components={{ b: <strong /> }} /></p>
          {wErr && <p role="alert" className="text-sm text-error md:col-span-3">{wErr}</p>}
          {launch.error && <div className="md:col-span-3"><Notice tone="error" live>{launch.error.message}</Notice></div>}
          <Button type="submit" busy={launch.isPending} className="self-start">{t('selection.compute')}</Button>
        </form>
      )}
      <h2 className="mb-2 mt-4 text-xl font-semibold">{t('nav.selection')}</h2>
      {all.length === 0 ? (
        runs.isLoading ? <p>{t('common.loadingDots')}</p> : <EmptyState title={t('selection.empty')}>{canLaunch ? t('selection.emptyLaunch') : t('selection.emptyNone')}</EmptyState>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {all.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setCurrent(r.id)} aria-current={r.id === current || undefined} className={`flex min-h-touch w-full flex-wrap items-center gap-3 rounded border bg-surface p-3 text-left ${r.id === current ? 'border-brand border-2' : 'border-border'}`}>
                <Badge tone={r.status === 'validee' ? 'success' : 'warn'}>{r.status === 'validee' ? t('selection.runStatus.validee') : t('selection.runStatus.proposition')}</Badge>
                <span>{t('selection.runLine', { date: fmtDateTime(r.created_at), target: fmtNum(r.target_count), selected: fmtNum(r.selected_count) })}</span>
                <span className="text-sm text-muted">{t('selection.weightsLine', { confidence: r.weights.confidence, road: r.weights.road_distance, area: r.weights.area })}</span>
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
  const { t } = useTranslation();
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
          if (reason.trim().length < 5) { setErr(t('selection.errValidate')); return; }
          setErr(''); validate.mutate();
        }}>
          <h3 className="text-lg font-semibold">{t('selection.validateTitle')}</h3>
          <Field label={t('selection.validateReason')} error={err}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          {validate.error && <Notice tone="error" live>{validate.error.message}</Notice>}
          <Button type="submit" busy={validate.isPending} className="self-start">{t('selection.validate')}</Button>
        </form>
      )}
      {run.status === 'validee' && <Notice tone="success" live>{run.validation_reason ? t('selection.validatedReason', { reason: run.validation_reason }) : t('selection.validated')}</Notice>}
      <div className="w-64">
        <Field label={t('common.show')}>{(p) => <Select {...p} value={filter} onChange={(e) => setFilter(e.target.value)} options={[{ value: 'true', label: t('selection.selected') }, { value: 'false', label: t('selection.notSelected') }]} />}</Field>
      </div>
      <p className="text-sm text-muted">{run.total_count ? t('selection.limitTotal', { total: fmtNum(run.total_count) }) : t('selection.limit')}</p>
      <QueryState q={cands} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('selection.noCandidate')} />}>
        {(d) => (
          <Table<Candidate> caption={t('selection.candidates')} data={d} rowKey={(r) => r.farm_id} exportName="candidats" columns={[
            { key: 'rank', label: t('selection.rank') },
            { key: 'farm_id', label: t('selection.farm') },
            { key: 'commune', label: t('common.commune') },
            { key: 'score', label: t('selection.score'), render: (r) => fmtNum(r.score, 3) },
            { key: 'confidence', label: t('selection.confidence'), render: (r) => fmtNum(r.confidence, 2) },
            { key: 'road_distance_m', label: t('selection.roadM'), render: (r) => fmtNum(r.road_distance_m) },
            { key: 'area_ha', label: t('selection.areaHa'), render: (r) => fmtNum(r.area_ha, 2) },
            ...(filter === 'false' ? [{ key: 'contest', label: t('selection.contestCol'), sortable: false, render: (r: Candidate) => <Button variant="secondary" onClick={() => { setContestFarm(r.farm_id); setCReason(''); }}>{t('selection.contest')}</Button> }] : []),
          ]} />
        )}
      </QueryState>
      <h3 className="text-lg font-semibold">{t('selection.contests')}</h3>
      <QueryState q={contests} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('selection.noContest')} />}>
        {(d) => <ul className="flex flex-col gap-2">{d.map((c) => <li key={c.id} className="rounded border border-border bg-surface p-3"><strong>{c.farm_id}</strong> : {c.reason} <Badge tone="warn">{t(`contests.status.${c.status}`, c.status)}</Badge></li>)}</ul>}
      </QueryState>
      <Dialog open={!!contestFarm} onClose={() => setContestFarm(null)} title={t('selection.contestTitle', { farm: contestFarm ?? '' })}>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (cReason.trim().length >= 5) contest.mutate(); }}>
          <Field label={t('selection.contestReason')} error={cReason && cReason.trim().length < 5 ? t('selection.errContest') : undefined}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={cReason} onChange={(e) => setCReason(e.target.value)} />}</Field>
          {contest.error && <Notice tone="error" live>{contest.error.message}</Notice>}
          <Button type="submit" busy={contest.isPending}>{t('selection.fileContest')}</Button>
        </form>
      </Dialog>
    </section>
  );
}
