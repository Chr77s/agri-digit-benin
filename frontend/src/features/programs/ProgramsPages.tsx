import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, rows } from '../../shared/api/client';
import type { Application, ApplicationStatus, Paginated, Program } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Checkbox, Chips, Dialog, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Sheet, Table, Textarea, Timeline, buttonCls, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useDepartments, useValueChains, useVcName } from '../../shared/api/ref';
import '../producers/agent.css';

const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: async () => rows(await api<Paginated<Program> | Program[]>('/programs')) });
const useApplications = () => useQuery({ queryKey: ['applications'], queryFn: async () => rows(await api<Paginated<Application> | Application[]>('/applications?page_size=100')) });

const APP_TONE = { deposee: 'wait', en_instruction: 'draft', acceptee: 'ok', refusee: 'bad' } as const;
const APP_ICON = { deposee: 'clock', en_instruction: 'edit', acceptee: 'check', refusee: 'x-circle' } as const;
export const isOpen = (p: Program) => (p.state ? p.state === 'ouvert' : p.is_closed !== undefined ? !p.is_closed : p.is_open ?? new Date(p.closes_at) > new Date());
const isClosed = (p: Program) => (p.state ? p.state === 'clos' : !isOpen(p));
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
          const groups = { open: d.filter((p) => !isClosed(p)), mine: d.filter((p) => myApp(p.id)), closed: d.filter(isClosed) };
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
                        <div className="between"><h2 className="card-title" id={`p-${p.id}`}>{p.name}</h2>{open ? <Badge tone="ok">{t('ag.prog.open')}</Badge> : p.state === 'a_venir' ? <Badge tone="wait">{t('ag.prog.state1.a_venir')}</Badge> : <Badge tone="neutral">{t('ag.prog.closed')}</Badge>}</div>
                        <p className="small muted">{p.state === 'a_venir' && p.opens_at ? t('ag.prog.opensOn', { date: fmtDate(p.opens_at) }) : open ? t('programs.openUntil', { date: fmtDate(p.closes_at) }) : t('programs.closedSince', { date: fmtDate(p.closes_at) })}</p>
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
                            : <span className="small muted">{p.state === 'a_venir' ? t('ag.prog.state1.a_venir') : t('ag.prog.noMore')}</span>}
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

/* ---------- Agent, responsable de programme : liste, brouillons et création ---------- */
const STATE_TONE = { brouillon: 'draft', a_venir: 'wait', ouvert: 'ok', clos: 'bad' } as const;
const stateOf = (p: Program) => p.state ?? (isOpen(p) ? 'ouvert' : 'clos');

