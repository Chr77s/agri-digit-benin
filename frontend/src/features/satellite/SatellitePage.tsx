import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import type { SatelliteRow } from '../../shared/api/types';
import { Alert, Card, EmptyState, Field, PageHeader, QueryState, Select, Table, fmtDate, fmtNum } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import '../producers/producteur.css';
import { moistureLevel, ndviLevel, useSatellite } from './api';

/** Barre en HTML/CSS ; la valeur et son interprétation sont aussi écrites en clair (la barre seule ne porte rien). */
function Bar({ pct, text, moist }: { pct: number; text: string; moist?: boolean }) {
  return (
    <span className="bar-cell">
      <span className={`meter${moist ? ' moist' : ''}`} aria-hidden><i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></span>
      <span className="num">{text}</span>
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
  const where = (r: SatelliteRow) => (r.commune ? `${place(r.commune)} (${place(r.department)})` : place(r.department));
  return (
    <>
      <PageHeader title={t('nav.satellite')} desc={t('satellite.desc')} listen={t('satellite.listen')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.satellite') }]} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Alert tone="demo" icon="satellite" title={t('satellite.banner')}>
          {q.data?.source && <p className="small">{q.data.source}</p>}
        </Alert>
        {canFilter && (
          <div className="w-full sm:w-64">
            <Field label={t('common.department')}>
              {(p) => <Select {...p} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}
            </Field>
          </div>
        )}
        <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<div className="card"><EmptyState icon="satellite" title={t('satellite.empty')}>{t('satellite.emptyHelp')}</EmptyState></div>}>
          {(d) => {
            const last = d.results.length === 1 ? d.results[0] : undefined;
            return (
              <>
                <div className={last ? 'split' : undefined}>
                  {last && (
                    <Card title={t('satellite.lastPass', { date: fmtDate(last.acquired_at), place: where(last) })}>
                      {last.ndvi === null ? <p>{na}</p> : (
                        <>
                          <p><b className="num" style={{ fontSize: '1.75rem' }}>{fmtNum(last.ndvi, 2)}</b> <span className="muted">{t(`satellite.ndviLevel.${ndviLevel(last.ndvi)}`)}</span></p>
                          <div className="ndvi-scale mt-2.5" aria-hidden><i style={{ left: `${Math.min(100, Math.max(0, last.ndvi * 100))}%` }} /></div>
                          <div className="ndvi-ticks num" aria-hidden><span>0</span><span>0,25</span><span>0,5</span><span>0,75</span><span>1</span></div>
                        </>
                      )}
                      <p className="mt-3">
                        {last.soil_moisture_pct === null ? t('satellite.moistureNa')
                          : t('satellite.moistureLine', { v: fmtNum(last.soil_moisture_pct, 1), level: t(`satellite.moistureLevel.${moistureLevel(last.soil_moisture_pct)}`) })}
                      </p>
                    </Card>
                  )}
                  <Card tone="tint" title={t('satellite.howTo')}><p className="small">{t('satellite.explain')}</p></Card>
                </div>
                <Table<SatelliteRow> title={t('satellite.passes')} caption={t('nav.satellite')} rowKey={(r) => `${r.department}/${r.commune ?? ''}`} data={d.results} pageSize={12} exportName="satellite" columns={[
                  { key: 'department', label: t('satellite.zone'), render: (r) => <span className="cell-main">{where(r)}</span>, csv: (r) => where(r) },
                  { key: 'acquired_at', label: t('satellite.acquired'), render: (r) => <span className="num">{fmtDate(r.acquired_at)}</span> },
                  {
                    key: 'ndvi', label: t('satellite.ndvi'),
                    render: (r) => (r.ndvi === null ? na : <Bar pct={r.ndvi * 100} text={t('satellite.ndviCell', { v: fmtNum(r.ndvi, 2), level: t(`satellite.ndviLevel.${ndviLevel(r.ndvi)}`) })} />),
                  },
                  {
                    key: 'soil_moisture_pct', label: t('satellite.moisture'),
                    render: (r) => (r.soil_moisture_pct === null ? na : <Bar moist pct={r.soil_moisture_pct} text={t('satellite.moistureCell', { v: fmtNum(r.soil_moisture_pct, 1), level: t(`satellite.moistureLevel.${moistureLevel(r.soil_moisture_pct)}`) })} />),
                  },
                  { key: 'sensor', label: t('satellite.sensor') },
                ]} />
              </>
            );
          }}
        </QueryState>
      </div>
    </>
  );
}
