import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Radio, Select, Textarea, fieldError, fmtNum, toast } from '../../shared/ui';
import { useDepartments, usePlaceName, useVcName, useVcSelect } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { SHOWCASE_WRITERS, usePublish, useShowcase, useWithdraw, type Form, type Showcase } from './api';
import { FormError, gap } from './FormError';

const PRICE_MAX = 20000;

/** Vitrine des produits : les entreprises de transformation, de distribution et les coopératives présentent leurs produits. */
export function ShowcasePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const vc = useVcSelect();
  const deps = useDepartments();
  const [f, setF] = useState({ value_chain: '', form: '', department: '' });
  const [adding, setAdding] = useState(false);
  const q = useShowcase(f);
  const canPublish = SHOWCASE_WRITERS.includes(user?.role ?? '');
  return (
    <>
      <PageHeader title={t('mk.show.title')} desc={t('mk.show.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.showcase') }]}
        actions={canPublish ? <Button icon="plus" onClick={() => setAdding(true)}>{t('mk.show.add')}</Button> : undefined} />
      <div className="stack" style={gap(20)}>
        <div className="form-grid">
          <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={f.value_chain} onChange={(e) => setF({ ...f, value_chain: e.target.value })} placeholder={t('common.all')} options={vc.options} groups={vc.groups} />}</Field>
          <Field label={t('mk.prices.form')}>{(p) => <Select {...p} value={f.form} onChange={(e) => setF({ ...f, form: e.target.value })} placeholder={t('common.allF')} options={[{ value: 'brut', label: t('mk.form.brut') }, { value: 'transforme', label: t('mk.form.transforme') }]} />}</Field>
          <Field label={t('common.department')}>{(p) => <Select {...p} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        </div>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('mk.show.empty')} icon="tag">{t(canPublish ? 'mk.show.emptyWriter' : 'mk.show.emptyHelp')}</EmptyState></div>}>
          {(d) => <div className="grid-fit" style={{ '--min': '300px' } as React.CSSProperties}>{d.map((s) => <Product key={s.id} s={s} admin={user?.role === 'admin_maep'} />)}</div>}
        </QueryState>
      </div>
      {adding && <PublishDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function Product({ s, admin }: { s: Showcase; admin: boolean }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const place = usePlaceName();
  const out = useWithdraw();
  return (
    <Card title={s.name} sub={`${s.company} · ${place(s.department)}`} actions={<Badge tone={s.form === 'brut' ? 'neutral' : 'ok'} icon={false}>{t(`mk.form.${s.form}`)}</Badge>}>
      <div className="stack" style={gap(8)}>
        <p className="small"><b>{vcName(s.value_chain)}</b>{s.price_xof_per_kg ? <> · {t('mk.show.price', { price: fmtNum(s.price_xof_per_kg) })}</> : <> · <span className="muted">{t('mk.show.noPrice')}</span></>}</p>
        {s.description && <p className="small">{s.description}</p>}
        <p className="small"><span className="muted">{t('mk.show.contact')}</span> {s.contact}</p>
        <FormError error={out.error} />
        {(s.is_mine || admin) && <div className="cluster"><Button variant="ghost" busy={out.isPending} onClick={() => out.mutate(s.id, { onSuccess: () => toast(t('mk.show.withdrawn')) })}>{t('mk.show.withdraw')}</Button></div>}
      </div>
    </Card>
  );
}

function PublishDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const vc = useVcSelect();
  const m = usePublish();
  const [v, setV] = useState({ company: '', name: '', description: '', value_chain: '', form: 'transforme' as Form, price: '', department: user?.department ?? '', contact: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const err = (k: string, server = k) => errs[k] ?? fieldError(m.error, server); // erreur du navigateur d'abord, sinon celle du serveur
  return (
    <Dialog open onClose={onClose} title={t('mk.show.add')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-show" busy={m.isPending}>{t('mk.show.publish')}</Button></>}>
      <form id="f-show" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        const price = v.price ? Number(v.price) : null;
        if (v.company.trim().length < 2) er.company = t('mk.show.errCompany');
        if (v.name.trim().length < 2) er.name = t('mk.show.errName');
        if (!v.value_chain) er.value_chain = t('mk.show.errChain');
        if (!v.department) er.department = t('mk.show.errDepartment');
        if (price !== null && (!Number.isInteger(price) || price < 1 || price > PRICE_MAX)) er.price = t('mk.show.errPrice', { max: fmtNum(PRICE_MAX) });
        if (v.contact.trim().length < 3) er.contact = t('mk.show.errContact');
        setErrs(er);
        if (Object.keys(er).length) return;
        m.mutate({ company: v.company.trim(), name: v.name.trim(), description: v.description.trim(), value_chain: v.value_chain, form: v.form, price_xof_per_kg: price, department: v.department, contact: v.contact.trim() },
          { onSuccess: () => { toast(t('mk.show.published')); onClose(); } });
      }}>
        <Field label={t('mk.show.company')} error={err('company')}>{(p) => <Input {...p} value={v.company} maxLength={150} onChange={(e) => setV({ ...v, company: e.target.value })} />}</Field>
        <Field label={t('mk.show.name')} error={err('name')}>{(p) => <Input {...p} value={v.name} maxLength={150} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <div className="form-grid">
          <Field label={t('common.valueChain')} error={err('value_chain')}>{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder={t('common.choose')} options={vc.options} groups={vc.groups} />}</Field>
          <Field label={t('common.department')} error={err('department')}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        </div>
        <fieldset className="fieldset">
          <legend className="label">{t('mk.prices.form')}</legend>
          <div className="cluster" style={gap(10)}>
            {(['brut', 'transforme'] as Form[]).map((f) => <Radio key={f} name="show-form" className="choice-card" checked={v.form === f} onChange={() => setV({ ...v, form: f })} label={<b>{t(`mk.form.${f}`)}</b>} />)}
          </div>
        </fieldset>
        <Field label={t('mk.show.priceLabel')} optional error={err('price', 'price_xof_per_kg')}>{(p) => <div className="input-group"><Input {...p} inputMode="numeric" className="input-num" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value.replace(/\D/g, '') })} /><span className="addon addon--end">FCFA/kg</span></div>}</Field>
        <Field label={t('mk.show.description')} optional>{(p) => <Textarea {...p} rows={3} maxLength={1000} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
        <Field label={t('mk.show.contactLabel')} error={err('contact')} hint={t('mk.show.contactHint')}>{(p) => <Input {...p} value={v.contact} maxLength={120} onChange={(e) => setV({ ...v, contact: e.target.value })} />}</Field>
        <Alert tone="info">{t('mk.show.visibility')}</Alert>
        <FormError error={m.error} />
      </form>
    </Dialog>
  );
}
