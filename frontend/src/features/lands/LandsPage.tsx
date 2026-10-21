import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import { usePlaceName } from '../../shared/api/ref';
import type { LandUse, Paginated, SoilAnalysis, SoilSummary } from '../../shared/api/types';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, QueryState, Select, Table, Tabs, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useParcels } from '../parcels/api';
import { useProducers } from '../producers/api';

const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;
const FINDING_TONE = { ok: 'ok', attention: 'wait', alerte: 'bad' } as const;
const TEXTURES = ['sableux', 'limoneux', 'argileux', 'equilibre'];

/** Sols et terres : utilisation des terres (disponible, exploitable, exploitée) et analyses de sol de chaque parcelle. */
export function LandsPage() {
  const { t } = useTranslation();
  const role = useAuth().user?.role;
  const [tab, setTab] = useState('use');
  const producer = role === 'producteur';
  return (
    <>
      <PageHeader title={t('land.title')} desc={t('land.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.lands') }]} />
      <Tabs label={t('land.title')} value={tab} onChange={setTab} tabs={[
        { id: 'use', label: t(producer ? 'land.tab.mine' : 'land.tab.use'), content: producer ? <MyParcels /> : <LandUseTab /> },
        { id: 'soil', label: t('land.tab.soil'), content: <SoilTab /> },
      ]} />
    </>
  );
}

function LandUseTab() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const [season, setSeason] = useState('');
  const q = useQuery({ queryKey: ['land-use', season], queryFn: () => api<LandUse>(`/land-use${season ? `?season=${encodeURIComponent(season)}` : ''}`) });
  return (
    <QueryState q={q}>
      {(d) => (
        <div className="stack" style={gap(20)}>
          <Field label={t('land.season')}>{(p) => <Select {...p} value={season || d.season || ''} onChange={(e) => setSeason(e.target.value)} options={d.seasons.map((s) => ({ value: s, label: s }))} placeholder={t('land.noSeason')} />}</Field>
          {d.parcels.length === 0
            ? <div className="card"><EmptyState icon="parcel" title={t('land.emptyUse')}>{t('land.emptyUseHelp')}</EmptyState></div>
            : <Table<LandUse['parcels'][number]> title={t('land.useParcels')} caption={t('land.useParcels')} data={d.parcels} rowKey={(r) => r.department + r.land_type} exportName="utilisation-des-terres" columns={[
              { key: 'department', label: t('common.department'), render: (r) => place(r.department), csv: (r) => r.department },
              { key: 'land_type', label: t('land.landType'), render: (r) => t(`land.type.${r.land_type}`), csv: (r) => r.land_type },
              { key: 'count', label: t('land.count'), num: true },
              { key: 'available_ha', label: t('land.available'), num: true, render: (r) => fmtNum(r.available_ha, 1) },
              { key: 'arable_ha', label: t('land.arable'), num: true, render: (r) => fmtNum(r.arable_ha, 1) },
              { key: 'used_ha', label: t('land.used'), num: true, render: (r) => fmtNum(r.used_ha, 1) },
              { key: 'rate', label: t('land.rate'), num: true, render: (r) => (r.arable_ha ? `${fmtNum((100 * r.used_ha) / r.arable_ha)} %` : '—'), csv: (r) => (r.arable_ha ? r.used_ha / r.arable_ha : '') },
            ]} />}
          {d.schemes.length > 0 && (
            <Table<LandUse['schemes'][number]> title={t('land.useSchemes')} caption={t('land.useSchemes')} data={d.schemes} rowKey={(r) => r.kind} columns={[
              { key: 'kind', label: t('land.landType'), render: (r) => t(`sch.kind.${r.kind}`), csv: (r) => r.kind },
              { key: 'count', label: t('land.count'), num: true },
              { key: 'available_ha', label: t('land.available'), num: true, render: (r) => fmtNum(r.available_ha, 1) },
              { key: 'arable_ha', label: t('land.arable'), num: true, render: (r) => fmtNum(r.arable_ha, 1) },
              { key: 'used_ha', label: t('land.used'), num: true, render: (r) => fmtNum(r.used_ha, 1) },
            ]} />
          )}
          <p className="hint">{t('land.useHelp')}</p>
        </div>
      )}
    </QueryState>
  );
}

