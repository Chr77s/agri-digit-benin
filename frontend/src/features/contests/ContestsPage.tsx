import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, list } from '../../shared/api/client';
import type { Contest, SelectionRun } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Dialog, EmptyState, Field, Icon, PageHeader, QueryState, Select, Textarea, Input, Timeline, fieldError, fmtDate, type BadgeTone, type TimelineItem } from '../../shared/ui';
import { usePlaceName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import '../producers/producteur.css';

// Même clé et même forme de données que SelectionPage : le cache est partagé.
const useRuns = () => useQuery({ queryKey: ['selection-runs'], queryFn: () => list<SelectionRun>('/selection-runs'), retry: false });

type Decision = 'acceptee' | 'rejetee';
const TONE: Record<string, BadgeTone> = { deposee: 'wait', acceptee: 'ok', rejetee: 'bad' };

function StatusBadge({ s }: { s: string }) {
  const { t } = useTranslation();
  return <Badge tone={TONE[s] ?? 'neutral'}>{t(`contests.status.${s}`, { defaultValue: s })}</Badge>;
}

function ContestDialog({ runs, initial, onClose, onDone }: { runs: SelectionRun[]; initial?: SelectionRun; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const place = usePlaceName();
  const [run, setRun] = useState(initial?.id ?? (runs.length === 1 ? runs[0].id : ''));
  const [farm, setFarm] = useState('');
  const [reason, setReason] = useState('');
  const [errs, setErrs] = useState<{ run?: string; farm?: string; reason?: string }>({});
  const m = useMutation({
    mutationFn: () => api<Contest>(`/selection-runs/${run}/contest`, { method: 'POST', body: { farm_id: farm.trim(), reason: reason.trim() } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['contests'] }); onDone(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('contests.dialogTitle')}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" form="f-ct" busy={m.isPending}>{t('contests.submit')}</Button>
      </>}>
      <form id="f-ct" noValidate className="stack" style={{ ['--gap' as string]: '14px' }} onSubmit={(e) => {
        e.preventDefault();
        const er: typeof errs = {};
        if (!run) er.run = t('contests.errRun');
        if (!farm.trim()) er.farm = t('contests.errFarm');
        if (reason.trim().length < 5) er.reason = t('common.errReason');
        setErrs(er);
        if (!Object.keys(er).length) m.mutate();
      }}>
        <Field label={t('contests.decisionField')} error={errs.run}>
          {(p) => <Select {...p} value={run} placeholder={t('common.choose')} onChange={(e) => { setRun(e.target.value); setErrs((x) => ({ ...x, run: undefined })); }}
            options={runs.map((r) => ({ value: r.id, label: t('contests.runOption', { date: fmtDate(r.created_at), name: r.department ? place(r.department) : t('contests.allCountry'), selected: r.selected_count }) }))} />}
        </Field>
        <Field label={t('contests.farmId')} hint={t('contests.farmIdHint')} error={errs.farm ?? fieldError(m.error, 'farm_id')}>
          {(p) => <Input {...p} value={farm} autoComplete="off" onChange={(e) => { setFarm(e.target.value); setErrs((x) => ({ ...x, farm: undefined })); }} />}
        </Field>
        <Field label={t('contests.reason')} hint={t('contests.reasonHint')} error={errs.reason ?? fieldError(m.error, 'reason')}>
          {(p) => <Textarea {...p} rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setErrs((x) => ({ ...x, reason: undefined })); }} />}
        </Field>
        {m.error && !fieldError(m.error, 'farm_id') && !fieldError(m.error, 'reason') && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

function ProducerContests() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const runs = useRuns();
  const mine = useQuery({ queryKey: ['contests', 'mine'], queryFn: () => list<Contest>('/contests/mine') });
  const [target, setTarget] = useState<{ run?: SelectionRun } | null>(null);
  const [msg, setMsg] = useState('');
  const validated = (runs.data ?? []).filter((r) => r.status === 'validee');
  const runOf = (c: Contest) => runs.data?.find((r) => r.id === c.run);
  return (
    <>
      <PageHeader title={t('contests.titleMine')} desc={t('contests.introProducer')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('contests.titleMine') }]}
        actions={<Button icon="scale" disabled={validated.length === 0} onClick={() => { setMsg(''); setTarget({}); }}>{t('contests.contestOne')}</Button>} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <div aria-live="polite">{msg && <Alert tone="ok">{msg}</Alert>}</div>
        <Card title={t('contests.runsTitle')} sub={t('contests.runsSub')}>
          <QueryState q={runs} empty={() => validated.length === 0} emptyText={<EmptyState icon="list-check" title={t('contests.runsEmpty')}>{t('contests.runsEmptyHelp')}</EmptyState>}>
            {() => (
              <ul className="list">
                {validated.map((r) => (
                  <li key={r.id} className="list-item flex-wrap">
                    <span className="li-icon"><Icon name="list-check" /></span>
                    <span className="li-main">
                      <span className="li-title">{t('contests.runLine', { date: fmtDate(r.created_at), selected: r.selected_count, target: r.target_count })}</span>
                      <span className="li-meta">
                        {[r.department ? t('contests.runDept', { name: place(r.department) }) : t('contests.allCountry'), r.validation_reason && t('contests.runReason', { reason: r.validation_reason })].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="li-end"><Button variant="secondary" size="sm" onClick={() => { setMsg(''); setTarget({ run: r }); }}>{t('contests.contestAction')}</Button></span>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>
        <h2 className="section-title">{t('contests.trackTitle')}</h2>
        <QueryState q={mine} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="scale" title={t('contests.mineEmpty')} /></div>}>
          {(d) => (
            <>
              {d.map((c) => {
                const r = runOf(c);
                const steps: TimelineItem[] = [{ state: 'done', time: fmtDate(c.created_at), title: t('contests.stepFiled') }];
                if (c.status === 'deposee') steps.push({ state: 'now', time: t('contests.inProgress'), title: t('contests.stepReview') }, { time: t('contests.upcoming'), title: t('contests.stepDecision') });
                else steps.push({ state: c.status === 'acceptee' ? 'done' : 'alert', time: fmtDate(c.decided_at), title: t(`contests.step.${c.status}`, { defaultValue: c.status }) });
                return (
                  <article key={c.id} className="card ct" aria-labelledby={`k-${c.id}`}>
                    <div>
                      <div className="between">
                        <h3 className="card-title break-all" id={`k-${c.id}`}>{r ? t('contests.cardTitle', { date: fmtDate(r.created_at), farm: c.farm_id }) : t('contests.farm', { farm: c.farm_id })}</h3>
                        <StatusBadge s={c.status} />
                      </div>
                      <p className="small muted mt-1">{t('contests.filedOn', { date: fmtDate(c.created_at) })}{c.decided_at && ` · ${t('contests.decidedOn', { date: fmtDate(c.decided_at) })}`}</p>
                      <p className="mt-2.5 break-words"><b>{t('contests.yourReason')}</b> « {c.reason} »</p>
                      {c.decision_reason && <p className="mt-2.5 break-words"><b>{t('contests.decisionReasonLabelShort')}</b> « {c.decision_reason} »</p>}
                      {c.status === 'rejetee' && <p className="hint mt-2">{t('contests.apdp')}</p>}
                    </div>
                    <Timeline items={steps} />
                  </article>
                );
              })}
            </>
          )}
        </QueryState>
      </div>
      {target && <ContestDialog runs={validated} initial={target.run} onClose={() => setTarget(null)} onDone={() => { setTarget(null); setMsg(t('contests.sent')); }} />}
    </>
  );
}

function DecideDialog({ c, onClose, onDone }: { c: Contest; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Decision | ''>('');
  const [reason, setReason] = useState('');
  const [errs, setErrs] = useState<{ status?: string; reason?: string }>({});
  const m = useMutation({
    mutationFn: (b: { status: Decision; reason: string }) => api<Contest>(`/contests/${c.id}/decide`, { method: 'POST', body: b }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['contests'] }); onDone(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('contests.decideTitle', { farm: c.farm_id })}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" form="f-decide" busy={m.isPending}>{t('contests.decideSubmit')}</Button>
      </>}>
      <blockquote className="mb-3 break-words rounded-md border border-border bg-bg p-3">« {c.reason} »</blockquote>
      <form id="f-decide" noValidate className="stack" style={{ ['--gap' as string]: '14px' }} onSubmit={(e) => {
        e.preventDefault();
        const er: { status?: string; reason?: string } = {};
        if (status === '') er.status = t('contests.errDecision');
        if (reason.trim().length < 5) er.reason = t('common.errReason');
        setErrs(er);
        if (status !== '' && !er.reason) m.mutate({ status, reason: reason.trim() });
      }}>
        <Field label={t('contests.decision')} error={errs.status ?? fieldError(m.error, 'status')}>
          {(p) => (
            <Select {...p} value={status} placeholder={t('common.choose')}
              onChange={(e) => { setStatus(e.target.value as Decision | ''); setErrs((x) => ({ ...x, status: undefined })); }}
              options={[{ value: 'acceptee', label: t('contests.accept') }, { value: 'rejetee', label: t('contests.reject') }]} />
          )}
        </Field>
        <Field label={t('contests.decisionReasonLabel')} error={errs.reason ?? fieldError(m.error, 'reason')}>
          {(p) => <Textarea {...p} rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setErrs((x) => ({ ...x, reason: undefined })); }} />}
        </Field>
        {m.error && !fieldError(m.error, 'status') && !fieldError(m.error, 'reason') && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

function AgentContests() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const runs = useRuns();
  const [sel, setSel] = useState('');
  const [filter, setFilter] = useState<'deposee' | 'all'>('deposee');
  const [target, setTarget] = useState<Contest | null>(null);
  const [msg, setMsg] = useState('');
  const validated = (runs.data ?? []).filter((r) => r.status === 'validee');
  const runId = sel && validated.some((r) => r.id === sel) ? sel : validated[0]?.id ?? '';
  const contests = useQuery({ queryKey: ['contests', runId], queryFn: () => list<Contest>(`/selection-runs/${runId}/contests`), enabled: !!runId });
  const open = (contests.data ?? []).filter((c) => c.status === 'deposee').length;
  return (
    <>
      <PageHeader title={t('contests.titleReview')} desc={t('contests.reviewDesc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('contests.titleReview') }]} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Alert tone="warn" icon="scale">{t('contests.introAgent')}</Alert>
        <div aria-live="polite">{msg && <Alert tone="ok">{msg}</Alert>}</div>
        <QueryState q={runs} empty={() => validated.length === 0} emptyText={<div className="card"><EmptyState icon="scale" title={t('contests.noValidatedRun')} /></div>}>
          {() => (
            <>
              <div className="filters-row">
                <Field label={t('contests.selectRun')}>
                  {(p) => (
                    <Select {...p} value={runId} onChange={(e) => setSel(e.target.value)}
                      options={validated.map((r) => ({ value: r.id, label: t('contests.runOption', { date: fmtDate(r.created_at), name: r.department ? place(r.department) : t('contests.allCountry'), selected: r.selected_count }) }))} />
                  )}
                </Field>
                <Field label={t('common.show')}>
                  {(p) => (
                    <Select {...p} value={filter} onChange={(e) => setFilter(e.target.value as 'deposee' | 'all')}
                      options={[{ value: 'deposee', label: `${t('contests.filterOpen')}${contests.data ? ` (${open})` : ''}` }, { value: 'all', label: `${t('contests.filterAll')}${contests.data ? ` (${contests.data.length})` : ''}` }]} />
                  )}
                </Field>
              </div>
              <QueryState q={contests} empty={(d) => (filter === 'deposee' ? d.filter((c) => c.status === 'deposee') : d).length === 0}
                emptyText={<div className="card"><EmptyState icon="check-circle" title={filter === 'deposee' ? t('contests.listEmptyOpen') : t('contests.listEmptyAll')} /></div>}>
                {(d) => (
                  <div className="grid-fit" style={{ ['--min' as string]: '340px' }}>
                    {(filter === 'deposee' ? d.filter((c) => c.status === 'deposee') : d).map((c) => (
                      <article key={c.id} className="card contest" aria-labelledby={`c-${c.id}`}>
                        <div className="cluster"><h2 className="card-title break-all" id={`c-${c.id}`}>{t('contests.farm', { farm: c.farm_id })}</h2><StatusBadge s={c.status} /></div>
                        <p className="small muted">{t('contests.filedOn', { date: fmtDate(c.created_at) })}{c.decided_at && ` · ${t('contests.decidedOn', { date: fmtDate(c.decided_at) })}`}</p>
                        <blockquote>« {c.reason} »</blockquote>
                        {c.decision_reason && <p className="small break-words"><b>{t('contests.decisionReasonLabelShort')}</b> {c.decision_reason}</p>}
                        {c.status === 'deposee' && (
                          <div className="cluster"><Button size="sm" onClick={() => { setMsg(''); setTarget(c); }} aria-label={t('contests.decideNamed', { farm: c.farm_id })}>{t('contests.decide')}</Button></div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </QueryState>
            </>
          )}
        </QueryState>
      </div>
      {target && <DecideDialog c={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); setMsg(t('contests.decided')); }} />}
    </>
  );
}

export function ContestsPage() {
  const { user } = useAuth();
  return user?.role === 'producteur' ? <ProducerContests /> : <AgentContests />;
}
