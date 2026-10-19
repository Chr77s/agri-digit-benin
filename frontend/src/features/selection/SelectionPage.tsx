import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import { api, qs, rows } from '../../shared/api/client';
import type { Candidate, Contest, Paginated, SelectionRun, Weights } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Checkbox, Chips, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Skeleton, Table, Textarea, fmtDateTime, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import '../producers/agent.css';

// Le contrat ne liste pas GET /selection-runs : on le tente, sinon on garde les lancements de la session.
const useRuns = () => useQuery({ queryKey: ['selection-runs'], queryFn: async () => rows(await api<Paginated<SelectionRun> | SelectionRun[]>('/selection-runs')), retry: false });
const useCandidates = (id: string, selected: string) =>
  useQuery({ queryKey: ['candidates', id, selected], queryFn: async () => rows(await api<Paginated<Candidate> | Candidate[]>(`/selection-runs/${id}/candidates${qs({ selected, page_size: 100 })}`)), enabled: !!id });
const useContests = (id: string) =>
  useQuery({ queryKey: ['contests', id], queryFn: async () => rows(await api<Paginated<Contest> | Contest[]>(`/selection-runs/${id}/contests`)), enabled: !!id });

const WEIGHT_KEYS = ['confidence', 'road_distance', 'area'] as const;
/** Les pondérations doivent faire 1 (tolérance d'arrondi). */
export const weightsOk = (w: Weights) => Math.abs(w.confidence + w.road_distance + w.area - 1) <= 0.001;

