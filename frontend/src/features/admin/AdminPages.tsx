import { useState } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs, rows } from '../../shared/api/client';
import type { AdminUser, AuditLog, Paginated, Role } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Chips, Dialog, EmptyState, Field, Icon, Input, Notice, PageHeader, QueryState, Select, Table, Textarea, buttonCls, downloadBlob, fmtDateTime, fmtNum } from '../../shared/ui';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import '../dashboard/pilotage.css';

/** Valeurs des rôles ; les libellés viennent de « roles.<valeur> » dans les fichiers de traduction. */
export const ROLE_VALUES: Role[] = [
  'producteur', 'agent_atda', 'agronome_inrab', 'responsable_programme', 'admin_maep', 'auditeur_copil',
  'agent_financier', 'gestionnaire_cooperative', 'transformateur', 'distributeur', 'repr_mtdi',
];
const fmtPhone = (p: string) => p.replace(/(\d{2})(?=\d)/g, '$1 ');

export function AccountsPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const place = usePlaceName();
  const q = useQuery({ queryKey: ['admin-users'], queryFn: async () => rows(await api<Paginated<AdminUser> | AdminUser[]>('/admin/users?page_size=100')) });
  const [done, setDone] = useState('');
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminUser> }) => api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body }),
    onSuccess: (u) => { void qc.invalidateQueries({ queryKey: ['admin-users'] }); setDone(t(u.is_active ? 'pilotage.accounts.reactivated' : 'pilotage.accounts.suspendedMsg', { name: u.full_name })); },
  });
  const [form, setForm] = useState<AdminUser | 'new' | null>(null);
  const [suspend, setSuspend] = useState<AdminUser | null>(null);
  const [role, setRole] = useState('');
  const [state, setState] = useState(['active']);
  const all = q.data ?? [];
  const byRole = role ? all.filter((u) => u.role === role) : all;
  const data = byRole.filter((u) => u.is_active === (state[0] === 'active'));

  return (
    <div className="pv">
      <PageHeader title={t('pilotage.accounts.title')} crumbs={[{ label: t('pilotage.crumbGov') }, { label: t('nav.admin') }]} desc={t('pilotage.accounts.desc')}
        actions={<>
          <Link className={buttonCls({ variant: 'secondary' })} to="/journal"><Icon name="scroll" />{t('pilotage.accounts.journal')}</Link>
          <Button icon="plus" onClick={() => setForm('new')}>{t('admin.create')}</Button>
        </>} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div aria-live="polite">
          {patch.error && <Notice tone="error">{patch.error.message}</Notice>}
          {done && <Alert tone="ok" title={t('admin.updated')}>{done}</Alert>}
        </div>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState icon="users" title={t('admin.empty')} />}>
          {() => (
            <Table<AdminUser> caption={t('pilotage.accounts.caption')} data={data} rowKey={(r) => r.id} exportName="comptes"
              toolbar={<>
                <label className="sr-only" htmlFor="acc-role">{t('admin.role')}</label>
                <Select id="acc-role" style={{ width: 'auto', minWidth: 200 }} value={role} onChange={(e) => setRole(e.target.value)} placeholder={t('pilotage.accounts.allRoles')} options={ROLE_VALUES.map((r) => ({ value: r, label: t(`roles.${r}`) }))} />
                <Chips single label={t('pilotage.accounts.filterState')} value={state} onChange={setState} options={[
                  { value: 'active', label: t('pilotage.accounts.actives'), count: byRole.filter((u) => u.is_active).length },
                  { value: 'suspended', label: t('pilotage.accounts.suspendeds'), count: byRole.filter((u) => !u.is_active).length },
                ]} />
              </>}
              columns={[
                { key: 'full_name', label: t('common.name'), render: (r) => <><span className="cell-main">{r.full_name}</span>{r.id === me?.id && <span className="cell-sub">{t('pilotage.accounts.you')}</span>}</> },
                { key: 'phone', label: t('register.phone'), num: true, render: (r) => fmtPhone(r.phone) },
                { key: 'role', label: t('admin.role'), render: (r) => t(`roles.${r.role}`, r.role), csv: (r) => t(`roles.${r.role}`, r.role) },
                { key: 'department', label: t('admin.scope'), render: (r) => [place(r.department), place(r.commune)].filter(Boolean).join(', ') || t('admin.national') },
                { key: 'is_active', label: t('admin.state'), render: (r) => (r.is_active ? null : <Badge tone="bad" icon="lock">{t('admin.suspended')}</Badge>), csv: (r) => (r.is_active ? t('admin.active') : t('admin.suspended')) },
                { key: 'actions', label: t('admin.actions'), actions: true, render: (r) => (r.id === me?.id ? <span className="small muted">{t('pilotage.accounts.yours')}</span> : (
                  <DM.Root modal={false}>
                    <DM.Trigger asChild><Button size="sm" variant="ghost" iconOnly icon="more" aria-label={`${t('admin.actions')} : ${r.full_name}`} /></DM.Trigger>
                    <DM.Portal>
                      <DM.Content align="end" sideOffset={4} className="menu is-open !static z-[1600]">
                        {r.is_active ? (
                          <>
                            <DM.Item className="menu-item" onSelect={() => { setDone(''); setForm(r); }}><Icon name="edit" />{t('admin.reassign')}</DM.Item>
                            <DM.Item className="menu-item menu-item--danger" onSelect={() => { setDone(''); setSuspend(r); }}><Icon name="lock" />{t('admin.suspend')}</DM.Item>
                          </>
                        ) : (
                          <DM.Item className="menu-item" onSelect={() => { setDone(''); patch.mutate({ id: r.id, body: { is_active: true } }); }}><Icon name="check" />{t('admin.reactivate')}</DM.Item>
                        )}
                      </DM.Content>
                    </DM.Portal>
                  </DM.Root>
                )) },
              ]} />
          )}
        </QueryState>
      </div>
      {form && <UserForm user={form === 'new' ? null : form} onClose={() => setForm(null)} onDone={(m) => { setForm(null); setDone(m); }} />}
      {suspend && (
        <Dialog open onClose={() => setSuspend(null)} title={t('pilotage.accounts.suspendTitle', { name: suspend.full_name })}
          footer={<>
            <Button variant="secondary" onClick={() => setSuspend(null)}>{t('common.cancel')}</Button>
            <Button variant="dangerSolid" icon="lock" busy={patch.isPending} onClick={() => patch.mutate({ id: suspend.id, body: { is_active: false } }, { onSettled: () => setSuspend(null) })}>{t('admin.suspend')}</Button>
          </>}>
          <p>{t('pilotage.accounts.suspendText')}</p>
        </Dialog>
      )}
    </div>
  );
}

