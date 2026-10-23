import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import type { ClimateRisks, DepartmentClimate, Paginated, ParcelClimate, RiskLevel } from '../../shared/api/types';
import { Alert, Badge, Card, EmptyState, Field, PageHeader, QueryState, Select, Table, fmtDateTime, fmtNum } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useProducers } from '../producers/api';

const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;
const TONE = { faible: 'ok', moyen: 'wait', eleve: 'bad' } as const;
const KINDS = ['stress_hydrique', 'secheresse', 'inondation'] as const;

function Level({ level }: { level: RiskLevel }) {
  const { t } = useTranslation();
  return <Badge tone={TONE[level]}>{t(`clim.level.${level}`)}</Badge>;
}

function detail(t: (k: string, o?: Record<string, unknown>) => string, kind: (typeof KINDS)[number], r: ClimateRisks['risks']) {
  if (kind === 'stress_hydrique') return t('clim.detail.stress', { rain: fmtNum(r.stress_hydrique.rain_mm), need: fmtNum(r.stress_hydrique.need_mm) });
  if (kind === 'secheresse') return t('clim.detail.dry', { days: r.secheresse.dry_days });
  return t('clim.detail.flood', { mm: fmtNum(r.inondation.max_3d_mm) });
}

function Source({ d }: { d: { source: string; simulated: boolean; updated_at?: string } }) {
  const { t } = useTranslation();
  return <p className="hint">{d.simulated ? <Badge tone="sim">{t('clim.simulated')}</Badge> : null} {d.source}{d.updated_at ? ` · ${fmtDateTime(d.updated_at)}` : ''}</p>;
}

function Risks({ d }: { d: ClimateRisks }) {
  const { t } = useTranslation();
  return (
    <div className="stack" style={gap(12)}>
      <ul className="grid-fit" style={{ '--min': '200px', listStyle: 'none', padding: 0 } as React.CSSProperties}>
        {KINDS.map((k) => (
          <li key={k} className="card">
            <p className="label">{t(`clim.kind.${k}`)}</p>
            <Level level={d.risks[k].level} />
            <p className="small mt-1">{detail(t, k, d.risks)}</p>
          </li>
        ))}
      </ul>
      {d.advice.length > 0 && <Alert tone="warn" title={t('clim.adviceTitle')}><ul>{d.advice.map((a) => <li key={a}>{a}</li>)}</ul></Alert>}
    </div>
  );
}

/** Risques climatiques (stress hydrique, sécheresse, inondation) : bilan hydrique sur la pluie des 14 derniers jours et la prévision. */
export function ClimatePage() {
  const { t } = useTranslation();
  const role = useAuth().user?.role ?? '';
  return (
    <>
      <PageHeader title={t('clim.title')} desc={t('clim.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.climate') }]} listen={t('clim.desc')} />
      <div className="stack" style={gap(20)}>
        {role === 'producteur' ? <ParcelRisks /> : <>
          <DepartmentRisks />
          {(role === 'agent_atda' || role === 'admin_maep') && <ProducerRisks />}
        </>}
        <Alert tone="info" icon="info">{t('clim.method')}</Alert>
      </div>
    </>
  );
}

function ParcelList({ q }: { q: { isLoading: boolean; isError: boolean; error: unknown; data: ParcelClimate[] | undefined; refetch: () => unknown } }) {
  const { t } = useTranslation();
  const vc = useVcName();
  return (
    <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="cloud-sun" title={t('clim.empty')}>{t('clim.emptyHelp')}</EmptyState></div>}>
      {(d) => (
        <div className="stack" style={gap(16)}>
          {d.map((p) => (
            <Card key={p.parcel} title={p.name} sub={[p.value_chain ? vc(p.value_chain) : '', t(`clim.stage.${p.stage}`)].filter(Boolean).join(' · ')}>
              <Risks d={p} />
              <Source d={p} />
            </Card>
          ))}
        </div>
      )}
    </QueryState>
  );
}

function ParcelRisks() {
  const q = useQuery({ queryKey: ['climate'], queryFn: async () => rows(await api<Paginated<ParcelClimate>>('/climate-risks')) });
  return <ParcelList q={q} />;
}

function ProducerRisks() {
  const { t } = useTranslation();
  const producers = useProducers({ status: 'valide' });
  const [id, setId] = useState('');
  const q = useQuery({ queryKey: ['climate', id], enabled: !!id, queryFn: async () => rows(await api<Paginated<ParcelClimate>>(`/climate-risks?producer=${id}`)) });
  return (
    <div className="stack" style={gap(14)}>
      <h2 className="section-title">{t('clim.byProducer')}</h2>
      <Field label={t('common.producer')}>{(p) => <Select {...p} value={id} onChange={(e) => setId(e.target.value)} placeholder={t('common.choose')} options={(producers.data ?? []).map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />}</Field>
      {id && <ParcelList q={q} />}
    </div>
  );
}

function DepartmentRisks() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const q = useQuery({ queryKey: ['climate-departments'], queryFn: async () => rows(await api<Paginated<DepartmentClimate>>('/climate-risks/departments')) });
  return (
    <QueryState q={q}>
      {(d) => (
        <div className="stack" style={gap(8)}>
          <Table<DepartmentClimate> title={t('clim.byDepartment')} caption={t('clim.byDepartment')} data={d} rowKey={(r) => r.department} pageSize={12} exportName="risques-climatiques" columns={[
            { key: 'department', label: t('common.department'), render: (r) => <><span className="cell-main">{place(r.department)}</span><span className="cell-sub">{t('clim.parcels', { count: r.parcels })}</span></>, csv: (r) => r.department },
            ...KINDS.map((k) => ({ key: k, label: t(`clim.kind.${k}`), render: (r: DepartmentClimate) => <Level level={r.risks[k].level} />, csv: (r: DepartmentClimate) => r.risks[k].level })),
            { key: 'source', label: t('common.source'), render: (r: DepartmentClimate) => (r.simulated ? <Badge tone="sim">{t('clim.simulated')}</Badge> : <span className="small">{t('clim.real')}</span>), csv: (r: DepartmentClimate) => r.source },
          ]} />
          <p className="hint">{t('clim.departmentHelp')}</p>
        </div>
      )}
    </QueryState>
  );
}
