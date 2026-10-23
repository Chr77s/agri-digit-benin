import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import {
  Alert, Badge, Button, Card, Checkbox, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, QueryState, Select, Table,
  Textarea, fmtDate, fmtNum, toast, type Column,
} from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

interface Site { id: string; kind: string; name: string; department: string; lat: number; lon: number; capacity_t: number | null; equipment: string }
interface Lot { id: string; code: string; product: string; quantity_kg: number; status: 'en_stock' | 'transfere' | 'transforme'; site_name: string | null; parents: string[]; created_at: string }
interface Collectable { id: string; producer_code: string; value_chain: string; harvested_at: string; available_kg: number }
interface Trace { lot: string; origins: { lot: string; producer_code: string; commune: string; parcel: string; season: string; harvested_at: string; inputs: string[] }[]; steps: { code: string; product: string; quantity_kg: number; status: Lot['status']; holder_role: string; site: string | null }[] }

const HOLDERS = ['producteur', 'gestionnaire_cooperative', 'transformateur', 'distributeur'];
const KINDS = ['magasin', 'unite_transformation', 'point_vente', 'centre_semencier'];

function usePost<B>(url: string) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (b: B) => api(url, { method: 'POST', body: b }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['lots'] }); void qc.invalidateQueries({ queryKey: ['sites'] }); toast(t('trace.done')); },
  });
}

export function TracePage() {
  const { t } = useTranslation();
  const role = useAuth().user?.role ?? '';
  const holder = HOLDERS.includes(role);
  return (
    <>
      <PageHeader title={t('trace.title')} desc={t('trace.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.trace') }]} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Search />
        {holder && <Lots />}
        <Sites canAdd={holder} />
      </div>
    </>
  );
}