function UserForm({ user, onClose, onDone }: { user: AdminUser | null; onClose: () => void; onDone: (msg: string) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const deps = useDepartments();
  const place = usePlaceName();
  const [v, setV] = useState({ phone: user?.phone ?? '', full_name: user?.full_name ?? '', role: user?.role ?? 'agent_atda', department: user?.department ?? '', commune: user?.commune ?? '', password: '' });
  const [err, setErr] = useState<{ name?: string; phone?: string }>({});
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  const m = useMutation({
    mutationFn: () => user
      ? api(`/admin/users/${user.id}`, { method: 'PATCH', body: { role: v.role, department: v.department || null, commune: v.commune || null } })
      : api('/admin/users', { method: 'POST', body: { ...v, department: v.department || undefined, commune: v.commune || undefined, password: v.password || undefined } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      const scope = [place(v.department), place(v.commune)].filter(Boolean).join(', ') || t('admin.national');
      onDone(user ? t('pilotage.accounts.reassigned', { name: user.full_name, scope }) : t('pilotage.accounts.created', { name: v.full_name }));
    },
  });
  return (
    <Dialog open onClose={onClose} title={user ? t('admin.reassignTitle', { name: user.full_name }) : t('admin.create')}>
      <form noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        if (!user) {
          const next = { name: v.full_name.trim() ? undefined : t('pilotage.accounts.errName'), phone: /^01\d{8}$/.test(v.phone) ? undefined : t('pilotage.accounts.errPhone') };
          setErr(next);
          if (next.name || next.phone) return;
        }
        m.mutate();
      }}>
        {!user && <>
          <Field label={t('admin.fullName')} required error={err.name}>{(p) => <Input {...p} autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />}</Field>
          <Field label={t('register.phone')} required hint={t('pilotage.accounts.phoneHint')} error={err.phone}>{(p) => <Input {...p} className="input-num" inputMode="numeric" maxLength={10} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value.replace(/\D/g, '') })} />}</Field>
        </>}
        <Field label={t('admin.role')}>{(p) => <Select {...p} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })} options={ROLE_VALUES.map((r) => ({ value: r, label: t(`roles.${r}`) }))} />}</Field>
        <Field label={t('admin.departmentNational')}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('admin.national')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('admin.communeOptional')}>{(p) => <Select {...p} value={v.commune} disabled={!v.department} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('admin.wholeDepartment')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        {!user && v.role !== 'producteur' && <Field label={t('admin.initialPassword')} hint={t('admin.passwordHint')}>{(p) => <Input {...p} type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}</Field>}
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <div className="cluster" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" busy={m.isPending}>{user ? t('admin.saveAssign') : t('admin.createAccount')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

const DATASETS = ['producers', 'parcels', 'farms_aggregates', 'cooperatives', 'harvests', 'supports'] as const;
const PERSONAL = new Set<string>(['producers']);
const MIN_REASON = 10;

export function ExportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dataset, setDataset] = useState<string>('producers');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => api<Blob>('/exports', { method: 'POST', body: { dataset, reason: reason.trim() }, raw: true }),
    onSuccess: (b) => { downloadBlob(b, `${dataset}-${new Date().toISOString().slice(0, 10)}.csv`); void qc.invalidateQueries({ queryKey: ['my-exports'] }); },
  });
  // Historique : les exports sont inscrits au journal d'audit (action export.csv) avant la création du fichier.
  const hist = useQuery({
    queryKey: ['my-exports', user?.phone],
    queryFn: async () => rows(await api<Paginated<AuditLog> | AuditLog[]>(`/audit-logs${qs({ action: 'export.csv', actor: user?.phone ?? '' })}`)),
    enabled: !!user,
  });
  const len = reason.trim().length;
  const dsLabel = (d: string) => t(`pilotage.exports.ds.${d}.t`, { defaultValue: d });
  return (
    <div className="pv">
      <PageHeader title={t('exports.title')} crumbs={[{ label: t('pilotage.crumb') }, { label: t('nav.exports') }]} desc={t('pilotage.exports.desc')} />
      <div className="split">
        <form noValidate className="card stack" style={{ '--gap': '20px' } as React.CSSProperties} aria-labelledby="h-exp" onSubmit={(e) => {
          e.preventDefault();
          if (len < MIN_REASON) { setErr(t('exports.errReason')); return; }
          setErr(''); m.mutate();
        }}>
          <h2 className="section-title" id="h-exp">{t('pilotage.exports.new')}</h2>
          <fieldset className="fieldset">
            <legend className="label">{t('exports.dataset')}</legend>
            <div className="grid-fit" style={{ '--min': '250px', '--gap': '10px' } as React.CSSProperties}>
              {DATASETS.map((d) => (
                <label key={d} className="choice-card" style={{ height: '100%' }}>
                  <input className="radio" type="radio" name="ds" value={d} checked={dataset === d} onChange={() => setDataset(d)} />
                  <span>
                    <b>{dsLabel(d)}</b> {PERSONAL.has(d) && <Badge tone="urgent" icon="lock">{t('pilotage.exports.personal')}</Badge>}
                    <br /><span className="small muted">{t(`pilotage.exports.ds.${d}.d`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t('exports.reason')} required error={err} hint={<>{t('pilotage.exports.reasonHint')} <span className="num" aria-live="polite">{t('pilotage.exports.counter', { n: len, min: MIN_REASON })}</span></>}>
            {(p) => <Textarea {...p} rows={3} maxLength={500} placeholder={t('pilotage.exports.reasonPh')} value={reason} onChange={(e) => { setReason(e.target.value); if (err && e.target.value.trim().length >= MIN_REASON) setErr(''); }} />}
          </Field>
          {PERSONAL.has(dataset) && <Alert tone="warn" icon="shield-check" title={t('pilotage.exports.personalTitle')}>{t('pilotage.exports.personalText')}</Alert>}
          <div aria-live="polite">
            {m.error && <Notice tone="error">{m.error.message}</Notice>}
            {m.isSuccess && <Notice tone="success">{t('exports.done')}</Notice>}
          </div>
          <div className="cluster" style={{ justifyContent: 'flex-end' }}><Button type="submit" icon="download" busy={m.isPending}>{t('exports.submit')}</Button></div>
        </form>
        <Card title={t('pilotage.exports.recordedTitle')}>
          <dl className="dl">
            <dt>{t('pilotage.exports.who')}</dt><dd>{user ? `${user.full_name}, ${t(`roles.${user.role}`)}` : '—'}</dd>
            <dt>{t('pilotage.exports.what')}</dt><dd>{dsLabel(dataset)}</dd>
            <dt>{t('pilotage.exports.why')}</dt><dd>{t('pilotage.exports.whyV')}</dd>
            <dt>{t('pilotage.exports.when')}</dt><dd>{t('pilotage.exports.whenV')}</dd>
          </dl>
          <p className="small muted mt-3.5">{t('pilotage.exports.before')}</p>
        </Card>
      </div>
      <div className="mt-6">
        <QueryState q={hist} empty={(d) => d.length === 0} emptyText={<EmptyState icon="download" title={t('pilotage.exports.histEmpty')} />}>
          {(d) => (
            <Table<AuditLog> title={t('pilotage.exports.histTitle')} caption={t('pilotage.exports.histCaption')} data={d} rowKey={(r) => r.id}
              toolbar={<Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to="/journal">{t('pilotage.exports.seeJournal')}</Link>}
              columns={[
                { key: 'at', label: t('common.date'), num: true, render: (r) => fmtDateTime(r.at) },
                { key: 'object_id', label: t('exports.dataset'), render: (r) => <>{dsLabel(r.object_id)} {PERSONAL.has(r.object_id) && <Badge tone="urgent" icon={false}>{t('pilotage.exports.personalShort')}</Badge>}</>, csv: (r) => dsLabel(r.object_id) },
                { key: 'reason', label: t('common.reason'), render: (r) => String(detail(r, 'reason') ?? '—'), csv: (r) => detail(r, 'reason') },
                { key: 'rows', label: t('pilotage.exports.rows'), num: true, render: (r) => { const n = detail(r, 'rows'); return typeof n === 'number' ? fmtNum(n) : '—'; } },
              ]} />
          )}
        </QueryState>
      </div>
    </div>
  );
}

const detail = (r: AuditLog, k: string): unknown => (r.details && typeof r.details === 'object' ? (r.details as Record<string, unknown>)[k] : undefined);
