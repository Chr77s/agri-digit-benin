import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import { usePlaceName } from '../../shared/api/ref';
import type { Paginated } from '../../shared/api/types';
import { Alert, Badge, Button, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Table, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

export interface Equipment { id: string; kind: string; label: string; quantity: number; condition: string; acquired_year: number | null; for_hire: boolean; hire_rate_xof_per_ha: number | null; department: string; commune: string; owner?: string }
interface Summary { department: string; kind: string; owners: number; units: number; for_hire_units: number }

export const EQUIPMENT_KINDS = ['tracteur', 'motoculteur', 'charrue', 'semoir', 'pulverisateur', 'decortiqueuse', 'pompe', 'tricycle', 'autre'];
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Matériel agricole : le propriétaire déclare le sien et le propose à la location ; le personnel lit l'inventaire. */
export function EquipmentPage() {
  const { t } = useTranslation();
  const role = useAuth().user?.role ?? '';
  const owner = role === 'producteur' || role === 'gestionnaire_cooperative';
  return (
    <>
      <PageHeader title={t(owner ? 'eqp.title' : 'eqp.titleStaff')} desc={t(owner ? 'eqp.desc' : 'eqp.descStaff')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.equipment') }]} listen={owner ? t('eqp.desc') : undefined} />
      {owner ? <Mine /> : <Inventory />}
    </>
  );
}

function Mine() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['equipment'], queryFn: async () => rows(await api<Paginated<Equipment>>('/equipment')) });
  const [hire, setHire] = useState<Equipment | null>(null);
  const done = () => void qc.invalidateQueries({ queryKey: ['equipment'] });
  const del = useMutation({ mutationFn: (id: string) => api(`/equipment/${id}`, { method: 'DELETE' }), onSuccess: done });
  const unhire = useMutation({ mutationFn: (id: string) => api(`/equipment/${id}`, { method: 'PATCH', body: { for_hire: false } }), onSuccess: done });
  return (
    <div className="split">
      <div className="stack" style={gap(12)}>
        {(del.error || unhire.error) && <Alert tone="danger" live>{(del.error ?? unhire.error)?.message}</Alert>}
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="truck" title={t('eqp.empty')}>{t('eqp.emptyHelp')}</EmptyState></div>}>
          {(d) => (
            <Table<Equipment> title={t('eqp.mine')} caption={t('eqp.mine')} data={d} rowKey={(r) => r.id} exportName="mon-materiel" columns={[
              { key: 'kind', label: t('eqp.kind'), render: (r) => <><span className="cell-main">{t(`eqp.kinds.${r.kind}`)}</span>{r.label && <span className="cell-sub">{r.label}</span>}</>, csv: (r) => r.kind },
              { key: 'quantity', label: t('eqp.quantity'), num: true },
              { key: 'condition', label: t('eqp.condition'), render: (r) => t(`eqp.conditions.${r.condition}`), csv: (r) => r.condition },
              { key: 'for_hire', label: t('eqp.hire'), render: (r) => (r.for_hire ? <Badge tone="ok">{t('eqp.hireRate', { n: fmtNum(r.hire_rate_xof_per_ha) })}</Badge> : <span className="muted">{t('eqp.notHired')}</span>), csv: (r) => r.hire_rate_xof_per_ha },
              { key: 'act', label: t('common.action'), actions: true, render: (r) => (
                <span className="cluster">
                  {r.for_hire ? <Button size="sm" variant="ghost" onClick={() => unhire.mutate(r.id)}>{t('eqp.stopHire')}</Button> : <Button size="sm" variant="secondary" onClick={() => setHire(r)}>{t('eqp.startHire')}</Button>}
                  <Button size="sm" variant="ghost" icon="trash" onClick={() => del.mutate(r.id)}>{t('eqp.remove')}</Button>
                </span>) },
            ]} />
          )}
        </QueryState>
      </div>
      <AddEquipment />
      {hire && <HireDialog e={hire} onClose={() => setHire(null)} />}
    </div>
  );
}

