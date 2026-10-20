import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Checkbox, Chips, Dialog, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Table, Tabs, Textarea, buttonCls, fmtDate, toast } from '../../shared/ui';
import { useDepartments, usePlaceName, useValueChains, useVcName } from '../../shared/api/ref';
import type { Cooperative, MemberRole, Membership } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import { useProducers } from '../producers/api';
import { useCooperative, useCooperatives, useCreateCooperative, useDecideJoinRequest, useJoinCooperative, useJoinRequests, useMembers, useMembershipActions, useMyMemberships, useNearbyCooperatives, type JoinRequest, type NearbyCoop } from './api';
import '../producers/agent.css';

const MEMBER_ROLES: MemberRole[] = ['membre', 'president', 'tresorier', 'secretaire'];
/** Les membres du bureau gèrent leur coopérative (mêmes droits que le gestionnaire, vérifiés par le serveur). */
const BUREAU: MemberRole[] = ['president', 'tresorier', 'secretaire'];

function useRoleOptions() {
  const { t } = useTranslation();
  return MEMBER_ROLES.map((r) => ({ value: r, label: t(`coop.role.${r}`) }));
}

export function CooperativesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const place = usePlaceName();
  const vcName = useVcName();
  const isManager = user?.role === 'gestionnaire_cooperative';
  const [department, setDepartment] = useState(isManager ? '' : user?.department ?? '');
  const [vcs, setVcs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const q = useCooperatives({ department });
  const canCreate = user?.role === 'agent_atda' || user?.role === 'admin_maep';
  const title = isManager ? t('coop.myTitle') : t('coop.title');
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: t('nav.home'), to: '/' }, { label: title }]} desc={t('ag.coop.desc')}
        actions={canCreate && <Button icon="plus" onClick={() => setOpen(true)}>{t('coop.create')}</Button>} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('coop.empty')} action={department ? <Button variant="secondary" onClick={() => setDepartment('')}>{t('ag.prod.clear')}</Button> : undefined}>{canCreate ? t('coop.emptyCreate') : t('coop.emptyAsk')}</EmptyState></div>}>
        {(d) => {
          const chains = [...new Set(d.flatMap((c) => c.value_chains))];
          return (
            <Table<Cooperative> caption={t('coop.title')} rowKey={(r) => r.id} exportName="cooperatives"
              data={d.filter((c) => !vcs.length || c.value_chains.some((v) => vcs.includes(v)))}
              toolbar={<>
                {!isManager && (
                  <div className="field min-w-[200px]"><label className="sr-only" htmlFor="co-dep">{t('common.department')}</label>
                    <Select id="co-dep" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t('ag.coop.allDeps')} options={(deps.data ?? []).map((x) => ({ value: x.code, label: x.name }))} /></div>
                )}
                {chains.length > 1 && <Chips label={t('common.valueChain')} value={vcs} onChange={setVcs} options={chains.map((c) => ({ value: c, label: vcName(c) }))} />}
              </>}
              columns={[
                { key: 'name', label: t('coop.name'), render: (r) => <><Link className="cell-main" to={`/cooperatives/${r.id}`}>{r.name}</Link><span className="cell-sub num">{r.registration_number || t('ag.coop.noReg')}</span></> },
                { key: 'commune', label: t('coop.seat'), render: (r) => `${place(r.commune)} (${place(r.department)})`, csv: (r) => place(r.commune) },
                { key: 'value_chains', label: t('common.valueChains'), render: (r) => r.value_chains.map(vcName).join(', '), csv: (r) => r.value_chains.join(' ') },
                { key: 'members_count', label: t('coop.activeMembers'), num: true },
                { key: 'act', label: t('common.action'), actions: true, render: (r) => <Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to={`/cooperatives/${r.id}`}>{t('ag.home.open')}</Link> },
              ]} />
          );
        }}
      </QueryState>
      {open && <CreateDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const vcs = useValueChains();
  const m = useCreateCooperative();
  const [v, setV] = useState({ name: '', department: user?.department ?? '', commune: '', value_chains: [] as string[], registration_number: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  return (
    <Dialog open onClose={onClose} title={t('coop.create')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-coop" busy={m.isPending}>{t('coop.save')}</Button></>}>
      <form id="f-coop" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (v.name.trim().length < 3) er.name = t('coop.errName');
        if (!v.department || !v.commune) er.commune = t('coop.errPlace');
        if (!v.value_chains.length) er.value_chains = t('coop.errVc');
        setErrs(er);
        if (Object.keys(er).length) return;
        m.mutate({ ...v, registration_number: v.registration_number || undefined }, { onSuccess: () => { toast(t('ag.coop.created')); onClose(); } });
      }}>
        <Field label={t('coop.name')} error={errs.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <div className="form-grid">
          <Field label={t('common.department')}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <Field label={t('ag.coop.seatCommune')} error={errs.commune}>{(p) => <Select {...p} value={v.commune} disabled={!v.department} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        </div>
        <fieldset className="fieldset"><legend className="label">{t('ag.coop.vcLegend')}</legend>
          <Chips label={t('common.valueChains')} value={v.value_chains} onChange={(x) => setV({ ...v, value_chains: x })} options={(vcs.data ?? []).filter((c) => !c.reserve).map((c) => ({ value: c.code, label: c.name }))} />
          {errs.value_chains && <p className="error-msg" role="alert"><Icon name="alert" />{errs.value_chains}</p>}
        </fieldset>
        <Field label={t('coop.registration')}>{(p) => <Input {...p} placeholder={t('ag.coop.regPlaceholder')} value={v.registration_number} onChange={(e) => setV({ ...v, registration_number: e.target.value })} />}</Field>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

export function CooperativeDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { user } = useAuth();
  const q = useCooperative(id);
  const place = usePlaceName();
  const vcName = useVcName();
  const [addOpen, setAddOpen] = useState(false);
  const canEdit = ['agent_atda', 'admin_maep', 'gestionnaire_cooperative', 'producteur'].includes(user?.role ?? ''); // producteur : seul le bureau atteint cette page
  const pending = useJoinRequests({ cooperative: id, status: 'en_attente' });
  return (
    <QueryState q={q}>
      {(c) => (
        <>
          <PageHeader title={c.name} crumbs={[{ label: t('nav.home'), to: '/' }, user?.role === 'producteur' ? { label: t('nav.myCoops'), to: '/mes-cooperatives' } : { label: t('coop.title'), to: '/cooperatives' }, { label: c.name }]}
            desc={c.manager_phone ? t('ag.coop.manager', { phone: c.manager_phone }) : undefined}
            actions={canEdit && <Button icon="plus" onClick={() => setAddOpen(true)}>{t('coop.addMember')}</Button>} />
          <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
            <section className="card" aria-label={t('ag.coop.identity')}>
              <dl className="dl" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '14px 24px' }}>
                <div><dt>{t('coop.seat')}</dt><dd>{place(c.commune)}, {place(c.department)}</dd></div>
                <div><dt>{t('common.valueChains')}</dt><dd>{c.value_chains.map(vcName).join(', ')}</dd></div>
                <div><dt>{t('coop.activeMembers')}</dt><dd className="num">{c.members_count}</dd></div>
                <div><dt>{t('ag.coop.regNumber')}</dt><dd className="num">{c.registration_number || t('ag.coop.noReg')}</dd></div>
              </dl>
            </section>
            <section className="card" aria-label={t('coop.members')}>
              <Tabs label={t('coop.title')} tabs={[
                { id: 'active', label: t('coop.activeMembers'), count: c.members_count, content: <MembersTable coopId={id} active canEdit={canEdit} /> },
                { id: 'requests', label: t('ag.coop.requests'), count: pending.data?.length, content: <JoinRequests coopId={id} canEdit={canEdit} /> },
                { id: 'history', label: t('coop.history'), content: <MembersTable coopId={id} active={false} canEdit={false} /> },
              ]} />
            </section>
            <Card tone="tint" title={t('ag.coop.ruleTitle')}><p className="small muted">{t('ag.coop.ruleText')}</p></Card>
          </div>
          {addOpen && <AddMemberDialog coopId={id} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); toast(t('coop.added')); }} />}
        </>
      )}
    </QueryState>
  );
}

