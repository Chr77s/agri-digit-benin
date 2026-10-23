import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { useDepartments, usePlaceName, useVcName } from '../../shared/api/ref';
import { Alert, Badge, Button, Card, Checkbox, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Textarea, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

interface Pmea { id: string; name: string; services: string[]; value_chains: string[]; department: string; commune: string; contact_name: string; phone: string; description: string; verified: boolean; mine: boolean }
const SERVICES = ['transformation', 'intrants', 'mecanisation', 'stockage', 'commercialisation', 'conseil'];
const WRITERS = ['agent_atda', 'admin_maep', 'transformateur', 'distributeur', 'gestionnaire_cooperative'];
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Annuaire des PMEA de la zone : transformation, intrants, mécanisation, stockage, vente, conseil. */
export function PmeaPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  const vc = useVcName();
  const deps = useDepartments();
  const qc = useQueryClient();
  const staff = user?.role === 'agent_atda' || user?.role === 'admin_maep';
  const [department, setDepartment] = useState('');
  const [service, setService] = useState('');
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ['pmea', department, service], queryFn: () => api<{ results: Pmea[]; department: string | null }>(`/pmea?${new URLSearchParams({ ...(department ? { department } : {}), ...(service ? { service } : {}) })}`) });
  const verify = useMutation({ mutationFn: (id: string) => api(`/pmea/${id}/verify`, { method: 'POST', body: {} }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['pmea'] }); toast(t('pmea.verified')); } });
  return (
    <>
      <PageHeader title={t('pmea.title')} desc={t('pmea.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.pmea') }]} listen={t('pmea.desc')}
        actions={WRITERS.includes(user?.role ?? '') ? <Button icon="plus" onClick={() => setAdding(true)}>{t('pmea.add')}</Button> : undefined} />
      <div className="stack" style={gap(16)}>
        <div className="form-grid">
          <Field label={t('common.department')}>{(p) => <Select {...p} value={department || q.data?.department || ''} onChange={(e) => setDepartment(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <Field label={t('pmea.service')}>{(p) => <Select {...p} value={service} onChange={(e) => setService(e.target.value)} placeholder={t('common.all')} options={SERVICES.map((s) => ({ value: s, label: t(`pmea.services.${s}`) }))} />}</Field>
        </div>
        {verify.error && <Alert tone="danger" live>{verify.error.message}</Alert>}
        <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<div className="card"><EmptyState icon="building" title={t('pmea.empty')}>{t('pmea.emptyHelp')}</EmptyState></div>}>
          {(d) => (
            <div className="grid-fit" style={{ '--min': '280px' } as React.CSSProperties}>
              {d.results.map((p) => (
                <Card key={p.id} title={p.name} sub={[place(p.commune), place(p.department)].filter(Boolean).join(' · ')} actions={p.verified ? <Badge tone="ok">{t('pmea.isVerified')}</Badge> : <Badge tone="wait">{t('pmea.toVerify')}</Badge>}>
                  <div className="stack" style={gap(8)}>
                    <p className="small">{p.services.map((s) => t(`pmea.services.${s}`)).join(' · ')}</p>
                    {p.value_chains.length > 0 && <p className="small muted">{p.value_chains.map(vc).join(', ')}</p>}
                    {p.description && <p className="small">{p.description}</p>}
                    <p className="small">{p.contact_name ? `${p.contact_name} · ` : ''}<a href={`tel:${p.phone}`}>{p.phone}</a></p>
                    {staff && !p.verified && <div className="cluster"><Button size="sm" icon="check" busy={verify.isPending && verify.variables === p.id} onClick={() => verify.mutate(p.id)}>{t('pmea.verify')}</Button></div>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </QueryState>
      </div>
      {adding && <AddDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function AddDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const deps = useDepartments();
  const { user } = useAuth();
  const [v, setV] = useState({ name: '', services: [] as string[], department: user?.department ?? '', commune: '', contact: '', phone: '', description: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/pmea', { method: 'POST', body: { name: v.name.trim(), services: v.services, department: v.department, commune: v.commune, contact_name: v.contact, phone: v.phone, description: v.description } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['pmea'] }); toast(t('pmea.saved')); onClose(); },
  });
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  return (
    <Dialog open onClose={onClose} title={t('pmea.add')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-pmea" busy={m.isPending}>{t('common.save')}</Button></>}>
      <form id="f-pmea" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (v.name.trim().length < 2) er.name = t('pmea.errName');
        if (!v.services.length) er.services = t('pmea.errServices');
        if (!v.department) er.department = t('sch.errDepartment');
        if (!/^01\d{8}$/.test(v.phone)) er.phone = t('rec.errPhone');
        setErrs(er);
        if (!Object.keys(er).length) m.mutate();
      }}>
        <Field label={t('pmea.name')} error={errs.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <fieldset className="fieldset">
          <legend className="label">{t('pmea.servicesLegend')}</legend>
          {SERVICES.map((s) => <Checkbox key={s} label={t(`pmea.services.${s}`)} checked={v.services.includes(s)} onChange={(e) => setV({ ...v, services: e.target.checked ? [...v.services, s] : v.services.filter((x) => x !== s) })} />)}
          {errs.services && <p className="field-error">{errs.services}</p>}
        </fieldset>
        <div className="form-grid">
          <Field label={t('common.department')} error={errs.department}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <Field label={t('common.commune')} optional>{(p) => <Select {...p} value={v.commune} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
          <Field label={t('pmea.contact')} optional>{(p) => <Input {...p} value={v.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} />}</Field>
          <Field label={t('rec.phone')} error={errs.phone}>{(p) => <Input {...p} inputMode="numeric" maxLength={10} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value.replace(/\D/g, '') })} />}</Field>
        </div>
        <Field label={t('pmea.descriptionLabel')} optional>{(p) => <Textarea {...p} rows={3} maxLength={500} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
        <Alert tone="info" icon="info">{t('pmea.addHelp')}</Alert>
        {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      </form>
    </Dialog>
  );
}
