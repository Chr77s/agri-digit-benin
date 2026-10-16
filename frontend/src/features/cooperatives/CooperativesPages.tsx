import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDate } from '../../shared/ui';
import { VcOptions } from '../../shared/ui/VcOptions';
import { useDepartments, usePlaceName, useValueChains, useVcName } from '../../shared/api/ref';
import type { Cooperative, MemberRole, Membership } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import { useProducers } from '../producers/api';
import { useCooperative, useCooperatives, useCreateCooperative, useMembers, useMembershipActions, useMyMemberships } from './api';

const MEMBER_ROLES: MemberRole[] = ['membre', 'president', 'tresorier', 'secretaire'];

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
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const q = useCooperatives({ department, search });
  const canCreate = user?.role === 'agent_atda' || user?.role === 'admin_maep';
  const isManager = user?.role === 'gestionnaire_cooperative';
  return (
    <>
      <PageHeader title={isManager ? t('coop.myTitle') : t('coop.title')} actions={canCreate && <Button onClick={() => setOpen(true)}>{t('coop.create')}</Button>} />
      {!isManager && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="w-56"><Field label={t('common.department')}>{(p) => <Select {...p} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field></div>
          <div className="w-64"><Field label={t('coop.searchName')}>{(p) => <input {...p} type="search" className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} />}</Field></div>
        </div>
      )}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('coop.empty')}>{canCreate ? t('coop.emptyCreate') : t('coop.emptyAsk')}</EmptyState>}>
        {(d) => (
          <Table<Cooperative> caption={t('coop.title')} rowKey={(r) => r.id} data={d} exportName="cooperatives" columns={[
            { key: 'name', label: t('coop.name'), render: (r) => <Link className="font-semibold text-brand underline" to={`/cooperatives/${r.id}`}>{r.name}</Link> },
            { key: 'commune', label: t('common.commune'), render: (r) => `${place(r.commune)} (${place(r.department)})`, csv: (r) => place(r.commune) },
            { key: 'value_chains', label: t('common.valueChains'), render: (r) => r.value_chains.map(vcName).join(', '), csv: (r) => r.value_chains.join(' ') },
            { key: 'members_count', label: t('coop.activeMembers') },
          ]} />
        )}
      </QueryState>
      {open && <CreateDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const deps = useDepartments();
  const vcs = useValueChains();
  const m = useCreateCooperative();
  const [v, setV] = useState({ name: '', department: '', commune: '', value_chains: [] as string[], registration_number: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  return (
    <Dialog open onClose={onClose} title={t('coop.create')}>
      <form noValidate className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (v.name.trim().length < 3) er.name = t('coop.errName');
        if (!v.department || !v.commune) er.commune = t('coop.errPlace');
        if (!v.value_chains.length) er.value_chains = t('coop.errVc');
        setErrs(er);
        if (Object.keys(er).length) return;
        m.mutate({ ...v, registration_number: v.registration_number || undefined }, { onSuccess: onClose });
      }}>
        <Field label={t('coop.name')} error={errs.name}>{(p) => <input {...p} className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <Field label={t('common.department')}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('common.commune')} error={errs.commune}>{(p) => <Select {...p} value={v.commune} disabled={!v.department} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        <Field label={t('common.valueChainsMulti')} error={errs.value_chains}>{(p) => <select {...p} multiple className={`${inputCls} h-32`} value={v.value_chains} onChange={(e) => setV({ ...v, value_chains: Array.from(e.target.selectedOptions, (o) => o.value) })}><VcOptions vcs={vcs.data} /></select>}</Field>
        <Field label={t('coop.registration')}>{(p) => <input {...p} className={inputCls} value={v.registration_number} onChange={(e) => setV({ ...v, registration_number: e.target.value })} />}</Field>
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <Button type="submit" busy={m.isPending}>{t('coop.save')}</Button>
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
  const roles = useRoleOptions();
  const [active, setActive] = useState(true);
  const members = useMembers(id, active);
  const a = useMembershipActions(id);
  const [addOpen, setAddOpen] = useState(false);
  const [ending, setEnding] = useState<Membership | null>(null);
  const [msg, setMsg] = useState('');
  const canEdit = ['agent_atda', 'admin_maep', 'gestionnaire_cooperative'].includes(user?.role ?? '');
  const roleLabel = (r: string) => roles.find((x) => x.value === r)?.label ?? r;
  return (
    <QueryState q={q}>
      {(c) => (
        <>
          <PageHeader title={c.name} actions={canEdit && <Button onClick={() => setAddOpen(true)}>{t('coop.addMember')}</Button>} />
          <dl className="mb-4 grid gap-2 rounded border border-border bg-surface p-4 md:grid-cols-3">
            <div><dt className="text-sm text-muted">{t('coop.seat')}</dt><dd className="font-semibold">{place(c.commune)}, {place(c.department)}</dd></div>
            <div><dt className="text-sm text-muted">{t('common.valueChains')}</dt><dd className="font-semibold">{c.value_chains.map(vcName).join(', ')}</dd></div>
            <div><dt className="text-sm text-muted">{t('coop.activeMembers')}</dt><dd className="font-semibold">{c.members_count}</dd></div>
          </dl>
          <div aria-live="polite" className="mb-3">{msg && <Notice tone="success">{msg}</Notice>}</div>
          <div className="mb-3 w-72"><Field label={t('common.show')}>{(p) => <Select {...p} value={String(active)} onChange={(e) => setActive(e.target.value === 'true')} options={[{ value: 'true', label: t('coop.activeMembers') }, { value: 'false', label: t('coop.history') }]} />}</Field></div>
          <QueryState q={members} empty={(d) => d.length === 0} emptyText={<EmptyState title={active ? t('coop.noActive') : t('coop.noHistory')}>{active && canEdit ? t('coop.noActiveHelp') : undefined}</EmptyState>}>
            {(d) => (
              <Table<Membership> caption={t('coop.members')} rowKey={(r) => r.id} data={d} exportName="membres" columns={[
                { key: 'producer_code', label: t('common.code') },
                { key: 'producer_name', label: t('common.name') },
                { key: 'role', label: t('coop.role.label'), render: (r) => roleLabel(r.role) },
                { key: 'joined_at', label: t('coop.joined'), render: (r) => fmtDate(r.joined_at) },
                { key: 'left_at', label: t('coop.left'), render: (r) => (r.left_at ? fmtDate(r.left_at) : <Badge tone="success">{t('coop.activeBadge')}</Badge>) },
                ...(canEdit && active ? [{ key: 'act', label: t('common.action'), sortable: false, render: (r: Membership) => <Button variant="danger" onClick={() => setEnding(r)}>{t('coop.end')}</Button> }] : []),
              ]} />
            )}
          </QueryState>
          {addOpen && <AddMemberDialog coopId={id} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); setMsg(t('coop.added')); }} />}
          <Dialog open={!!ending} onClose={() => setEnding(null)} title={t('coop.endTitle', { name: ending?.producer_name ?? '' })}>
            <EndForm busy={a.end.isPending} error={a.end.error} onSubmit={(reason) => a.end.mutate({ id: ending!.id, reason }, { onSuccess: () => { setEnding(null); setMsg(t('coop.ended')); } })} />
          </Dialog>
        </>
      )}
    </QueryState>
  );
}