/** Demandes d'adhésion de la coopérative : le gestionnaire ou l'agent accepte (l'adhésion est créée) ou refuse avec un motif. */
function JoinRequests({ coopId, canEdit }: { coopId: string; canEdit: boolean }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const q = useJoinRequests({ cooperative: coopId });
  const decide = useDecideJoinRequest();
  const [refusing, setRefusing] = useState<JoinRequest | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const tone = { en_attente: 'wait', acceptee: 'ok', refusee: 'bad' } as const;
  return (
    <>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('ag.coop.noRequests')} icon="users">{t('ag.coop.noRequestsHelp')}</EmptyState>}>
        {(d) => (
          <Table<JoinRequest> caption={t('ag.coop.requests')} rowKey={(r) => r.id} data={d} columns={[
            { key: 'producer_name', label: t('ag.coop.member'), render: (r) => <><span className="cell-main">{r.producer_name}</span><span className="cell-sub num">{r.producer_code} · {place(r.producer_commune)}</span></> },
            { key: 'message', label: t('ag.coop.requestMessage'), render: (r) => r.message || '—' },
            { key: 'created_at', label: t('common.date'), num: true, render: (r) => fmtDate(r.created_at) },
            { key: 'status', label: t('common.status'), render: (r) => <><Badge tone={tone[r.status]}>{t(`ag.coop.reqStatus.${r.status}`)}</Badge>{r.decision_reason && <span className="cell-sub">{r.decision_reason}</span>}</> },
            ...(canEdit ? [{ key: 'act', label: t('common.action'), actions: true, render: (r: JoinRequest) => r.status === 'en_attente' ? (
              <span className="cluster">
                <Button size="sm" busy={decide.isPending && decide.variables?.id === r.id && decide.variables.status === 'acceptee'} onClick={() => decide.mutate({ id: r.id, status: 'acceptee' }, { onSuccess: () => toast(t('ag.coop.accepted')) })}>{t('ag.coop.accept')}</Button>
                <Button size="sm" variant="danger" onClick={() => { decide.reset(); setReason(''); setErr(''); setRefusing(r); }}>{t('ag.coop.refuse')}</Button>
              </span>
            ) : null }] : []),
          ]} />
        )}
      </QueryState>
      {decide.error && !refusing && <Alert tone="danger" live>{decide.error.message}</Alert>}
      <Dialog open={!!refusing} onClose={() => setRefusing(null)} title={t('ag.coop.refuseTitle', { name: refusing?.producer_name ?? '' })}
        footer={<><Button variant="ghost" onClick={() => setRefusing(null)}>{t('common.cancel')}</Button><Button type="submit" form="f-refuse" variant="dangerSolid" busy={decide.isPending}>{t('ag.coop.refuseConfirm')}</Button></>}>
        <form id="f-refuse" noValidate className="stack" onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim().length < 5) { setErr(t('common.errReason')); return; }
          if (refusing) decide.mutate({ id: refusing.id, status: 'refusee', reason: reason.trim() }, { onSuccess: () => { setRefusing(null); toast(t('ag.coop.refused')); } });
        }}>
          <Field label={t('ag.coop.refuseReason')} hint={t('ag.coop.refuseHint')} error={err}>{(p) => <Textarea {...p} rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} />}</Field>
          {decide.error && <Alert tone="danger" live>{decide.error.message}</Alert>}
        </form>
      </Dialog>
    </>
  );
}