function AddEquipment() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const empty = { kind: 'tracteur', label: '', quantity: '1', condition: 'bon', year: '' };
  const [v, setV] = useState(empty);
  const m = useMutation({
    mutationFn: () => api('/equipment', { method: 'POST', body: { kind: v.kind, label: v.label.trim(), quantity: Number(v.quantity) || 1, condition: v.condition, ...(v.year ? { acquired_year: Number(v.year) } : {}) } }),
    onSuccess: () => { setV(empty); void qc.invalidateQueries({ queryKey: ['equipment'] }); toast(t('eqp.saved')); },
  });
  return (
    <form noValidate className="card stack" style={gap(16)} aria-labelledby="h-eq" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      <div className="card-head m-0"><h2 className="card-title" id="h-eq">{t('eqp.add')}</h2></div>
      <Field label={t('eqp.kind')}>{(p) => <Select {...p} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} options={EQUIPMENT_KINDS.map((k) => ({ value: k, label: t(`eqp.kinds.${k}`) }))} />}</Field>
      <Field label={t('eqp.label')} optional>{(p) => <Input {...p} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />}</Field>
      <div className="form-grid">
        <Field label={t('eqp.quantity')}>{(p) => <Input {...p} inputMode="numeric" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value.replace(/\D/g, '') })} />}</Field>
        <Field label={t('eqp.condition')}>{(p) => <Select {...p} value={v.condition} onChange={(e) => setV({ ...v, condition: e.target.value })} options={['bon', 'moyen', 'mauvais'].map((k) => ({ value: k, label: t(`eqp.conditions.${k}`) }))} />}</Field>
        <Field label={t('eqp.year')} optional>{(p) => <Input {...p} inputMode="numeric" maxLength={4} value={v.year} onChange={(e) => setV({ ...v, year: e.target.value.replace(/\D/g, '') })} />}</Field>
      </div>
      {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      <div className="cluster justify-end"><Button type="submit" icon="plus" busy={m.isPending}>{t('eqp.addBtn')}</Button></div>
    </form>
  );
}

function HireDialog({ e, onClose }: { e: Equipment; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [rate, setRate] = useState('');
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => api(`/equipment/${e.id}`, { method: 'PATCH', body: { for_hire: true, hire_rate_xof_per_ha: Number(rate) } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['equipment'] }); toast(t('eqp.hireOn')); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('eqp.hireTitle', { kind: t(`eqp.kinds.${e.kind}`) })} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-hire" busy={m.isPending}>{t('eqp.hireConfirm')}</Button></>}>
      <form id="f-hire" noValidate className="stack" onSubmit={(ev) => { ev.preventDefault(); if (!(Number(rate) > 0)) return setErr(t('eqp.errRate')); setErr(''); m.mutate(); }}>
        <p className="small">{t('eqp.hireHelp')}</p>
        <Field label={t('eqp.rate')} error={err}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" value={rate} onChange={(ev) => setRate(ev.target.value.replace(/\D/g, ''))} /><span className="addon addon--end">FCFA / ha</span></div>}</Field>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

function Inventory() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const q = useQuery({ queryKey: ['equipment-summary'], queryFn: async () => rows(await api<Paginated<Summary>>('/equipment/summary')) });
  return (
    <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="truck" title={t('eqp.emptyStaff')}>{t('eqp.emptyStaffHelp')}</EmptyState></div>}>
      {(d) => (
        <Table<Summary> title={t('eqp.inventory')} caption={t('eqp.inventory')} data={d} rowKey={(r) => r.department + r.kind} exportName="inventaire-du-materiel" columns={[
          { key: 'department', label: t('common.department'), render: (r) => place(r.department), csv: (r) => r.department },
          { key: 'kind', label: t('eqp.kind'), render: (r) => t(`eqp.kinds.${r.kind}`), csv: (r) => r.kind },
          { key: 'owners', label: t('eqp.owners'), num: true },
          { key: 'units', label: t('eqp.units'), num: true },
          { key: 'for_hire_units', label: t('eqp.unitsHire'), num: true },
        ]} />
      )}
    </QueryState>
  );
}