function EndForm({ onSubmit, busy, error }: { onSubmit: (r: string) => void; busy: boolean; error: Error | null }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (reason.trim().length < 5) { setErr(t('common.errReason')); return; } onSubmit(reason.trim()); }}>
      <Field label={t('coop.endReason')} error={err}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} />}</Field>
      {error && <Notice tone="error" live>{error.message}</Notice>}
      <Button type="submit" variant="danger" busy={busy}>{t('coop.endConfirm')}</Button>
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
    <Dialog open onClose={onClose} title={t('coop.addMember')}>
      <form noValidate className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!producer) { setErr(t('coop.errProducer')); return; } a.add.mutate({ producer, role }, { onSuccess: onDone }); }}>
        <Field label={t('common.producer')} error={err} hint={canList ? undefined : t('coop.producerIdHint')}>
          {(p) => canList
            ? <Select {...p} value={producer} onChange={(e) => { setProducer(e.target.value); setErr(''); }} placeholder={t('common.choose')} options={producers.data!.map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />
            : <input {...p} className={inputCls} value={producer} onChange={(e) => { setProducer(e.target.value.trim()); setErr(''); }} />}
        </Field>
        <Field label={t('coop.role.label')}>{(p) => <Select {...p} value={role} onChange={(e) => setRole(e.target.value as MemberRole)} options={roles} />}</Field>
        {a.add.error && <Notice tone="error" live>{a.add.error.message}</Notice>}
        <Button type="submit" busy={a.add.isPending}>{t('coop.addConfirm')}</Button>
      </form>
    </Dialog>
  );
}

export function MyCooperativesPage() {
  const { t } = useTranslation();
  const q = useMyMemberships();
  const roles = useRoleOptions();
  return (
    <>
      <PageHeader title={t('nav.myCoops')} listen={t('coop.mineListen')} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('coop.mineEmpty')}>{t('coop.mineEmptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((m) => (
              <li key={m.id} className="rounded border border-border bg-surface p-3">
                <p className="text-lg font-semibold">{m.cooperative_name ?? t('coop.title')}</p>
                <p className="flex flex-wrap items-center gap-2">
                  {roles.find((r) => r.value === m.role)?.label}, {t('coop.since', { date: fmtDate(m.joined_at) })}
                  {m.left_at ? <Badge>{t('coop.endedOn', { date: fmtDate(m.left_at) })}</Badge> : <Badge tone="success">{t('coop.activeBadge')}</Badge>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}