function ManagePrograms({ canCreate }: { canCreate: boolean }) {
  const { t } = useTranslation();
  const q = usePrograms();
  const apps = useApplications();
  const vcName = useVcName();
  const [view, setView] = useState<string[]>([]);
  const [draft, setDraft] = useState<Program | null>(null);
  const count = (pid: string) => (apps.data ? apps.data.filter((a) => a.program === pid).length : undefined);
  const STATES = ['ouvert', 'a_venir', 'clos', 'brouillon'] as const;
  return (
    <>
      <PageHeader title={t('programs.title')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.programs') }]} desc={t('ag.prog.manageDesc')}
        actions={<>
          <Link className={buttonCls({ variant: 'secondary' })} to="/candidatures"><Icon name="file-text" />{t('nav.applications')}</Link>
          {canCreate && <a className={buttonCls()} href="#f-prog" onClick={() => setDraft(null)}><Icon name="plus" />{t('programs.create')}</a>}
        </>} />
      <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('programs.empty')}>{canCreate ? t('ag.prog.emptyCreate') : t('programs.emptyHelp')}</EmptyState></div>}>
          {(d) => (
            <Table<Program> title={t('ag.prog.listTitle')} caption={t('ag.prog.listTitle')} rowKey={(r) => r.id} exportName="programmes"
              data={d.filter((p) => !view.length || view.includes(stateOf(p)))}
              toolbar={<Chips label={t('ag.prog.filter')} value={view} onChange={setView} options={STATES.filter((k) => d.some((p) => stateOf(p) === k)).map((k) => ({ value: k, label: t(`ag.prog.states.${k}`), count: d.filter((p) => stateOf(p) === k).length }))} />}
              columns={[
                { key: 'name', label: t('programs.programCol'), render: (r) => <><span className="cell-main">{r.name}</span>{r.description && <span className="cell-sub">{r.description}</span>}</> },
                { key: 'state', label: t('ag.prog.state'), render: (r) => <Badge tone={STATE_TONE[stateOf(r)]}>{t(`ag.prog.state1.${stateOf(r)}`)}</Badge>, csv: (r) => t(`ag.prog.state1.${stateOf(r)}`) },
                { key: 'value_chains', label: t('common.valueChains'), render: (r) => r.value_chains.map(vcName).join(', ') || '—', csv: (r) => r.value_chains.join(' ') },
                { key: 'apps', label: t('nav.applications'), num: true, sortable: false, render: (r) => (stateOf(r) === 'brouillon' ? '—' : count(r.id) ?? '…'), csv: (r) => count(r.id) },
                { key: 'closes_at', label: t('ag.prog.closing'), num: true, render: (r) => (r.closes_at ? fmtDate(r.closes_at) : t('ag.prog.notSet')) },
                { key: 'act', label: t('common.action'), actions: true, render: (r) => (stateOf(r) === 'brouillon'
                  ? (canCreate ? <a className={buttonCls({ variant: 'secondary', size: 'sm' })} href="#f-prog" onClick={() => setDraft(r)}>{t('ag.prog.resume')}</a> : <span className="small muted">{t('ag.prog.state1.brouillon')}</span>)
                  : <Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to="/selection">{stateOf(r) === 'clos' ? t('ag.prog.results') : t('nav.selection')}</Link>) },
              ]} />
          )}
        </QueryState>
        {canCreate && <ProgramForm key={draft?.id ?? 'new'} draft={draft} onDone={() => setDraft(null)} />}
      </div>
    </>
  );
}

type ProgramDraft = { name: string; description: string; conditions: string; value_chains: string[]; opens_at: string; closes_at: string; committee_at: string; departments: string[]; max_area_ha: string; planned_beneficiaries: string; require_campaign: boolean };
const toForm = (p: Program | null): ProgramDraft => ({
  name: p?.name ?? '', description: p?.description ?? '', conditions: p?.conditions ?? '', value_chains: p?.value_chains ?? [],
  opens_at: p?.opens_at ?? '', closes_at: p?.closes_at ?? '', committee_at: p?.committee_at ?? '', departments: p?.departments ?? [],
  max_area_ha: p?.max_area_ha?.toString() ?? '', planned_beneficiaries: p?.planned_beneficiaries?.toString() ?? '', require_campaign: p?.require_campaign ?? false,
});
const DAY = 86_400_000;
const plusDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10);

