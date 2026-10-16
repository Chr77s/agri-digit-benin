import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs } from '../../shared/api/client';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import type { SatelliteData, SatelliteRow } from '../../shared/api/types';
import { EmptyState, Field, fmtDate, fmtNum, Notice, PageHeader, QueryState, Select, Table } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

const useSatellite = (department: string) =>
  useQuery({ queryKey: ['satellite', department], queryFn: () => api<SatelliteData>(`/satellite${qs({ department })}`) });

// Repères de lecture indicatifs (démonstration), pas des seuils agronomiques officiels.
const ndviLevel = (v: number) => (v < 0.4 ? 'low' : v < 0.6 ? 'mid' : 'high');
const moistureLevel = (v: number) => (v < 20 ? 'low' : v < 30 ? 'mid' : 'high');

/** Barre en HTML/CSS ; la valeur et son interprétation sont aussi écrites en clair (la barre seule ne porte rien). */
function Bar({ pct, text }: { pct: number; text: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="block h-3 w-24 shrink-0 overflow-hidden rounded border border-border bg-bg">
        <span className="block h-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
      <span className="font-semibold">{text}</span>
    </span>
  );
}

export function SatellitePage() {
  const { t } = useTranslation();
  const deps = useDepartments();
  const place = usePlaceName();
  const { user } = useAuth();
  // Le serveur borne l'agent ATDA et le producteur à leur département : un filtre n'aurait aucun effet pour eux.
  const canFilter = user?.role !== 'agent_atda' && user?.role !== 'producteur';
  const [department, setDepartment] = useState('');
  const q = useSatellite(canFilter ? department : '');
  const na = t('common.notAvailable');
  return (
    <>
      <PageHeader title={t('nav.satellite')} />
      <div className="mb-4">
        <Notice tone="warn">
          <p className="font-semibold">{t('satellite.banner')}</p>
          {q.data && <p>{q.data.source}</p>}
        </Notice>
      </div>
      <p className="mb-4 max-w-2xl text-muted">{t('satellite.explain')}</p>
      {canFilter && (
        <div className="mb-4 w-full sm:w-64">
          <Field label={t('common.department')}>
            {(p) => <Select {...p} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}
          </Field>
        </div>
      )}
      <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<EmptyState title={t('satellite.empty')}>{t('satellite.emptyHelp')}</EmptyState>}>
        {(d) => (
          <Table<SatelliteRow> caption={t('nav.satellite')} rowKey={(r) => `${r.department}/${r.commune ?? ''}`} data={d.results} pageSize={12} exportName="satellite" columns={[
            { key: 'department', label: t('common.department'), render: (r) => <span className="font-semibold">{r.commune ? `${place(r.commune)} (${place(r.department)})` : place(r.department)}</span>, csv: (r) => place(r.department) },
            {
              key: 'ndvi', label: t('satellite.ndvi'),
              render: (r) => (r.ndvi === null ? na : <Bar pct={r.ndvi * 100} text={t('satellite.ndviCell', { v: fmtNum(r.ndvi, 2), level: t(`satellite.ndviLevel.${ndviLevel(r.ndvi)}`) })} />),
            },
            {
              key: 'soil_moisture_pct', label: t('satellite.moisture'),
              render: (r) => (r.soil_moisture_pct === null ? na : <Bar pct={r.soil_moisture_pct} text={t('satellite.moistureCell', { v: fmtNum(r.soil_moisture_pct, 1), level: t(`satellite.moistureLevel.${moistureLevel(r.soil_moisture_pct)}`) })} />),
            },
            { key: 'acquired_at', label: t('satellite.acquired'), render: (r) => fmtDate(r.acquired_at) },
            { key: 'sensor', label: t('satellite.sensor') },
          ]} />
        )}
      </QueryState>
    </>
  );
}