/** Producteur : coopératives de son département où demander à adhérer ; la coopérative ne voit que nom, code et commune. */
function NearbyCooperatives() {
  const { t } = useTranslation();
  const q = useNearbyCooperatives();
  const place = usePlaceName();
  const vcName = useVcName();
  const join = useJoinCooperative();
  const [target, setTarget] = useState<NearbyCoop | null>(null);
  const [message, setMessage] = useState('');
  const [agree, setAgree] = useState(false);
  return (
    <Card title={t('ag.coop.nearbyTitle')} sub={t('ag.coop.nearbySub')}>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<p className="muted">{t('ag.coop.nearbyNone')}</p>}>
        {(d) => (
          <ul className="list">
            {d.map((c) => (
              <li key={c.id} className="list-item"><span className="li-icon"><Icon name="building" /></span>
                <span className="li-main"><span className="li-title">{c.name}</span>
                  <span className="li-meta">{[c.value_chains.map(vcName).join(', '), t('ag.coop.membersN', { count: c.members_count }), place(c.commune)].filter(Boolean).join(' · ')}</span>
                  {c.request_status === 'refusee' && <span className="li-meta">{t('ag.coop.refusedLine', { reason: c.request_reason })}</span>}</span>
                <span className="li-end">{c.request_status === 'en_attente'
                  ? <Badge tone="wait">{t('ag.coop.requestSent')}</Badge>
                  : <Button variant="secondary" size="sm" onClick={() => { join.reset(); setMessage(''); setAgree(false); setTarget(c); }}>{t('ag.coop.requestBtn')}</Button>}</span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <Dialog open={!!target} onClose={() => setTarget(null)} title={t('ag.coop.joinTitle', { name: target?.name ?? '' })}
        footer={<><Button variant="ghost" onClick={() => setTarget(null)}>{t('common.cancel')}</Button><Button type="submit" form="f-join" disabled={!agree} busy={join.isPending}>{t('ag.coop.joinSend')}</Button></>}>
        <form id="f-join" noValidate className="stack" onSubmit={(e) => {
          e.preventDefault();
          if (target) join.mutate({ id: target.id, message: message.trim() }, { onSuccess: () => { setTarget(null); toast(t('ag.coop.joinSent')); } });
        }}>
          <Field label={t('ag.coop.requestMessage')} optional>{(p) => <Textarea {...p} rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />}</Field>
          <Checkbox label={t('ag.coop.joinConsent')} checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <Alert tone="info" icon="info">{t('ag.coop.joinInfo')}</Alert>
          {join.error && <Alert tone="danger" live>{join.error.message}</Alert>}
        </form>
      </Dialog>
    </Card>
  );
}

function MembersTable({ coopId, active, canEdit }: { coopId: string; active: boolean; canEdit: boolean }) {
  const { t } = useTranslation();
  const members = useMembers(coopId, active);
  const a = useMembershipActions(coopId);
  const roles = useRoleOptions();
  const [ending, setEnding] = useState<Membership | null>(null);
  const roleLabel = (r: string) => roles.find((x) => x.value === r)?.label ?? r;
  return (
    <>
      <QueryState q={members} empty={(d) => d.length === 0} emptyText={<EmptyState title={active ? t('coop.noActive') : t('coop.noHistory')}>{active && canEdit ? t('coop.noActiveHelp') : undefined}</EmptyState>}>
        {(d) => (
          <Table<Membership> caption={t('coop.members')} rowKey={(r) => r.id} data={d} exportName={active ? 'membres' : 'adhesions-terminees'} columns={[
            { key: 'producer_name', label: t('ag.coop.member'), render: (r) => <><span className="cell-main">{r.producer_name}</span><span className="cell-sub num">{r.producer_code}</span></>, csv: (r) => `${r.producer_name} (${r.producer_code})` },
            { key: 'role', label: t('coop.role.label'), render: (r) => roleLabel(r.role) },
            { key: 'joined_at', label: t('coop.joined'), num: true, render: (r) => fmtDate(r.joined_at) },
            { key: 'left_at', label: t('coop.left'), render: (r) => (r.left_at ? <span>{fmtDate(r.left_at)}{r.end_reason && <span className="cell-sub">{t('programs.reasonLine', { reason: r.end_reason })}</span>}</span> : <Badge tone="ok">{t('coop.activeBadge')}</Badge>) },
            ...(canEdit && active ? [{ key: 'act', label: t('common.action'), actions: true, render: (r: Membership) => <Button variant="danger" size="sm" onClick={() => { a.end.reset(); setEnding(r); }}>{t('coop.end')}</Button> }] : []),
          ]} />
        )}
      </QueryState>
      <Dialog open={!!ending} onClose={() => setEnding(null)} title={t('coop.endTitle', { name: ending?.producer_name ?? '' })}
        footer={<><Button variant="ghost" onClick={() => setEnding(null)}>{t('common.cancel')}</Button><Button type="submit" form="f-end" variant="dangerSolid" busy={a.end.isPending}>{t('coop.endConfirm')}</Button></>}>
        <EndForm error={a.end.error} onSubmit={(reason) => a.end.mutate({ id: ending!.id, reason }, { onSuccess: () => { setEnding(null); toast(t('coop.ended')); } })} />
      </Dialog>
    </>
  );
}

function EndForm({ onSubmit, error }: { onSubmit: (r: string) => void; error: Error | null }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  return (
    <form id="f-end" noValidate className="stack" onSubmit={(e) => { e.preventDefault(); if (reason.trim().length < 5) { setErr(t('common.errReason')); return; } onSubmit(reason.trim()); }}>
      <Field label={t('coop.endReason')} hint={t('ag.coop.endHint')} error={err}>{(p) => <Textarea {...p} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} />}</Field>
      {error && <Alert tone="danger" live>{error.message}</Alert>}
    </form>
  );
}

function AddMemberDialog({ coopId, onClose, onDone }: { coopId: string; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const a = useMembershipActions(coopId);
  const roles = useRoleOptions();
  const { user } = useAuth();
  // Le gestionnaire n'a pas accès au registre (/producers répond 403) : pas d'appel pour lui, saisie de l'identifiant ou du code à la place.
  const producers = useProducers({ status: 'valide' }, user?.role !== 'gestionnaire_cooperative');
  const [producer, setProducer] = useState('');
  const [role, setRole] = useState<MemberRole>('membre');
  const [err, setErr] = useState('');
  const canList = producers.isSuccess && producers.data.length > 0;
  return (
    <Dialog open onClose={onClose} title={t('coop.addMember')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-add" busy={a.add.isPending}>{t('coop.addConfirm')}</Button></>}>
      <form id="f-add" noValidate className="stack" onSubmit={(e) => { e.preventDefault(); if (!producer) { setErr(t('coop.errProducer')); return; } a.add.mutate({ producer, role }, { onSuccess: onDone }); }}>
        <Field label={t('common.producer')} error={err} hint={canList ? t('ag.coop.validOnly') : t('coop.producerIdHint')}>
          {(p) => canList
            ? <Select {...p} value={producer} onChange={(e) => { setProducer(e.target.value); setErr(''); }} placeholder={t('common.choose')} options={producers.data!.map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />
            : <Input {...p} value={producer} onChange={(e) => { setProducer(e.target.value.trim()); setErr(''); }} />}
        </Field>
        <Field label={t('coop.role.label')}>{(p) => <Select {...p} value={role} onChange={(e) => setRole(e.target.value as MemberRole)} options={roles} />}</Field>
        {a.add.error && <Alert tone="danger" live>{a.add.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

/** Producteur : ses adhésions actives et terminées (maquettes/web/producteur/cooperatives.html). */
export function MyCooperativesPage() {
  const { t } = useTranslation();
  const q = useMyMemberships();
  const roles = useRoleOptions();
  const roleLabel = (r: string) => roles.find((x) => x.value === r)?.label ?? r;
  return (
    <>
      <PageHeader title={t('nav.myCoops')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.myCoops') }]} desc={t('ag.coop.mineDesc')} listen={t('coop.mineListen')} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('coop.mineEmpty')} icon="users">{t('coop.mineEmptyHelp')}</EmptyState></div>}>
        {(d) => {
          const active = d.filter((m) => !m.left_at);
          const ended = d.filter((m) => m.left_at);
          return (
            <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
              {active.length > 0 ? (
                <div className="grid-fit" style={{ '--min': '340px' } as React.CSSProperties}>
                  {active.map((m) => (
                    <Card key={m.id} as="article" title={m.cooperative_name ?? t('coop.title')} actions={<Badge tone="ok">{t('coop.activeBadge')}</Badge>}>
                      <dl className="dl">
                        <dt>{t('ag.coop.myRole')}</dt><dd>{roleLabel(m.role)}</dd>
                        <dt>{t('ag.coop.memberLabel')}</dt><dd className="num">{t('coop.since', { date: fmtDate(m.joined_at) })}</dd>
                      </dl>
                      {BUREAU.includes(m.role) && m.cooperative && (
                        <Link className={buttonCls({ variant: 'secondary', size: 'sm' })} to={`/cooperatives/${m.cooperative}`}>{t('coop.manage')}</Link>
                      )}
                    </Card>
                  ))}
                </div>
              ) : <div className="card"><EmptyState title={t('ag.coop.noActiveMine')} icon="users">{t('coop.mineEmptyHelp')}</EmptyState></div>}
              {ended.length > 0 && (
                <Card title={t('coop.history')}>
                  <ul className="list">
                    {ended.map((m) => (
                      <li key={m.id} className="list-item"><span className="li-icon"><Icon name="building" /></span>
                        <span className="li-main"><span className="li-title">{m.cooperative_name ?? t('coop.title')}</span>
                          <span className="li-meta num">{t('ag.coop.endedLine', { role: roleLabel(m.role), from: fmtDate(m.joined_at), to: fmtDate(m.left_at) })}{m.end_reason ? ` · ${t('programs.reasonLine', { reason: m.end_reason })}` : ''}</span></span>
                        <span className="li-end"><Badge tone="neutral">{t('coop.endedOn', { date: fmtDate(m.left_at) })}</Badge></span></li>
                    ))}
                  </ul>
                </Card>
              )}
              <Alert tone="info">{t('ag.coop.joinHint')}</Alert>
            </div>
          );
        }}
      </QueryState>
      <div className="mt-5"><NearbyCooperatives /></div>
    </>
  );
}