function ProgramForm({ draft, onDone }: { draft: Program | null; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vcs = useValueChains();
  const deps = useDepartments();
  const vcName = useVcName();
  const [v, setV] = useState(() => toForm(draft));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const today = new Date().toISOString().slice(0, 10);
  // dates seules (AAAA-MM-JJ) ; champs vides envoyés à null pour qu'un brouillon reste incomplet
  const body = (status: 'brouillon' | 'publie') => ({
    ...v, status, opens_at: v.opens_at || null, closes_at: v.closes_at || null, committee_at: v.committee_at || null,
    max_area_ha: v.max_area_ha === '' ? null : Number(v.max_area_ha), planned_beneficiaries: v.planned_beneficiaries === '' ? null : Number(v.planned_beneficiaries),
  });
  const m = useMutation({
    mutationFn: (status: 'brouillon' | 'publie') => (draft
      ? api<Program>(`/programs/${draft.id}`, { method: 'PATCH', body: body(status) })
      : api<Program>('/programs', { method: 'POST', body: body(status) })),
    onSuccess: (_, status) => { void qc.invalidateQueries({ queryKey: ['programs'] }); setV(toForm(null)); onDone(); toast(t(status === 'publie' ? 'ag.prog.published' : 'ag.prog.saved')); },
    onError: (e) => { if (e instanceof ApiError && e.body.fields) setErrs(Object.fromEntries(Object.entries(e.body.fields).map(([k, msgs]) => [k, msgs[0]]))); },
  });
  const criteria = { value_chains: v.value_chains, departments: v.departments, require_campaign: v.require_campaign, max_area_ha: v.max_area_ha === '' ? null : Number(v.max_area_ha) };
  const est = useQuery({ queryKey: ['programs', 'estimate', criteria], queryFn: () => api<{ count: number }>('/programs/estimate', { method: 'POST', body: criteria }) });
  const submit = (status: 'brouillon' | 'publie') => {
    const er: Record<string, string> = {};
    if (v.name.trim().length < 3) er.name = t('ag.prog.errName');
    if (status === 'publie') {
      if (!v.value_chains.length) er.value_chains = t('coop.errVc');
      if (!v.closes_at) er.closes_at = t('ag.prog.errClose');
      else if (v.closes_at < plusDays(v.opens_at || today, 14)) er.closes_at = t('ag.prog.errClose14');
    }
    setErrs(er);
    if (!Object.keys(er).length) m.mutate(status);
  };
  const toggle = (c: string) => setV({ ...v, value_chains: v.value_chains.includes(c) ? v.value_chains.filter((x) => x !== c) : [...v.value_chains, c] });
  const errCount = Object.keys(errs).length;
  const contestFrom = v.committee_at ? plusDays(v.committee_at, 1) : '';
  return (
    <div className="split">
      <form id="f-prog" noValidate onSubmit={(e) => { e.preventDefault(); submit('publie'); }} className="card stack" style={{ '--gap': '22px' } as React.CSSProperties} aria-labelledby="h-new">
        <div className="card-head m-0">
          <div><h2 className="section-title" id="h-new">{draft ? t('ag.prog.editTitle', { name: draft.name }) : t('ag.prog.newTitle')}</h2><p className="card-sub">{t('ag.prog.newSub')}</p></div>
          {draft && <Badge tone="draft">{t('ag.prog.state1.brouillon')}</Badge>}
        </div>
        {errCount > 0 && <Alert tone="danger" title={t('ag.alerts.errCount', { count: errCount })}>{Object.values(errs).join(' · ')}</Alert>}
        <fieldset className="fieldset stack" style={{ '--gap': '14px' } as React.CSSProperties}><legend className="card-title">{t('ag.prog.step1')}</legend>
          <Field label={t('common.name')} required error={errs.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
          <Field label={t('programs.description')} hint={t('ag.prog.descHint')}>{(p) => <Textarea {...p} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
          <fieldset className="fieldset"><legend className="label">{t('common.valueChains')} <span className="req" aria-hidden>*</span></legend>
            <div className="vc-checks">{(vcs.data ?? []).filter((c) => !c.reserve).map((c) => <Checkbox key={c.code} label={c.name} checked={v.value_chains.includes(c.code)} onChange={() => toggle(c.code)} aria-invalid={errs.value_chains ? true : undefined} />)}</div>
            {errs.value_chains && <p className="error-msg" role="alert"><Icon name="alert" />{errs.value_chains}</p>}
          </fieldset>
        </fieldset>
        <fieldset className="fieldset stack" style={{ '--gap': '14px' } as React.CSSProperties}><legend className="card-title">{t('ag.prog.step2')}</legend>
          <div>
            <Chips label={t('ag.prog.departments')} value={v.departments} onChange={(d) => setV({ ...v, departments: d })} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />
            <p className="hint mt-1">{v.departments.length ? t('ag.prog.depsSome', { count: v.departments.length }) : t('ag.prog.depsAll')}</p>
          </div>
          <div className="form-grid">
            <Field label={t('ag.prog.maxArea')} hint={t('ag.prog.maxAreaHint')} optional error={errs.max_area_ha}>{(p) => <Input {...p} type="number" min={0} step="0.1" inputMode="decimal" value={v.max_area_ha} onChange={(e) => setV({ ...v, max_area_ha: e.target.value })} />}</Field>
            <Field label={t('ag.prog.planned')} optional error={errs.planned_beneficiaries}>{(p) => <Input {...p} type="number" min={1} inputMode="numeric" value={v.planned_beneficiaries} onChange={(e) => setV({ ...v, planned_beneficiaries: e.target.value })} />}</Field>
          </div>
          <Checkbox label={t('ag.prog.validRequired')} checked disabled readOnly />
          <Checkbox label={v.value_chains.length ? t('ag.prog.requireCampaign', { list: v.value_chains.map(vcName).join(', ') }) : t('ag.prog.requireCampaignAny')} checked={v.require_campaign} onChange={(e) => setV({ ...v, require_campaign: e.target.checked })} />
          <Field label={t('ag.prog.condLabel')} hint={t('ag.prog.condHint')}>{(p) => <Textarea {...p} value={v.conditions} onChange={(e) => setV({ ...v, conditions: e.target.value })} />}</Field>
        </fieldset>
        <fieldset className="fieldset stack" style={{ '--gap': '14px' } as React.CSSProperties}><legend className="card-title">{t('ag.prog.step3')}</legend>
          <div className="form-grid">
            <Field label={t('ag.prog.opening')} optional hint={t('ag.prog.openingHint')}>{(p) => <Input {...p} type="date" min={today} value={v.opens_at} onChange={(e) => setV({ ...v, opens_at: e.target.value })} />}</Field>
            <Field label={t('ag.prog.closing')} required error={errs.closes_at}>{(p) => <Input {...p} type="date" min={plusDays(v.opens_at || today, 14)} value={v.closes_at} onChange={(e) => setV({ ...v, closes_at: e.target.value })} />}</Field>
            <Field label={t('ag.prog.committee')} optional>{(p) => <Input {...p} type="date" min={v.closes_at || today} value={v.committee_at} onChange={(e) => setV({ ...v, committee_at: e.target.value })} />}</Field>
          </div>
          <p className="hint">{t('ag.prog.contestHint')}</p>
        </fieldset>
        {m.error && !(m.error instanceof ApiError && m.error.body.fields) && <Alert tone="danger" live>{m.error.message}</Alert>}
        <div className="cluster justify-end">
          <Button type="button" variant="secondary" busy={m.isPending && m.variables === 'brouillon'} onClick={() => submit('brouillon')}>{t('ag.prog.saveDraft')}</Button>
          <Button type="submit" busy={m.isPending && m.variables === 'publie'}>{t('ag.prog.publish')}</Button>
        </div>
      </form>
      <aside className="stack sticky-side" aria-label={t('ag.prog.calendar')}>
        <Card title={t('ag.prog.calendar')}>
          <Timeline items={[
            { time: fmtDate(v.opens_at || today), title: t('ag.prog.calPublish'), text: t('ag.prog.calPublishText'), state: 'done' },
            { time: v.closes_at ? fmtDate(v.closes_at) : t('ag.prog.toSet'), title: t('ag.prog.closing'), state: v.closes_at ? undefined : 'alert' },
            { time: v.committee_at ? fmtDate(v.committee_at) : undefined, title: t('ag.prog.calSelect'), text: t('ag.prog.calSelectText') },
            { time: contestFrom ? `${fmtDate(contestFrom)} → ${fmtDate(plusDays(contestFrom, 14))}` : undefined, title: t('ag.prog.calContest') },
            { title: t('ag.prog.calHand') },
          ]} />
        </Card>
        <Card title={t('ag.prog.eligibleTitle')} sub={t('ag.prog.estimate')}>
          <p className="kpi-value num" aria-live="polite">{est.data ? fmtNum(est.data.count) : '…'}</p>
          <p className="small">{t('ag.prog.eligibleText')}{v.planned_beneficiaries && ` ${t('ag.prog.forPlaces', { n: fmtNum(Number(v.planned_beneficiaries)) })}`}</p>
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
