import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import type { AdminUser, Paginated, Role } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, downloadBlob } from '../../shared/ui';
import { useDepartments, usePlaceName } from '../../shared/api/ref';

/** Valeurs des rôles ; les libellés viennent de « roles.<valeur> » dans les fichiers de traduction. */
export const ROLE_VALUES: Role[] = [
  'producteur', 'agent_atda', 'agronome_inrab', 'responsable_programme', 'admin_maep', 'auditeur_copil',
  'agent_financier', 'gestionnaire_cooperative', 'transformateur', 'distributeur', 'repr_mtdi',
];

export function AccountsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-users'], queryFn: async () => rows(await api<Paginated<AdminUser> | AdminUser[]>('/admin/users?page_size=100')) });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminUser> }) => api(`/admin/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const [form, setForm] = useState<AdminUser | 'new' | null>(null);
  const place = usePlaceName();
  return (
    <>
      <PageHeader title={t('nav.admin')} actions={<Button onClick={() => setForm('new')}>{t('admin.create')}</Button>} />
      <div aria-live="polite">{patch.error && <Notice tone="error">{patch.error.message}</Notice>}{patch.isSuccess && <Notice tone="success">{t('admin.updated')}</Notice>}</div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('admin.empty')} />}>
        {(d) => (
          <Table<AdminUser> caption={t('nav.admin')} data={d} rowKey={(r) => r.id} exportName="comptes" columns={[
            { key: 'full_name', label: t('common.name') },
            { key: 'phone', label: t('register.phone') },
            { key: 'role', label: t('admin.role'), render: (r) => t(`roles.${r.role}`, r.role) },
            { key: 'department', label: t('admin.scope'), render: (r) => [place(r.department), place(r.commune)].filter(Boolean).join(', ') || t('admin.national') },
            { key: 'is_active', label: t('admin.state'), render: (r) => <Badge tone={r.is_active ? 'success' : 'error'}>{r.is_active ? t('admin.active') : t('admin.suspended')}</Badge> },
            { key: 'actions', label: t('admin.actions'), sortable: false, render: (r) => (
              <div className="flex flex-wrap gap-2">
                <Button variant={r.is_active ? 'danger' : 'secondary'} busy={patch.isPending && patch.variables?.id === r.id} onClick={() => patch.mutate({ id: r.id, body: { is_active: !r.is_active } })}>{r.is_active ? t('admin.suspend') : t('admin.reactivate')}</Button>
                <Button variant="secondary" onClick={() => setForm(r)}>{t('admin.reassign')}</Button>
              </div>
            ) },
          ]} />
        )}
      </QueryState>
      {form && <UserForm user={form === 'new' ? null : form} onClose={() => setForm(null)} />}
    </>
  );
}

function UserForm({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const deps = useDepartments();
  const [v, setV] = useState({ phone: user?.phone ?? '', full_name: user?.full_name ?? '', role: user?.role ?? 'agent_atda', department: user?.department ?? '', commune: user?.commune ?? '', password: '' });
  const [err, setErr] = useState('');
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  const m = useMutation({
    mutationFn: () => user
      ? api(`/admin/users/${user.id}`, { method: 'PATCH', body: { role: v.role, department: v.department || null, commune: v.commune || null } })
      : api('/admin/users', { method: 'POST', body: { ...v, department: v.department || undefined, commune: v.commune || undefined, password: v.password || undefined } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={user ? t('admin.reassignTitle', { name: user.full_name }) : t('admin.create')}>
      <form className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        if (!user && (!/^01\d{8}$/.test(v.phone) || !v.full_name)) { setErr(t('admin.errUser')); return; }
        setErr(''); m.mutate();
      }}>
        {!user && <>
          <Field label={t('admin.fullName')}>{(p) => <input {...p} className={inputCls} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />}</Field>
          <Field label={t('register.phone')} error={err}>{(p) => <input {...p} className={inputCls} inputMode="numeric" maxLength={10} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />}</Field>
        </>}
        <Field label={t('admin.role')}>{(p) => <Select {...p} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })} options={ROLE_VALUES.map((r) => ({ value: r, label: t(`roles.${r}`) }))} />}</Field>
        <Field label={t('admin.departmentNational')}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('admin.national')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('admin.communeOptional')}>{(p) => <Select {...p} value={v.commune} disabled={!v.department} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('admin.wholeDepartment')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        {!user && v.role !== 'producteur' && <Field label={t('admin.initialPassword')} hint={t('admin.passwordHint')}>{(p) => <input {...p} type="password" autoComplete="new-password" className={inputCls} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}</Field>}
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <Button type="submit" busy={m.isPending}>{user ? t('admin.saveAssign') : t('admin.createAccount')}</Button>
      </form>
    </Dialog>
  );
}

const DATASETS = ['producers', 'parcels', 'farms_aggregates', 'cooperatives', 'harvests', 'supports'] as const;

export function ExportsPage() {
  const { t } = useTranslation();
  const [dataset, setDataset] = useState('producers');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => api<Blob>('/exports', { method: 'POST', body: { dataset, reason }, raw: true }),
    onSuccess: (b) => downloadBlob(b, `${dataset}-${new Date().toISOString().slice(0, 10)}.csv`),
  });
  return (
    <>
      <PageHeader title={t('exports.title')} />
      <form className="flex max-w-xl flex-col gap-3 rounded border border-border bg-surface p-4" onSubmit={(e) => {
        e.preventDefault();
        if (reason.trim().length < 10) { setErr(t('exports.errReason')); return; }
        setErr(''); m.mutate();
      }}>
        <Field label={t('exports.dataset')}>{(p) => <Select {...p} value={dataset} onChange={(e) => setDataset(e.target.value)} options={DATASETS.map((d) => ({ value: d, label: t(`exports.ds.${d}`) }))} />}</Field>
        <Field label={t('exports.reason')} error={err}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
        <div aria-live="polite">
          {m.error && <Notice tone="error">{m.error.message}</Notice>}
          {m.isSuccess && <Notice tone="success">{t('exports.done')}</Notice>}
        </div>
        <Button type="submit" busy={m.isPending} className="self-start">{t('exports.submit')}</Button>
      </form>
    </>
  );
}
