import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { useDepartments, usePlaceName, useVcName, useVcSelect } from '../../shared/api/ref';
import { Alert, Button, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Stat, Switch, Table, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useProducers } from '../producers/api';

interface Lot { id: string; code: string; value_chain: string; variety: string; category: string; certificate_no: string; centre: string; department: string; produced_on: string; quantity_kg: number; available_kg: number; distributed_kg: number; beneficiaries: number }
interface LotList { results: Lot[]; stock_kg: number }
const CATEGORIES = ['pre_base', 'base', 'r1', 'r2'];
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Semences certifiées : lots d'un centre semencier, distribués aux producteurs sous forme d'appuis à confirmer. */
export function SeedsPage() {
  const { t } = useTranslation();
  const role = useAuth().user?.role;
  const writer = role === 'agent_atda' || role === 'admin_maep';
  const place = usePlaceName();
  const vc = useVcName();
  const [adding, setAdding] = useState(false);
  const [giving, setGiving] = useState<Lot | null>(null);
  const q = useQuery({ queryKey: ['seed-lots'], queryFn: () => api<LotList>('/seed-lots') });
  return (
    <>
      <PageHeader title={t('seed.title')} desc={t('seed.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.seeds') }]}
        actions={writer ? <Button icon="plus" onClick={() => setAdding(true)}>{t('seed.add')}</Button> : undefined} />
      <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<div className="card"><EmptyState icon="sprout" title={t('seed.empty')}>{t('seed.emptyHelp')}</EmptyState></div>}>
        {(d) => (
          <div className="stack" style={gap(20)}>
            <div className="grid-fit" style={{ '--min': '170px' } as React.CSSProperties}>
              <Stat label={t('seed.kpi.lots')} value={fmtNum(d.results.length)} />
              <Stat label={t('seed.kpi.stock')} value={fmtNum(d.stock_kg)} unit="kg" />
              <Stat label={t('seed.kpi.given')} value={fmtNum(d.results.reduce((a, l) => a + l.distributed_kg, 0))} unit="kg" />
              <Stat label={t('seed.kpi.beneficiaries')} value={fmtNum(d.results.reduce((a, l) => a + l.beneficiaries, 0))} />
            </div>
            <Table<Lot> title={t('seed.lots')} caption={t('seed.lots')} data={d.results} rowKey={(r) => r.id} exportName="lots-de-semences" columns={[
              { key: 'code', label: t('seed.col.code'), render: (r) => <><span className="cell-main num">{r.code}</span><span className="cell-sub">{r.certificate_no}</span></>, csv: (r) => r.code },
              { key: 'variety', label: t('seed.col.variety'), render: (r) => <><span className="cell-main">{r.variety}</span><span className="cell-sub">{vc(r.value_chain)} · {t(`seed.category.${r.category}`)}</span></>, csv: (r) => r.variety },
              { key: 'centre', label: t('seed.col.centre'), render: (r) => <><span className="cell-main">{r.centre}</span><span className="cell-sub">{place(r.department)} · {fmtDate(r.produced_on)}</span></>, csv: (r) => r.centre },
              { key: 'available_kg', label: t('seed.col.available'), num: true, render: (r) => `${fmtNum(r.available_kg)} / ${fmtNum(r.quantity_kg)}`, csv: (r) => r.available_kg },
              { key: 'beneficiaries', label: t('seed.col.beneficiaries'), num: true },
              ...(writer ? [{ key: 'act', label: t('common.action'), actions: true, render: (r: Lot) => <Button size="sm" variant="secondary" disabled={r.available_kg <= 0} onClick={() => setGiving(r)}>{t('seed.give')}</Button> }] : []),
            ]} />
          </div>
        )}
      </QueryState>
      {adding && <LotDialog onClose={() => setAdding(false)} />}
      {giving && <GiveDialog lot={giving} onClose={() => setGiving(null)} />}
    </>
  );
}

function LotDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const deps = useDepartments();
  const vcSel = useVcSelect();
  const { user } = useAuth();
  const [v, setV] = useState({ value_chain: 'mais', variety: '', category: 'r1', cert: '', centre: '', department: user?.department ?? '', date: '', qty: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/seed-lots', { method: 'POST', body: { value_chain: v.value_chain, variety: v.variety.trim(), category: v.category, certificate_no: v.cert.trim(), centre: v.centre.trim(), department: v.department, produced_on: v.date, quantity_kg: Number(v.qty) } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['seed-lots'] }); toast(t('seed.saved')); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('seed.add')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-lot" busy={m.isPending}>{t('common.save')}</Button></>}>
      <form id="f-lot" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (v.variety.trim().length < 2) er.variety = t('seed.errVariety');
        if (v.cert.trim().length < 3) er.cert = t('seed.errCert');
        if (v.centre.trim().length < 2) er.centre = t('seed.errCentre');
        if (!v.department) er.department = t('sch.errDepartment');
        if (!v.date) er.date = t('seed.errDate');
        if (!(Number(v.qty) >= 1)) er.qty = t('seed.errQty');
        setErrs(er);
        if (!Object.keys(er).length) m.mutate();
      }}>
        <div className="form-grid">
          <Field label={t('common.valueChain')}>{(p) => <Select {...p} {...vcSel} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} />}</Field>
          <Field label={t('seed.col.variety')} error={errs.variety}>{(p) => <Input {...p} value={v.variety} onChange={(e) => setV({ ...v, variety: e.target.value })} />}</Field>
          <Field label={t('seed.categoryLabel')}>{(p) => <Select {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: t(`seed.category.${c}`) }))} />}</Field>
          <Field label={t('seed.cert')} error={errs.cert}>{(p) => <Input {...p} value={v.cert} onChange={(e) => setV({ ...v, cert: e.target.value })} />}</Field>
          <Field label={t('seed.col.centre')} error={errs.centre}>{(p) => <Input {...p} value={v.centre} onChange={(e) => setV({ ...v, centre: e.target.value })} />}</Field>
          <Field label={t('common.department')} error={errs.department}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <Field label={t('seed.producedOn')} error={errs.date}>{(p) => <Input {...p} type="date" max={new Date().toISOString().slice(0, 10)} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />}</Field>
          <Field label={t('seed.qty')} error={errs.qty}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="decimal" value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} /><span className="addon addon--end">kg</span></div>}</Field>
        </div>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}

function GiveDialog({ lot, onClose }: { lot: Lot; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const producers = useProducers({ status: 'valide' });
  const [v, setV] = useState({ producer: '', qty: '', repay: false, value: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api(`/seed-lots/${lot.id}/distribute`, { method: 'POST', body: { producer: v.producer, quantity_kg: Number(v.qty), repayable: v.repay, value_xof: v.repay ? Number(v.value || 0) : 0 } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['seed-lots'] }); void qc.invalidateQueries({ queryKey: ['supports'] }); toast(t('seed.given')); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('seed.giveTitle', { code: lot.code })} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-give" busy={m.isPending}>{t('seed.giveConfirm')}</Button></>}>
      <form id="f-give" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (!v.producer) er.producer = t('supports.errProducer');
        if (!(Number(v.qty) > 0) || Number(v.qty) > lot.available_kg) er.qty = t('seed.errGive', { n: fmtNum(lot.available_kg) });
        if (v.repay && !(Number(v.value) > 0)) er.value = t('supports.errValue');
        setErrs(er);
        if (!Object.keys(er).length) m.mutate();
      }}>
        <Field label={t('common.producer')} hint={t('ag.coop.validOnly')} error={errs.producer}>{(p) => <Select {...p} value={v.producer} onChange={(e) => setV({ ...v, producer: e.target.value })} placeholder={t('common.choose')} options={(producers.data ?? []).map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />}</Field>
        <Field label={t('seed.giveQty', { n: fmtNum(lot.available_kg) })} error={errs.qty}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="decimal" value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} /><span className="addon addon--end">kg</span></div>}</Field>
        <Switch label={t('supports.repayableLabel')} checked={v.repay} onChange={(e) => setV({ ...v, repay: e.target.checked })} />
        {v.repay && <Field label={t('supports.valueXof')} error={errs.value}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" value={v.value} onChange={(e) => setV({ ...v, value: e.target.value.replace(/\D/g, '') })} /><span className="addon addon--end">FCFA</span></div>}</Field>}
        <Alert tone="info" icon="info">{t('seed.giveHelp')}</Alert>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}
