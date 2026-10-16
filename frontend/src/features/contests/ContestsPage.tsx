import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, list } from '../../shared/api/client';
import type { Contest, SelectionRun } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, Notice, PageHeader, QueryState, Select, fieldError, fmtDate, inputCls } from '../../shared/ui';
import { usePlaceName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';

// Même clé et même forme de données que SelectionPage : le cache est partagé.
const useRuns = () => useQuery({ queryKey: ['selection-runs'], queryFn: () => list<SelectionRun>('/selection-runs'), retry: false });

type Decision = 'acceptee' | 'rejetee';
const TONE: Record<string, 'warn' | 'success' | 'error'> = { deposee: 'warn', acceptee: 'success', rejetee: 'error' };

function ErrorLine({ error }: { error: Error | null }) {
  return error ? <div role="alert"><Notice tone="error">{error.message}</Notice></div> : null;
}

function ContestCard({ c, onDecide }: { c: Contest; onDecide?: () => void }) {
  const { t } = useTranslation();
  return (
    <li className="rounded border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="break-all font-semibold">{t('contests.farm', { farm: c.farm_id })}</p>
        <Badge tone={TONE[c.status] ?? 'neutral'}>{t(`contests.status.${c.status}`, { defaultValue: c.status })}</Badge>
      </div>
      <p className="mt-1 break-words">{c.reason}</p>
      <p className="text-sm text-muted">{t('contests.filedOn', { date: fmtDate(c.created_at) })}</p>
      {c.decision_reason && (
        <p className="mt-1 break-words">
          {t('contests.decisionReason', { reason: c.decision_reason })}
          {c.decided_at && <span className="text-sm text-muted"> ({t('contests.decidedOn', { date: fmtDate(c.decided_at) })})</span>}
        </p>
      )}
      {onDecide && c.status === 'deposee' && <Button className="mt-2" onClick={onDecide}>{t('contests.decide')}</Button>}
    </li>
  );
}

function ContestDialog({ run, onClose, onDone }: { run: SelectionRun; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [farm, setFarm] = useState('');
  const [reason, setReason] = useState('');
  const [errs, setErrs] = useState<{ farm?: string; reason?: string }>({});
  const m = useMutation({
    mutationFn: () => api<Contest>(`/selection-runs/${run.id}/contest`, { method: 'POST', body: { farm_id: farm.trim(), reason: reason.trim() } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['contests'] }); onDone(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('contests.dialogTitle')}>
      <form noValidate className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        const er: { farm?: string; reason?: string } = {};
        if (!farm.trim()) er.farm = t('contests.errFarm');
        if (reason.trim().length < 5) er.reason = t('common.errReason');
        setErrs(er);
        if (!er.farm && !er.reason) m.mutate();
      }}>
        <Field label={t('contests.farmId')} hint={t('contests.farmIdHint')} error={errs.farm ?? fieldError(m.error, 'farm_id')}>
          {(p) => <input {...p} className={inputCls} value={farm} autoComplete="off" onChange={(e) => { setFarm(e.target.value); setErrs((x) => ({ ...x, farm: undefined })); }} />}
        </Field>
        <Field label={t('contests.reason')} error={errs.reason ?? fieldError(m.error, 'reason')}>
          {(p) => <textarea {...p} className={`${inputCls} py-2`} rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setErrs((x) => ({ ...x, reason: undefined })); }} />}
        </Field>
        <ErrorLine error={m.error} />
        <Button type="submit" busy={m.isPending}>{t('contests.submit')}</Button>
      </form>
    </Dialog>
  );
}