export function SelectionPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const runs = useRuns();
  const deps = useDepartments();
  const place = usePlaceName();
  const [local, setLocal] = useState<SelectionRun[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [w, setW] = useState<Weights>({ confidence: 0.5, road_distance: 0.3, area: 0.2 });
  const [target, setTarget] = useState(2000);
  const [dep, setDep] = useState('');
  const [wErr, setWErr] = useState('');
  const canLaunch = user?.role === 'responsable_programme' || user?.role === 'admin_maep';

  const launch = useMutation({
    mutationFn: () => api<SelectionRun>('/selection-runs', { method: 'POST', body: { target_count: target, weights: w, ...(dep ? { department: dep } : {}) } }),
    onSuccess: (r) => { setLocal((l) => [r, ...l]); setCurrent(r.id); toast(t('ag.sel.launched')); void qc.invalidateQueries({ queryKey: ['selection-runs'] }); },
  });
  const all = [...local, ...(runs.data ?? []).filter((r) => !local.some((l) => l.id === r.id))];
  const run = all.find((r) => r.id === current) ?? all[0];
  const sum = w.confidence + w.road_distance + w.area;

  return (
    <>
      <PageHeader title={t('selection.title')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.selection') }]} desc={t('ag.sel.desc')} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="warn" icon="scale"><Trans i18nKey="selection.notice" components={{ b: <strong /> }} /></Alert>
        {canLaunch && (
          <form className="card stack" noValidate aria-labelledby="h-launch" onSubmit={(e) => {
            e.preventDefault();
            if (!weightsOk(w)) { setWErr(t('selection.errSum', { sum: fmtNum(sum, 2) })); return; }
            setWErr(''); launch.mutate();
          }}>
            <div><h2 className="card-title" id="h-launch">{t('selection.launch')}</h2><p className="card-sub">{t('selection.criteria')}</p></div>
            <div className="form-grid">
              {WEIGHT_KEYS.map((k) => (
                <Field key={k} label={t(`selection.w.${k}`)}>
                  {(p) => <Input {...p} type="number" step="0.05" min="0" max="1" inputMode="decimal" value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />}
                </Field>
              ))}
              <Field label={t('selection.target')}>{(p) => <Input {...p} type="number" min="1" inputMode="numeric" value={target} onChange={(e) => setTarget(Number(e.target.value))} />}</Field>
              <Field label={t('selection.depOptional')}>{(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
            </div>
            <p aria-live="polite"><Trans i18nKey="selection.sum" values={{ sum: fmtNum(sum, 2) }} components={{ b: <strong /> }} /></p>
            {wErr && <Alert tone="danger" live>{wErr}</Alert>}
            {launch.error && <Alert tone="danger" live>{launch.error.message}</Alert>}
            <div className="cluster justify-end"><Button type="submit" busy={launch.isPending}>{t('selection.compute')}</Button></div>
          </form>
        )}

        <section aria-labelledby="h-runs" className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="between"><h2 className="section-title" id="h-runs">{t('ag.sel.runsTitle')}</h2><span className="small muted">{t('ag.sel.runsSub')}</span></div>
          {all.length === 0 ? (
            runs.isLoading ? <Skeleton /> : <div className="card"><EmptyState title={t('selection.empty')}>{canLaunch ? t('selection.emptyLaunch') : t('selection.emptyNone')}</EmptyState></div>
          ) : (
            <div className="runs" role="radiogroup" aria-label={t('ag.sel.chooseRun')}>
              {all.map((r) => (
                <label key={r.id} className="choice-card">
                  <input className="radio" type="radio" name="run" checked={r.id === run?.id} onChange={() => setCurrent(r.id)} />
                  <span className="rl">
                    <Badge tone={r.status === 'validee' ? 'ok' : 'wait'}>{t(`selection.runStatus.${r.status}`)}</Badge>
                    <b className="num">{t('ag.sel.runLine', { date: fmtDateTime(r.created_at), dep: r.department ? place(r.department) : t('contests.allCountry'), target: fmtNum(r.target_count), selected: fmtNum(r.selected_count) })}</b>
                    <span className="small muted">{r.status === 'validee' && r.validation_reason ? t('selection.validatedReason', { reason: r.validation_reason }) : t('selection.weightsLine', { confidence: fmtNum(r.weights.confidence, 2), road: fmtNum(r.weights.road_distance, 2), area: fmtNum(r.weights.area, 2) })}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        {run && <RunDetail key={run.id} run={run} onUpdated={(r) => setLocal((l) => [r, ...l.filter((x) => x.id !== r.id)])} />}
      </div>
    </>
  );
}

function RunDetail({ run, onUpdated }: { run: SelectionRun; onUpdated: (r: SelectionRun) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('true');
  const cands = useCandidates(run.id, filter);
  const contests = useContests(run.id);
  const [reason, setReason] = useState('');
  const [sampled, setSampled] = useState(false);
  const [err, setErr] = useState('');
  const [contestFarm, setContestFarm] = useState<string | null>(null);
  const [cReason, setCReason] = useState('');
  const [cErr, setCErr] = useState('');
  const validate = useMutation({
    mutationFn: () => api<SelectionRun>(`/selection-runs/${run.id}/validate`, { method: 'POST', body: { reason } }),
    onSuccess: (r) => { onUpdated(r); toast(t('ag.sel.validatedToast')); void qc.invalidateQueries({ queryKey: ['selection-runs'] }); },
  });
  const contest = useMutation({
    mutationFn: () => api<Contest>(`/selection-runs/${run.id}/contest`, { method: 'POST', body: { farm_id: contestFarm, reason: cReason } }),
    onSuccess: () => { setContestFarm(null); toast(t('contests.sent')); void qc.invalidateQueries({ queryKey: ['contests', run.id] }); },
  });
  const isAgent = user?.role === 'agent_atda' || user?.role === 'admin_maep';
  const launchedByMe = run.created_by === user?.id || run.created_by === user?.phone;
  const total = run.total_count;
  const sum = run.weights.confidence + run.weights.road_distance + run.weights.area;

  return (
    <div className="split">
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Card title={t('ag.sel.critTitle')} actions={<Badge tone="sim">{t('ag.sel.demoScore')}</Badge>}>
          <div className="weights">
            {WEIGHT_KEYS.map((k) => <div key={k} className="w"><span className="small muted">{t(`ag.sel.w.${k}`)}</span><b>{fmtNum(run.weights[k], 2)}</b></div>)}
          </div>
          <p className="small muted mt-3">{t('ag.sel.sumLine', { sum: fmtNum(sum, 2) })}{total ? ` · ${t('ag.sel.evaluated', { n: fmtNum(total), dep: run.department ? place(run.department) : t('contests.allCountry') })}` : ''}</p>
        </Card>
        <QueryState q={cands} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('selection.noCandidate')} /></div>}>
          {(d) => (
            <Table<Candidate> title={t('selection.candidates')} caption={t('selection.candidates')} data={d} rowKey={(r) => r.farm_id} exportName="candidats"
              toolbar={<Chips single label={t('common.show')} value={[filter]} onChange={(v) => setFilter(v[0])}
                options={[{ value: 'true', label: t('selection.selected'), count: run.selected_count }, { value: 'false', label: t('selection.notSelected'), count: total ? total - run.selected_count : undefined }]} />}
              columns={[
                { key: 'rank', label: t('selection.rank'), num: true },
                { key: 'farm_id', label: t('selection.farm'), primary: true, render: (r) => <span className="cell-main num">{r.farm_id}</span> },
                { key: 'commune', label: t('common.commune'), render: (r) => place(r.commune) },
                { key: 'score', label: t('selection.score'), num: true, render: (r) => fmtNum(r.score, 3) },
                { key: 'confidence', label: t('selection.confidence'), num: true, render: (r) => fmtNum(r.confidence, 2) },
                { key: 'road_distance_m', label: t('selection.roadM'), num: true, render: (r) => fmtNum(r.road_distance_m) },
                { key: 'area_ha', label: t('selection.areaHa'), num: true, render: (r) => fmtNum(r.area_ha, 2) },
                ...(filter === 'false' ? [{ key: 'contest', label: t('selection.contestCol'), actions: true, render: (r: Candidate) => <Button variant="secondary" size="sm" onClick={() => { setContestFarm(r.farm_id); setCReason(''); setCErr(''); contest.reset(); }}>{t('selection.contest')}</Button> }] : []),
              ]} />
          )}
        </QueryState>
        <p className="small muted">{total ? t('selection.limitTotal', { total: fmtNum(total) }) : t('selection.limit')}</p>
      </div>

      <aside className="stack" aria-label={t('ag.sel.asideLabel')}>
        {run.status === 'validee' ? (
          <Alert tone="ok" live title={t('selection.validated')}>{run.validation_reason && t('ag.sel.reasonLine', { reason: run.validation_reason })}</Alert>
        ) : isAgent ? (
          <form className="card stack" style={{ '--gap': '14px' } as React.CSSProperties} noValidate aria-labelledby="h-val" onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length < 5) { setErr(t('selection.errValidate')); return; }
            setErr(''); validate.mutate();
          }}>
            <h2 className="card-title" id="h-val">{t('selection.validateTitle')}</h2>
            <p className="small muted">{launchedByMe ? t('ag.sel.cannotOwn') : t('ag.sel.validateIntro')}</p>
            <Field label={t('selection.validateReason')} error={err}>{(p) => <Textarea {...p} rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} />}</Field>
            <Checkbox label={t('ag.sel.sampled')} checked={sampled} onChange={(e) => setSampled(e.target.checked)} />
            {validate.error && <Alert tone="danger" live>{validate.error.message}</Alert>}
            <Button type="submit" block busy={validate.isPending} disabled={!sampled || launchedByMe}>{t('selection.validate')}</Button>
            <p className="hint">{t('ag.sel.refuseHint')}</p>
          </form>
        ) : (
          <Alert tone="info">{t('ag.sel.waitAgent')}</Alert>
        )}
        <Card title={t('selection.contests')} actions={<Link className="small" to="/contestations">{t('ag.home.instruct')}</Link>}>
          <QueryState q={contests} empty={(d) => d.length === 0} emptyText={<p className="small muted">{t('selection.noContest')}</p>}>
            {(d) => (
              <ul className="list">
                {d.map((c) => <li key={c.id} className="list-item"><span className="li-main"><span className="li-title num">{c.farm_id}</span><span className="li-meta">{c.reason}</span></span>
                  <span className="li-end"><Badge tone={c.status === 'deposee' ? 'wait' : c.status === 'acceptee' ? 'ok' : 'bad'}>{t(`contests.status.${c.status}`, c.status)}</Badge></span></li>)}
              </ul>
            )}
          </QueryState>
        </Card>
      </aside>

      <Dialog open={!!contestFarm} onClose={() => setContestFarm(null)} title={t('selection.contestTitle', { farm: contestFarm ?? '' })}
        footer={<><Button variant="ghost" onClick={() => setContestFarm(null)}>{t('common.cancel')}</Button><Button type="submit" form="f-contest" busy={contest.isPending}>{t('selection.fileContest')}</Button></>}>
        <form id="f-contest" noValidate className="stack" onSubmit={(e) => { e.preventDefault(); if (cReason.trim().length < 5) { setCErr(t('selection.errContest')); return; } contest.mutate(); }}>
          <Field label={t('selection.contestReason')} error={cErr}>{(p) => <Textarea {...p} value={cReason} onChange={(e) => { setCReason(e.target.value); setCErr(''); }} />}</Field>
          {contest.error && <Alert tone="danger" live>{contest.error.message}</Alert>}
        </form>
      </Dialog>
    </div>
  );
}