/** Producteur : la superficie mesurée est celle du tracé ; il déclare ce qui est réellement cultivable. */
function MyParcels() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useParcels();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: ({ id, v }: { id: string; v: string }) => api(`/parcels/${id}`, { method: 'PATCH', body: { arable_ha: v === '' ? null : Number(v) } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['parcels'] }); toast(t('land.arableSaved')); },
  });
  return (
    <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="parcel" title={t('land.noParcels')}>{t('land.noParcelsHelp')}</EmptyState></div>}>
      {(d) => (
        <div className="stack" style={gap(14)}>
          {save.error && <Alert tone="danger" live>{save.error.message}</Alert>}
          {d.map((p) => (
            <Card key={p.id} title={p.name} sub={t(`land.type.${p.land_type}`)}>
              <div className="stack" style={gap(10)}>
                <p className="small">{t('land.measured', { n: fmtNum(p.area_ha, 2) })}</p>
                <form className="cluster" style={{ alignItems: 'flex-end' }} noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ id: p.id, v: draft[p.id] ?? (p.arable_ha == null ? '' : String(p.arable_ha)) }); }}>
                  <Field label={t('land.arableDeclared')} hint={t('land.arableHint')}>{(f) => <div className="input-group"><Input {...f} inputMode="decimal" className="input-num" value={draft[p.id] ?? (p.arable_ha == null ? '' : String(p.arable_ha))} onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} /><span className="addon addon--end">ha</span></div>}</Field>
                  <Button type="submit" variant="secondary" busy={save.isPending && save.variables?.id === p.id}>{t('common.save')}</Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </QueryState>
  );
}

function SoilTab() {
  const { t } = useTranslation();
  const role = useAuth().user?.role ?? '';
  const staff = ['agent_atda', 'admin_maep', 'responsable_programme', 'auditeur_copil'].includes(role);
  const q = useQuery({ queryKey: ['soil'], queryFn: async () => rows(await api<Paginated<SoilAnalysis>>('/soil-analyses')), enabled: role === 'producteur' || role === 'agent_atda' || role === 'admin_maep' });
  return (
    <div className="stack" style={gap(20)}>
      {(role === 'agent_atda' || role === 'admin_maep') && <SoilForm />}
      {staff && <SoilSummaryTable />}
      {q.isSuccess || q.isLoading || q.isError ? (
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="layers" title={t('land.noSoil')}>{t('land.noSoilHelp')}</EmptyState></div>}>
          {(d) => <div className="stack" style={gap(14)}>{d.map((a) => <SoilCard key={a.id} a={a} />)}</div>}
        </QueryState>
      ) : null}
    </div>
  );
}

function SoilCard({ a }: { a: SoilAnalysis }) {
  const { t } = useTranslation();
  return (
    <Card title={t('land.soilOf', { parcel: a.parcel_name })} sub={[fmtDate(a.sampled_on), a.laboratory].filter(Boolean).join(' · ')}>
      <div className="stack" style={gap(10)}>
        <p className="small">{t('land.values', { ph: fmtNum(a.ph, 1), om: fmtNum(a.organic_matter_pct, 1), p: a.phosphorus_ppm == null ? '—' : fmtNum(a.phosphorus_ppm, 0), texture: a.texture ? t(`land.texture.${a.texture}`) : '—' })}</p>
        <ul className="stack" style={{ ...gap(8), listStyle: 'none', padding: 0 }}>
          {a.findings.map((f) => <li key={f.code}><Badge tone={FINDING_TONE[f.level]}>{t(`land.level.${f.level}`)}</Badge> <span className="small">{f.text}</span></li>)}
        </ul>
        <p className="hint">{a.reference}</p>
      </div>
    </Card>
  );
}