function ProducerContests() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const runs = useRuns();
  const mine = useQuery({ queryKey: ['contests', 'mine'], queryFn: () => list<Contest>('/contests/mine') });
  const [target, setTarget] = useState<SelectionRun | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <div aria-live="polite" className="my-4">{msg && <Notice tone="success">{msg}</Notice>}</div>
      <h2 className="mb-2 text-xl font-semibold">{t('contests.runsTitle')}</h2>
      <QueryState q={runs} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('contests.runsEmpty')}>{t('contests.runsEmptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="mb-6 flex flex-col gap-2">
            {d.map((r) => (
              <li key={r.id} className="rounded border border-border bg-surface p-3">
                <p className="font-semibold">{t('contests.runLine', { date: fmtDate(r.created_at), selected: r.selected_count, target: r.target_count })}</p>
                <p className="text-muted">{r.department ? t('contests.runDept', { name: place(r.department) }) : t('contests.allCountry')}</p>
                {r.validation_reason && <p className="break-words text-sm text-muted">{t('contests.runReason', { reason: r.validation_reason })}</p>}
                <Button variant="secondary" className="mt-2" onClick={() => { setMsg(''); setTarget(r); }}>{t('contests.contestAction')}</Button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <h2 className="mb-2 text-xl font-semibold">{t('contests.mineTitle')}</h2>
      <QueryState q={mine} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('contests.mineEmpty')} />}>
        {(d) => <ul className="flex flex-col gap-2">{d.map((c) => <ContestCard key={c.id} c={c} />)}</ul>}
      </QueryState>
      {target && <ContestDialog run={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); setMsg(t('contests.sent')); }} />}
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
    <Dialog open onClose={onClose} title={t('contests.decideTitle', { farm: c.farm_id })}>
      <p className="mb-3 break-words text-muted">{c.reason}</p>
      <form noValidate className="flex flex-col gap-3" onSubmit={(e) => {
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
          {(p) => <textarea {...p} className={`${inputCls} py-2`} rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setErrs((x) => ({ ...x, reason: undefined })); }} />}
        </Field>
        <ErrorLine error={m.error} />
        <Button type="submit" busy={m.isPending}>{t('contests.decideSubmit')}</Button>
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
  return (
    <>
      <div aria-live="polite" className="my-4">{msg && <Notice tone="success">{msg}</Notice>}</div>
      <QueryState q={runs} empty={(d) => d.every((r) => r.status !== 'validee')} emptyText={<EmptyState title={t('contests.noValidatedRun')} />}>
        {() => (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="w-full max-w-md">
                <Field label={t('contests.selectRun')}>
                  {(p) => (
                    <Select {...p} value={runId} onChange={(e) => setSel(e.target.value)}
                      options={validated.map((r) => ({ value: r.id, label: t('contests.runOption', { date: fmtDate(r.created_at), name: r.department ? place(r.department) : t('contests.allCountry'), selected: r.selected_count }) }))} />
                  )}
                </Field>
              </div>
              <div className="w-full max-w-xs">
                <Field label={t('common.show')}>
                  {(p) => (
                    <Select {...p} value={filter} onChange={(e) => setFilter(e.target.value as 'deposee' | 'all')}
                      options={[{ value: 'deposee', label: t('contests.filterOpen') }, { value: 'all', label: t('contests.filterAll') }]} />
                  )}
                </Field>
              </div>
            </div>
            <QueryState q={contests} empty={(d) => (filter === 'deposee' ? d.filter((c) => c.status === 'deposee') : d).length === 0}
              emptyText={<EmptyState title={filter === 'deposee' ? t('contests.listEmptyOpen') : t('contests.listEmptyAll')} />}>
              {(d) => (
                <ul className="flex flex-col gap-2">
                  {(filter === 'deposee' ? d.filter((c) => c.status === 'deposee') : d).map((c) => (
                    <ContestCard key={c.id} c={c} onDecide={() => { setMsg(''); setTarget(c); }} />
                  ))}
                </ul>
              )}
            </QueryState>
          </>
        )}
      </QueryState>
      {target && <DecideDialog c={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); setMsg(t('contests.decided')); }} />}
    </>
  );
}

export function ContestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isProducer = user?.role === 'producteur';
  return (
    <>
      <PageHeader title={isProducer ? t('contests.titleMine') : t('contests.titleReview')} />
      <Notice tone="warn">{isProducer ? t('contests.introProducer') : t('contests.introAgent')}</Notice>
      {isProducer ? <ProducerContests /> : <AgentContests />}
    </>
  );
}