function Search() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card title={t('trace.search')}>
      <form className="cluster" onSubmit={(e) => { e.preventDefault(); if (code.trim()) setOpen(code.trim().toUpperCase()); }}>
        <Field label={t('trace.search')}>{(p) => <Input {...p} placeholder={t('trace.searchPh')} value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
        <Button type="submit" icon="search">{t('trace.go')}</Button>
      </form>
      {open && <TraceDialog code={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function TraceDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const q = useQuery({ queryKey: ['trace', code], queryFn: () => api<Trace>(`/lots/${encodeURIComponent(code)}/trace`), retry: false });
  return (
    <Dialog open onClose={onClose} title={t('trace.chainTitle', { code })}>
      {q.isError ? <Alert tone="warn">{t('trace.notFound')}</Alert> : (
        <QueryState q={q}>
          {(d) => (
            <div className="stack" style={{ ['--gap' as string]: '14px' }}>
              <section>
                <h3 className="card-title">{t('trace.origins')}</h3>
                {d.origins.map((o) => (
                  <div key={o.lot} className="mt-2">
                    <p>{t('trace.originLine', { code: o.producer_code, commune: place(o.commune), parcel: o.parcel, season: o.season, date: fmtDate(o.harvested_at) })}</p>
                    <p className="small muted">{o.inputs.length ? t('trace.inputs', { list: o.inputs.join(', ') }) : t('trace.noInputs')}</p>
                  </div>
                ))}
              </section>
              <section>
                <h3 className="card-title">{t('trace.steps')}</h3>
                <ol>
                  {d.steps.map((s) => (
                    <li key={s.code}><b className="num">{s.code}</b> · {t('trace.stepLine', { product: s.product, kg: fmtNum(s.quantity_kg), role: t(`market.role.${s.holder_role}`, s.holder_role), status: t(`trace.status.${s.status}`) })}{s.site ? ` · ${s.site}` : ''}</li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </QueryState>
      )}
    </Dialog>
  );
}

function Lots() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['lots'], queryFn: () => api<{ results: Lot[]; harvests: Collectable[] }>('/lots') });
  const sites = useQuery({ queryKey: ['sites'], queryFn: () => api<{ results: Site[] }>('/sites') });
  const [collect, setCollect] = useState<Collectable | null>(null);
  const [send, setSend] = useState<Lot | null>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [transform, setTransform] = useState(false);
  const siteOpts = [{ value: '', label: t('trace.noSite') }, ...(sites.data?.results ?? []).map((s) => ({ value: s.id, label: s.name }))];
  const cols: Column<Lot>[] = [
    { key: 'code', label: t('trace.col.code'), render: (l) => <b className="num">{l.code}</b> },
    { key: 'product', label: t('trace.col.product') },
    { key: 'quantity_kg', label: t('trace.col.qty'), num: true, render: (l) => fmtNum(l.quantity_kg) },
    { key: 'status', label: t('trace.col.status'), render: (l) => <Badge tone={l.status === 'en_stock' ? 'ok' : 'neutral'}>{t(`trace.status.${l.status}`)}</Badge> },
    { key: 'site_name', label: t('trace.col.site'), render: (l) => l.site_name ?? '—' },
    { key: 'parents', label: t('trace.col.from'), render: (l) => l.parents.join(', ') || '—' },
    { key: 'actions', label: t('trace.col.actions'), actions: true, render: (l) => (
      <>
        {l.status === 'en_stock' && <Button variant="ghost" size="sm" onClick={() => setSend(l)}>{t('trace.transfer')}</Button>}
        <Button variant="ghost" size="sm" onClick={() => setFollow(l.code)}>{t('trace.follow')}</Button>
      </>
    ) },
  ];
  return (
    <QueryState q={q}>
      {(d) => (
        <>
          {d.harvests.length > 0 && (
            <Card title={t('trace.toCollect')} sub={t('trace.toCollectHelp')}>
              <ul className="stack" style={{ ['--gap' as string]: '8px', listStyle: 'none', padding: 0 }}>
                {d.harvests.map((h) => (
                  <li key={h.id} className="between">
                    <span>{h.producer_code} · {h.value_chain} · {fmtDate(h.harvested_at)} · {t('trace.available', { kg: fmtNum(h.available_kg) })}</span>
                    <Button variant="secondary" size="sm" onClick={() => setCollect(h)}>{t('trace.collect')}</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title={t('trace.lots')} actions={d.results.some((l) => l.status === 'en_stock') && <Button variant="secondary" onClick={() => setTransform(true)}>{t('trace.transform')}</Button>}>
            {d.results.length === 0 ? <EmptyState title={t('trace.noLots')}>{t('trace.noLotsHelp')}</EmptyState>
              : <Table columns={cols} data={d.results} rowKey={(l) => l.id} caption={t('trace.lots')} exportName="lots" />}
          </Card>
          {collect && <QtyDialog title={t('trace.collect')} max={collect.available_kg} siteOpts={siteOpts} url="/lots/collect" extra={{ harvest: collect.id }} onClose={() => setCollect(null)} />}
          {send && <QtyDialog title={t('trace.transferTitle', { code: send.code })} max={send.quantity_kg} phone url={`/lots/${send.id}/transfer`} onClose={() => setSend(null)} />}
          {transform && <TransformDialog lots={d.results.filter((l) => l.status === 'en_stock')} siteOpts={siteOpts} onClose={() => setTransform(false)} />}
          {follow && <TraceDialog code={follow} onClose={() => setFollow(null)} />}
        </>
      )}
    </QueryState>
  );
}

function QtyDialog({ title, max, url, extra, phone, siteOpts, onClose }: { title: string; max: number; url: string; extra?: Record<string, string>; phone?: boolean; siteOpts?: { value: string; label: string }[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [qty, setQty] = useState(String(max));
  const [to, setTo] = useState('');
  const [site, setSite] = useState('');
  const m = usePost<Record<string, unknown>>(url);
  const body = { ...extra, quantity_kg: Number(qty), ...(phone ? { to_phone: to } : { site: site || null }) };
  return (
    <Dialog open onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button busy={m.isPending} onClick={() => m.mutate(body, { onSuccess: onClose })}>{t('trace.confirm')}</Button></>}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        {phone && <Field label={t('trace.toPhone')} hint={t('trace.toPhoneHint')}>{(p) => <Input {...p} inputMode="numeric" maxLength={10} value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, ''))} />}</Field>}
        <Field label={t('trace.quantity')}>{(p) => <Input {...p} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />}</Field>
        {siteOpts && <Field label={t('trace.site')}>{(p) => <Select {...p} options={siteOpts} value={site} onChange={(e) => setSite(e.target.value)} />}</Field>}
        {m.error && <ErrorState error={m.error} />}
      </div>
    </Dialog>
  );
}

function TransformDialog({ lots, siteOpts, onClose }: { lots: Lot[]; siteOpts: { value: string; label: string }[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<string[]>([]);
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('');
  const [site, setSite] = useState('');
  const m = usePost<Record<string, unknown>>('/lots/transform');
  return (
    <Dialog open onClose={onClose} title={t('trace.transformTitle')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button busy={m.isPending} disabled={!pick.length || !product.trim() || !Number(qty)} onClick={() => m.mutate({ parents: pick, product, quantity_kg: Number(qty), site: site || null }, { onSuccess: onClose })}>{t('trace.transform')}</Button></>}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <p className="muted">{t('trace.transformHelp')}</p>
        {lots.map((l) => <Checkbox key={l.id} label={`${l.code} · ${l.product} · ${fmtNum(l.quantity_kg)} kg`} checked={pick.includes(l.id)} onChange={(e) => setPick(e.target.checked ? [...pick, l.id] : pick.filter((x) => x !== l.id))} />)}
        <Field label={t('trace.product')}>{(p) => <Input {...p} placeholder={t('trace.productPh')} value={product} onChange={(e) => setProduct(e.target.value)} />}</Field>
        <Field label={t('trace.qtyOut')}>{(p) => <Input {...p} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />}</Field>
        <Field label={t('trace.site')}>{(p) => <Select {...p} options={siteOpts} value={site} onChange={(e) => setSite(e.target.value)} />}</Field>
        {m.error && <ErrorState error={m.error} />}
      </div>
    </Dialog>
  );
}

function Sites({ canAdd }: { canAdd: boolean }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const user = useAuth().user;
  const deps = useDepartments();
  const q = useQuery({ queryKey: ['sites'], queryFn: () => api<{ results: Site[] }>('/sites') });
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ kind: 'magasin', name: '', department: user?.department ?? '', lat: '', lon: '', capacity_t: '', equipment: '' });
  const m = usePost<Record<string, unknown>>('/sites');
  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => setV((x) => ({ ...x, lat: p.coords.latitude.toFixed(5), lon: p.coords.longitude.toFixed(5) })),
    () => toast({ type: 'error', text: t('trace.noGeo') }));
  const cols: Column<Site>[] = [
    { key: 'name', label: t('trace.name') },
    { key: 'kind', label: t('trace.kind.label'), render: (s) => t(`trace.kind.${s.kind}`) },
    { key: 'department', label: t('trace.department'), render: (s) => place(s.department), csv: (s) => place(s.department) },
    { key: 'lat', label: 'GPS', render: (s) => <span className="num">{s.lat.toFixed(4)}, {s.lon.toFixed(4)}</span> },
    { key: 'capacity_t', label: t('trace.capacity'), num: true, render: (s) => (s.capacity_t == null ? '—' : fmtNum(s.capacity_t)) },
  ];
  return (
    <Card title={t('trace.sites')} sub={t('trace.sitesHelp')} actions={canAdd && <Button icon="plus" variant="secondary" onClick={() => setOpen(true)}>{t('trace.addSite')}</Button>}>
      <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<p className="muted">{t('trace.noSites')}</p>}>
        {(d) => <Table columns={cols} data={d.results} rowKey={(s) => s.id} caption={t('trace.sites')} exportName="sites" />}
      </QueryState>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('trace.addSite')}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button busy={m.isPending} onClick={() => m.mutate({ ...v, lat: Number(v.lat), lon: Number(v.lon), capacity_t: v.capacity_t ? Number(v.capacity_t) : null }, { onSuccess: () => setOpen(false) })}>{t('trace.save')}</Button></>}>
        <div className="stack" style={{ ['--gap' as string]: '12px' }}>
          <Field label={t('trace.kind.label')}>{(p) => <Select {...p} options={KINDS.map((k) => ({ value: k, label: t(`trace.kind.${k}`) }))} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} />}</Field>
          <Field label={t('trace.name')}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
          <Field label={t('trace.department')}>{(p) => <Select {...p} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value })} />}</Field>
          <div className="cluster">
            <Field label={t('trace.lat')}>{(p) => <Input {...p} inputMode="decimal" value={v.lat} onChange={(e) => setV({ ...v, lat: e.target.value })} />}</Field>
            <Field label={t('trace.lon')}>{(p) => <Input {...p} inputMode="decimal" value={v.lon} onChange={(e) => setV({ ...v, lon: e.target.value })} />}</Field>
            <Button variant="ghost" icon="map-pin" onClick={locate}>{t('trace.myPosition')}</Button>
          </div>
          <Field label={t('trace.capacity')} optional>{(p) => <Input {...p} inputMode="decimal" value={v.capacity_t} onChange={(e) => setV({ ...v, capacity_t: e.target.value })} />}</Field>
          <Field label={t('trace.equipment')} optional>{(p) => <Textarea {...p} rows={2} value={v.equipment} onChange={(e) => setV({ ...v, equipment: e.target.value })} />}</Field>
          {m.error && <ErrorState error={m.error} />}
        </div>
      </Dialog>
    </Card>
  );
}