function SoilSummaryTable() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const q = useQuery({ queryKey: ['soil-summary'], queryFn: async () => rows(await api<Paginated<SoilSummary>>('/soil-analyses/summary')) });
  const pct = (v: number | null) => (v === null ? '—' : `${fmtNum(100 * v)} %`);
  if (q.data?.length === 0) return null;
  return (
    <QueryState q={q}>
      {(d) => (
        <Table<SoilSummary> title={t('land.soilSummary')} caption={t('land.soilSummary')} data={d} rowKey={(r) => r.department} exportName="analyses-de-sol" columns={[
          { key: 'department', label: t('common.department'), render: (r) => place(r.department), csv: (r) => r.department },
          { key: 'analyses', label: t('land.analyses'), num: true },
          { key: 'ph_mean', label: t('land.phMean'), num: true, render: (r) => fmtNum(r.ph_mean, 1) },
          { key: 'acid_share', label: t('land.acidShare'), num: true, render: (r) => pct(r.acid_share), csv: (r) => r.acid_share },
          { key: 'low_organic_share', label: t('land.lowOrganic'), num: true, render: (r) => pct(r.low_organic_share), csv: (r) => r.low_organic_share },
          { key: 'low_phosphorus_share', label: t('land.lowPhosphorus'), num: true, render: (r) => pct(r.low_phosphorus_share), csv: (r) => r.low_phosphorus_share },
        ]} />
      )}
    </QueryState>
  );
}

function SoilForm() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const producers = useProducers({ status: 'valide' });
  const [producer, setProducer] = useState('');
  const parcels = useParcels(producer || undefined);
  const empty = { parcel: '', date: new Date().toISOString().slice(0, 10), lab: '', ph: '', om: '', p: '', texture: '' };
  const [v, setV] = useState(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/soil-analyses', { method: 'POST', body: { parcel: v.parcel, sampled_on: v.date, laboratory: v.lab, ph: Number(v.ph), organic_matter_pct: Number(v.om), ...(v.p ? { phosphorus_ppm: Number(v.p) } : {}), texture: v.texture } }),
    onSuccess: () => { setV(empty); void qc.invalidateQueries({ queryKey: ['soil'] }); void qc.invalidateQueries({ queryKey: ['soil-summary'] }); toast(t('land.soilSaved')); },
  });
  const dec = (k: 'ph' | 'om' | 'p', label: string, err?: string) => (
    <Field label={label} error={err} optional={k === 'p'}>{(p) => <Input {...p} inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} />}</Field>
  );
  return (
    <form noValidate className="card stack" style={gap(16)} aria-labelledby="h-soil" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (!v.parcel) er.parcel = t('land.errParcel');
      if (!(Number(v.ph) >= 3 && Number(v.ph) <= 10)) er.ph = t('land.errPh');
      if (v.om === '' || Number(v.om) < 0) er.om = t('land.errOm');
      setErrs(er);
      if (!Object.keys(er).length) m.mutate();
    }}>
      <div className="card-head m-0"><h2 className="card-title" id="h-soil">{t('land.addSoil')}</h2></div>
      <div className="form-grid">
        <Field label={t('common.producer')}>{(p) => <Select {...p} value={producer} onChange={(e) => { setProducer(e.target.value); setV({ ...v, parcel: '' }); }} placeholder={t('common.choose')} options={(producers.data ?? []).map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />}</Field>
        <Field label={t('land.parcel')} error={errs.parcel}>{(p) => <Select {...p} value={v.parcel} onChange={(e) => setV({ ...v, parcel: e.target.value })} placeholder={t('common.choose')} options={producer ? (parcels.data ?? []).map((x) => ({ value: x.id, label: x.name })) : []} />}</Field>
        <Field label={t('land.sampledOn')}>{(p) => <Input {...p} type="date" max={new Date().toISOString().slice(0, 10)} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />}</Field>
        <Field label={t('land.lab')} optional>{(p) => <Input {...p} value={v.lab} onChange={(e) => setV({ ...v, lab: e.target.value })} />}</Field>
        {dec('ph', t('land.ph'), errs.ph)}
        {dec('om', t('land.om'), errs.om)}
        {dec('p', t('land.p'))}
        <Field label={t('land.textureLabel')} optional>{(p) => <Select {...p} value={v.texture} onChange={(e) => setV({ ...v, texture: e.target.value })} placeholder={t('common.choose')} options={TEXTURES.map((x) => ({ value: x, label: t(`land.texture.${x}`) }))} />}</Field>
      </div>
      {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      <div className="cluster justify-end"><Button type="submit" busy={m.isPending}>{t('land.saveSoil')}</Button></div>
    </form>
  );
}
