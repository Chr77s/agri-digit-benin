import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, rows } from '../../shared/api/client';
import type { AdminUser, Paginated, Role } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, downloadBlob } from '../../shared/ui';
import { useDepartments, usePlaceName } from '../../shared/api/ref';

export const ROLES: { value: Role; label: string }[] = [
  { value: 'producteur', label: 'Producteur' }, { value: 'agent_atda', label: 'Agent ATDA' }, { value: 'agronome_inrab', label: 'Agronome INRAB' },
  { value: 'responsable_programme', label: 'Responsable de programme' }, { value: 'admin_maep', label: 'Administrateur MAEP' },
  { value: 'auditeur_copil', label: 'Auditeur CoPil' }, { value: 'agent_financier', label: 'Agent financier' },
];
const roleL = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

export function AccountsPage() {
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
      <PageHeader title="Comptes" actions={<Button onClick={() => setForm('new')}>Créer un compte</Button>} />
      <div aria-live="polite">{patch.error && <Notice tone="error">{patch.error.message}</Notice>}{patch.isSuccess && <Notice tone="success">Compte mis à jour. Action journalisée.</Notice>}</div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun compte." />}>
        {(d) => (
          <Table<AdminUser> caption="Comptes" data={d} rowKey={(r) => r.id} exportName="comptes" columns={[
            { key: 'full_name', label: 'Nom' },
            { key: 'phone', label: 'Téléphone' },
            { key: 'role', label: 'Rôle', render: (r) => roleL(r.role) },
            { key: 'department', label: 'Périmètre', render: (r) => [place(r.department), place(r.commune)].filter(Boolean).join(', ') || 'National' },
            { key: 'is_active', label: 'État', render: (r) => <Badge tone={r.is_active ? 'success' : 'error'}>{r.is_active ? 'Actif' : 'Suspendu'}</Badge> },
            { key: 'actions', label: 'Actions', sortable: false, render: (r) => (
              <div className="flex flex-wrap gap-2">
                <Button variant={r.is_active ? 'danger' : 'secondary'} busy={patch.isPending && patch.variables?.id === r.id} onClick={() => patch.mutate({ id: r.id, body: { is_active: !r.is_active } })}>{r.is_active ? 'Suspendre' : 'Réactiver'}</Button>
                <Button variant="secondary" onClick={() => setForm(r)}>Réaffecter</Button>
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
    <Dialog open onClose={onClose} title={user ? `Réaffecter ${user.full_name}` : 'Créer un compte'}>
      <form className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        if (!user && (!/^01\d{8}$/.test(v.phone) || !v.full_name)) { setErr('Saisissez un nom et un téléphone de 10 chiffres commençant par 01.'); return; }
        setErr(''); m.mutate();
      }}>
        {!user && <>
          <Field label="Nom complet">{(p) => <input {...p} className={inputCls} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />}</Field>
          <Field label="Téléphone" error={err}>{(p) => <input {...p} className={inputCls} inputMode="numeric" maxLength={10} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />}</Field>
        </>}
        <Field label="Rôle">{(p) => <Select {...p} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })} options={ROLES} />}</Field>
        <Field label="Département (vide = national)">{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder="National" options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label="Commune (facultatif)">{(p) => <Select {...p} value={v.commune} disabled={!v.department} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder="Tout le département" options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        {!user && v.role !== 'producteur' && <Field label="Mot de passe initial" hint="12 caractères minimum, avec chiffres et symboles">{(p) => <input {...p} type="password" autoComplete="new-password" className={inputCls} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}</Field>}
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <Button type="submit" busy={m.isPending}>{user ? 'Enregistrer l’affectation' : 'Créer le compte'}</Button>
      </form>
    </Dialog>
  );
}

export function ExportsPage() {
  const [dataset, setDataset] = useState('producers');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => api<Blob>('/exports', { method: 'POST', body: { dataset, reason }, raw: true }),
    onSuccess: (b) => downloadBlob(b, `${dataset}-${new Date().toISOString().slice(0, 10)}.csv`),
  });
  return (
    <>
      <PageHeader title="Exports CSV" />
      <form className="flex max-w-xl flex-col gap-3 rounded border border-border bg-surface p-4" onSubmit={(e) => {
        e.preventDefault();
        if (reason.trim().length < 10) { setErr('Le motif est obligatoire (10 caractères minimum). Il est enregistré dans le journal d’audit.'); return; }
        setErr(''); m.mutate();
      }}>
        <Field label="Jeu de données">{(p) => <Select {...p} value={dataset} onChange={(e) => setDataset(e.target.value)} options={[{ value: 'producers', label: 'Producteurs (données personnelles)' }, { value: 'parcels', label: 'Parcelles' }, { value: 'farms_aggregates', label: 'Agrégats des fermes POC' }]} />}</Field>
        <Field label="Motif de l'export" error={err}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
        <div aria-live="polite">
          {m.error && <Notice tone="error">{m.error.message}</Notice>}
          {m.isSuccess && <Notice tone="success">Fichier téléchargé. Le motif est enregistré dans le journal d'audit.</Notice>}
        </div>
        <Button type="submit" busy={m.isPending} className="self-start">Exporter en CSV</Button>
      </form>
    </>
  );
}
