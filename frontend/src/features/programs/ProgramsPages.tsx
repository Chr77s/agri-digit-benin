import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, rows } from '../../shared/api/client';
import type { Application, ApplicationStatus, Paginated, Program } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Checkbox, Chips, Dialog, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Sheet, Table, Textarea, Timeline, buttonCls, fmtDate, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useValueChains, useVcName } from '../../shared/api/ref';
import '../producers/agent.css';

const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: async () => rows(await api<Paginated<Program> | Program[]>('/programs')) });
const useApplications = () => useQuery({ queryKey: ['applications'], queryFn: async () => rows(await api<Paginated<Application> | Application[]>('/applications?page_size=100')) });

const APP_TONE = { deposee: 'wait', en_instruction: 'draft', acceptee: 'ok', refusee: 'bad' } as const;
const APP_ICON = { deposee: 'clock', en_instruction: 'edit', acceptee: 'check', refusee: 'x-circle' } as const;
export const isOpen = (p: Program) => (p.is_closed !== undefined ? !p.is_closed : p.is_open ?? new Date(p.closes_at) > new Date());
/** Conditions saisies en texte libre : une ligne ou une phrase par condition. */
const condList = (s: string) => s.split(/\n|(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean);

function AppBadge({ s }: { s: ApplicationStatus }) {
  const { t } = useTranslation();
  return <Badge tone={APP_TONE[s]} icon={APP_ICON[s]}>{t(`programs.appStatus.${s}`)}</Badge>;
}

export function ProgramsPage() {
  const { user } = useAuth();
  return user?.role === 'producteur' ? <ProducerPrograms /> : <ManagePrograms canCreate={user?.role === 'responsable_programme'} />;
}

/* ---------- Producteur : programmes ouverts, mes candidatures, programmes clos ---------- */
function ProducerPrograms() {
  const { t } = useTranslation();
  const q = usePrograms();
  const apps = useApplications();
  const vcName = useVcName();
  const qc = useQueryClient();
  const [view, setView] = useState('open');
  const [applying, setApplying] = useState<Program | null>(null);
  const [sure, setSure] = useState(false);
  const apply = useMutation({
    mutationFn: (id: string) => api<Application>(`/programs/${id}/apply`, { method: 'POST', body: {} }),
    onSuccess: () => { setApplying(null); toast(t('programs.applied')); void qc.invalidateQueries({ queryKey: ['applications'] }); },
  });
  const myApp = (pid: string) => apps.data?.find((a) => a.program === pid);

  return (
    <>
      <PageHeader title={t('programs.title')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.programs') }]} desc={t('ag.prog.producerDesc')} listen={t('programs.listen')} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('programs.empty')}>{t('programs.emptyHelp')}</EmptyState></div>}>
        {(d) => {
          const groups = { open: d.filter(isOpen), mine: d.filter((p) => myApp(p.id)), closed: d.filter((p) => !isOpen(p)) };
          const shown = groups[view as keyof typeof groups];
          return (
            <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
              <Chips single label={t('ag.prog.filter')} value={[view]} onChange={(v) => setView(v[0])}
                options={(['open', 'mine', 'closed'] as const).map((k) => ({ value: k, label: t(`ag.prog.view.${k}`), count: groups[k].length }))} />
              {shown.length === 0 ? <div className="card"><EmptyState title={t(`ag.prog.empty.${view}`)} /></div> : (
                <div className="grid-fit" style={{ '--min': '320px' } as React.CSSProperties}>
                  {shown.map((p) => {
                    const open = isOpen(p);
                    const mine = myApp(p.id);
                    return (
                      <article key={p.id} className="card prog" aria-labelledby={`p-${p.id}`}>
                        <div className="between"><h2 className="card-title" id={`p-${p.id}`}>{p.name}</h2>{open ? <Badge tone="ok">{t('ag.prog.open')}</Badge> : <Badge tone="neutral">{t('ag.prog.closed')}</Badge>}</div>
                        <p className="small muted">{open ? t('programs.openUntil', { date: fmtDate(p.closes_at) }) : t('programs.closedSince', { date: fmtDate(p.closes_at) })}</p>
                        {p.description && <p>{p.description}</p>}
                        {!mine && p.conditions && (<>
                          <p className="label">{t('programs.conditions')}</p>
                          <ul className="crit-list">{condList(p.conditions).map((c) => <li key={c}><Icon name="list-check" className="ok" /><span>{c}</span></li>)}</ul>
                        </>)}
                        {p.value_chains?.length > 0 && <p className="small">{t('programs.valueChainsLine', { list: p.value_chains.map(vcName).join(', ') })}</p>}
                        {mine && (<>
                          <p className="label">{t('ag.prog.yourApp')}</p>
                          {mine.status === 'refusee'
                            ? <Alert tone="danger" title={t('ag.prog.refused')}>{mine.reason && t('programs.reasonLine', { reason: mine.reason })}</Alert>
                            : mine.status === 'acceptee'
                              ? <Alert tone="ok" title={t('ag.prog.accepted')}>{mine.reason && t('programs.reasonLine', { reason: mine.reason })}</Alert>
                              : <Timeline items={[
                                { time: fmtDate(mine.created_at), title: t('programs.appStatus.deposee'), state: mine.status === 'deposee' ? 'now' : 'done' },
                                ...(mine.status === 'en_instruction' ? [{ title: t('programs.appStatus.en_instruction'), text: mine.reason ?? undefined, state: 'now' as const }] : []),
                                { title: t('ag.prog.decisionStep') },
                              ]} />}
                        </>)}
                        <div className="card-foot">
                          {mine ? <AppBadge s={mine.status} /> : open
                            ? <><span className="small muted">{t('ag.prog.humanDecision')}</span><Button onClick={() => { setSure(false); apply.reset(); setApplying(p); }}>{t('programs.apply')}</Button></>
                            : <span className="small muted">{t('ag.prog.noMore')}</span>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }}
      </QueryState>
      <Dialog open={!!applying} onClose={() => setApplying(null)} title={t('ag.prog.applyTitle', { name: applying?.name ?? '' })}
        footer={<><Button variant="ghost" onClick={() => setApplying(null)}>{t('common.cancel')}</Button><Button disabled={!sure} busy={apply.isPending} onClick={() => applying && apply.mutate(applying.id)}>{t('ag.prog.applySubmit')}</Button></>}>
        <div className="stack">
          <p className="muted">{t('ag.prog.applyIntro')}</p>
          <Checkbox label={t('ag.prog.applySure')} checked={sure} onChange={(e) => setSure(e.target.checked)} />
          {apply.error && <Alert tone="danger" live>{apply.error instanceof ApiError ? apply.error.message : t('programs.applyFail')}</Alert>}
        </div>
      </Dialog>
    </>
  );
}

/* ---------- Agent, responsable de programme : liste et création ---------- */
function ManagePrograms({ canCreate }: { canCreate: boolean }) {
  const { t } = useTranslation();
  const q = usePrograms();
  const apps = useApplications();
  const vcName = useVcName();
  const [view, setView] = useState<string[]>([]);
  const count = (pid: string) => (apps.data ? apps.data.filter((a) => a.program === pid).length : undefined);
  return (
    <>
      <PageHeader title={t('programs.title')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.programs') }]} desc={t('ag.prog.manageDesc')}
        actions={<>
          <Link className={buttonCls({ variant: 'secondary' })} to="/candidatures"><Icon name="file-text" />{t('nav.applications')}</Link>
          {canCreate && <a className={buttonCls()} href="#f-prog"><Icon name="plus" />{t('programs.create')}</a>}
        </>} />
      <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('programs.empty')}>{canCreate ? t('ag.prog.emptyCreate') : t('programs.emptyHelp')}</EmptyState></div>}>
          {(d) => (
            <Table<Program> title={t('ag.prog.listTitle')} caption={t('ag.prog.listTitle')} rowKey={(r) => r.id} exportName="programmes"
              data={d.filter((p) => !view.length || view.includes(isOpen(p) ? 'open' : 'closed'))}
              toolbar={<Chips label={t('ag.prog.filter')} value={view} onChange={setView} options={(['open', 'closed'] as const).map((k) => ({ value: k, label: t(`ag.prog.view.${k}`), count: d.filter((p) => isOpen(p) === (k === 'open')).length }))} />}
              columns={[
                { key: 'name', label: t('programs.programCol'), render: (r) => <><span className="cell-main">{r.name}</span>{r.description && <span className="cell-sub">{r.description}</span>}</> },
                { key: 'is_closed', label: t('ag.prog.state'), render: (r) => (isOpen(r) ? <Badge tone="ok">{t('ag.prog.open')}</Badge> : <Badge tone="bad">{t('ag.prog.closed')}</Badge>), csv: (r) => (isOpen(r) ? t('ag.prog.open') : t('ag.prog.closed')) },
                { key: 'value_chains', label: t('common.valueChains'), render: (r) => r.value_chains.map(vcName).join(', '), csv: (r) => r.value_chains.join(' ') },
                { key: 'apps', label: t('nav.applications'), num: true, sortable: false, render: (r) => count(r.id) ?? '…', csv: (r) => count(r.id) },
                { key: 'closes_at', label: t('ag.prog.closing'), num: true, render: (r) => fmtDate(r.closes_at) },
                { key: 'act', label: t('common.action'), actions: true, render: () => <Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to="/selection">{t('nav.selection')}</Link> },
              ]} />
          )}
        </QueryState>
        {canCreate && <CreateProgramForm />}
      </div>
    </>
  );
}

function CreateProgramForm() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vcs = useValueChains();
  const empty = { name: '', description: '', conditions: '', value_chains: [] as string[], closes_at: '' };
  const [v, setV] = useState(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  // closes_at reste une date seule (AAAA-MM-JJ) : le serveur refuse un horodatage ISO complet.
  const m = useMutation({ mutationFn: () => api<Program>('/programs', { method: 'POST', body: v }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['programs'] }); setV(empty); toast(t('ag.prog.published')); } });
  const today = new Date().toISOString().slice(0, 10);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (v.name.trim().length < 3) er.name = t('ag.prog.errName');
    if (!v.value_chains.length) er.value_chains = t('coop.errVc');
    if (!v.closes_at) er.closes_at = t('ag.prog.errClose');
    else if (v.closes_at <= today) er.closes_at = t('ag.prog.errCloseFuture');
    setErrs(er);
    if (!Object.keys(er).length) m.mutate();
  };
  const toggle = (c: string) => setV({ ...v, value_chains: v.value_chains.includes(c) ? v.value_chains.filter((x) => x !== c) : [...v.value_chains, c] });
  const errCount = Object.keys(errs).length;
  return (
    <div className="split">
      <form id="f-prog" noValidate onSubmit={submit} className="card stack" style={{ '--gap': '22px' } as React.CSSProperties} aria-labelledby="h-new">
        <div className="card-head m-0"><div><h2 className="section-title" id="h-new">{t('ag.prog.newTitle')}</h2><p className="card-sub">{t('ag.prog.newSub')}</p></div></div>
        {errCount > 0 && <Alert tone="danger" title={t('ag.alerts.errCount', { count: errCount })} />}
        <fieldset className="fieldset stack" style={{ '--gap': '14px' } as React.CSSProperties}><legend className="card-title">{t('ag.prog.step1')}</legend>
          <Field label={t('common.name')} required error={errs.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
          <Field label={t('programs.description')} hint={t('ag.prog.descHint')}>{(p) => <Textarea {...p} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
          <fieldset className="fieldset"><legend className="label">{t('common.valueChains')} <span className="req" aria-hidden>*</span></legend>
            <div className="vc-checks">{(vcs.data ?? []).filter((c) => !c.reserve).map((c) => <Checkbox key={c.code} label={c.name} checked={v.value_chains.includes(c.code)} onChange={() => toggle(c.code)} aria-invalid={errs.value_chains ? true : undefined} />)}</div>
            {errs.value_chains && <p className="error-msg" role="alert"><Icon name="alert" />{errs.value_chains}</p>}
          </fieldset>
        </fieldset>
        <fieldset className="fieldset stack" style={{ '--gap': '14px' } as React.CSSProperties}><legend className="card-title">{t('ag.prog.step2')}</legend>
          <Checkbox label={t('ag.prog.validRequired')} checked disabled readOnly />
          <Field label={t('ag.prog.condLabel')} hint={t('ag.prog.condHint')}>{(p) => <Textarea {...p} value={v.conditions} onChange={(e) => setV({ ...v, conditions: e.target.value })} />}</Field>
        </fieldset>
        <fieldset className="fieldset stack" style={{ '--gap': '14px' } as React.CSSProperties}><legend className="card-title">{t('ag.prog.step3')}</legend>
          <div className="form-grid">
            <Field label={t('ag.prog.closing')} required error={errs.closes_at}>{(p) => <Input {...p} type="date" min={today} value={v.closes_at} onChange={(e) => setV({ ...v, closes_at: e.target.value })} />}</Field>
          </div>
          <p className="hint">{t('ag.prog.contestHint')}</p>
        </fieldset>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
        <div className="cluster justify-end"><Button type="submit" busy={m.isPending}>{t('ag.prog.publish')}</Button></div>
      </form>
      <aside className="stack sticky-side" aria-label={t('ag.prog.calendar')}>
        <Card title={t('ag.prog.calendar')}>
          <Timeline items={[
            { time: fmtDate(today), title: t('ag.prog.calPublish'), text: t('ag.prog.calPublishText'), state: 'done' },
            { time: v.closes_at ? fmtDate(v.closes_at) : t('ag.prog.toSet'), title: t('ag.prog.closing'), state: v.closes_at ? undefined : 'alert' },
            { title: t('ag.prog.calSelect'), text: t('ag.prog.calSelectText') },
            { title: t('ag.prog.calContest') },
            { title: t('ag.prog.calHand') },
          ]} />
        </Card>
      </aside>
    </div>
  );
}

/* ---------- Candidatures : instruction et décision motivée ---------- */
export function ApplicationsPage() {
  const { t } = useTranslation();
  const q = useApplications();
  const programs = usePrograms();
  const qc = useQueryClient();
  const [program, setProgram] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [sel, setSel] = useState<Application | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>('en_instruction');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const decide = useMutation({
    mutationFn: () => api(`/applications/${sel!.id}/decide`, { method: 'POST', body: { status, reason } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['applications'] }); setSel(null); toast(t('programs.decided')); },
  });
  const prog = programs.data?.find((p) => p.id === sel?.program);
  return (
    <>
      <PageHeader title={t('nav.applications')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.applications') }]} desc={t('ag.apps.desc')} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="info">{t('ag.apps.notice')}</Alert>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('programs.appsEmpty')} /></div>}>
          {(all) => {
            const inProg = all.filter((a) => !program || a.program === program);
            return (
              <Table<Application> caption={t('nav.applications')} rowKey={(r) => r.id} exportName="candidatures"
                data={inProg.filter((a) => !statuses.length || statuses.includes(a.status))}
                toolbar={<>
                  <div className="field min-w-[240px]"><label className="sr-only" htmlFor="c-prog">{t('programs.programCol')}</label>
                    <Select id="c-prog" value={program} onChange={(e) => setProgram(e.target.value)} placeholder={t('ag.apps.allPrograms')}
                      options={(programs.data ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${isOpen(p) ? t('programs.openUntil', { date: fmtDate(p.closes_at) }) : t('programs.closedSince', { date: fmtDate(p.closes_at) })}` }))} /></div>
                  <Chips label={t('producers.filterStatus')} value={statuses} onChange={setStatuses}
                    options={(['deposee', 'en_instruction', 'acceptee', 'refusee'] as const).map((s) => ({ value: s, label: t(`programs.appStatus.${s}`), count: inProg.filter((a) => a.status === s).length }))} />
                </>}
                columns={[
                  { key: 'producer_name', label: t('common.producer'), render: (r) => <><span className="cell-main">{r.producer_name ?? r.producer_code ?? r.producer}</span>{r.producer_code && r.producer_name && <span className="cell-sub num">{r.producer_code}</span>}</>, csv: (r) => r.producer_code ?? r.producer },
                  { key: 'program_name', label: t('programs.programCol'), render: (r) => r.program_name ?? r.program },
                  { key: 'status', label: t('common.status'), render: (r) => <AppBadge s={r.status} />, csv: (r) => t(`programs.appStatus.${r.status}`) },
                  { key: 'created_at', label: t('programs.depositedOn'), num: true, render: (r) => fmtDate(r.created_at) },
                  { key: 'actions', label: t('common.action'), actions: true, render: (r) => <Button variant="secondary" size="sm" onClick={() => { setSel(r); setStatus(r.status === 'deposee' ? 'en_instruction' : r.status); setReason(''); setErr(''); decide.reset(); }}>{t('ag.apps.instruct')}</Button> },
                ]} />
            );
          }}
        </QueryState>
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={t('ag.apps.dossier', { name: sel?.producer_name ?? sel?.producer_code ?? '' })}
        footer={<><Button variant="ghost" onClick={() => setSel(null)}>{t('common.cancel')}</Button><Button type="submit" form="f-dec" busy={decide.isPending}>{t('programs.saveDecision')}</Button></>}>
        {sel && (
          <form id="f-dec" noValidate className="stack" onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length < 5) { setErr(t('programs.errDecision')); return; }
            decide.mutate();
          }}>
            <dl className="dl">
              <dt>{t('programs.programCol')}</dt><dd>{sel.program_name ?? prog?.name ?? sel.program}</dd>
              <dt>{t('common.producer')}</dt><dd className="num">{[sel.producer_code, sel.producer_name].filter(Boolean).join(' · ') || sel.producer}</dd>
              <dt>{t('programs.depositedOn')}</dt><dd className="num">{fmtDate(sel.created_at)}</dd>
              <dt>{t('common.status')}</dt><dd><AppBadge s={sel.status} /></dd>
            </dl>
            {prog?.conditions && (
              <div><span className="label">{t('ag.apps.conditions')}</span>
                <ul className="crit-list mt-2">{condList(prog.conditions).map((c) => <li key={c}><Icon name="list-check" className="ok" /><span>{c}</span></li>)}</ul>
                <p className="hint mt-2">{t('ag.apps.checkByHand')}</p></div>
            )}
            <Field label={t('programs.decision')}>{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)} options={(['en_instruction', 'acceptee', 'refusee'] as const).map((s) => ({ value: s, label: t(`programs.appStatus.${s}`) }))} />}</Field>
            <Field label={t('ag.apps.reasonLabel')} error={err}>{(p) => <Textarea {...p} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} />}</Field>
            <p className="hint">{t('ag.apps.notified')}</p>
            {decide.error && <Alert tone="danger" live>{decide.error.message}</Alert>}
          </form>
        )}
      </Sheet>
    </>
  );
}
