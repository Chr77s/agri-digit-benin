import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import type { SatelliteData, SatellitePoint, SatelliteRow } from '../../shared/api/types';
import { Alert, Card, EmptyState, Field, PageHeader, QueryState, Select, Table, fmtDate, fmtNum } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import type { Basemap } from '../parcels/ParcelBasemaps';
import '../producers/producteur.css';
import { LayersPanel } from './LayersPanel';
import { ParcelCard } from './ParcelCard';
import { ParcelSearch } from './ParcelSearch';
import { SatelliteMap } from './SatelliteMap';
import { Timeline } from './Timeline';
import { ndmiLevel, ndviLevel, useSatellite, useSatelliteParcels, useSatelliteZones } from './api';
import { LOW_NDVI, indexRange, type IndexKind } from './scale';
import { hasWebGL } from './terrain';
import './satellite.css';
import './parcel-layer.css';

// three.js reste hors du chargement initial : le relief 3D n'est téléchargé qu'à la demande.
const Relief3D = lazy(() => import('./Relief3D'));

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const present = (x: number | null | undefined): x is number => typeof x === 'number';
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Barre en HTML/CSS ; la valeur et son interprétation sont aussi écrites en clair (la barre seule ne porte rien). */
function Bar({ pct, text, moist }: { pct: number; text: string; moist?: boolean }) {
  return (
    <span className="bar-cell">
      <span className={`meter${moist ? ' moist' : ''}`} aria-hidden><i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></span>
      <span className="num">{text}</span>
    </span>
  );
}

/** Console d'analyse : carte colorée par indice, couches à droite, frise des passages en bas. */
function Console({ d }: { d: SatelliteData }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const zones = useSatelliteZones();
  const { user } = useAuth();
  const parcels = useSatelliteParcels().data ?? [];
  const [kind, setKind] = useState<IndexKind>('ndvi');
  const [basemap, setBasemap] = useState<Basemap>('sentinel');
  const [showDeps, setShowDeps] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [parcelId, setParcelId] = useState('');
  const [selected, setSelected] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [relief, setRelief] = useState(false);
  const [reliefError, setReliefError] = useState(false);
  const canPlay = !reducedMotion();

  const codes = Object.keys(d.series);
  const single = codes.length === 1; // producteur ou agent : un seul département
  const total = codes.length ? d.series[codes[0]].length : 0;
  const index = picked ?? Math.max(0, total - 1);

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= total - 1) { setPlaying(false); return undefined; }
    const id = window.setTimeout(() => setPicked(index + 1), 1000);
    return () => window.clearTimeout(id);
  }, [playing, index, total]);

  const parcel = parcels.find((p) => p.id === parcelId);
  useEffect(() => {
    if (!parcelId) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setParcelId(''); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [parcelId]);

  const at = (code: string): SatellitePoint => d.series[code][Math.min(index, d.series[code].length - 1)];
  const vals = codes.map((code) => ({ code, v: at(code).ndvi })).filter((x): x is { code: string; v: number } => x.v !== null);
  const best = vals.reduce<typeof vals[number] | null>((a, x) => (!a || x.v > a.v ? x : a), null);
  const worst = vals.reduce<typeof vals[number] | null>((a, x) => (!a || x.v < a.v ? x : a), null);
  const avg = mean(vals.map((x) => x.v));
  const valid = mean(codes.map((c) => at(c).valid_pct).filter(present));
  const watch = vals.filter((x) => x.v < LOW_NDVI).sort((a, b) => a.v - b.v).map((x) => ({ code: x.code, name: place(x.code), ndvi: x.v }));
  const line: SatellitePoint[] = selected && d.series[selected] ? d.series[selected]
    : (codes.length ? d.series[codes[0]] : []).map((p, i) => {
      const col = (k: 'ndvi' | 'ndmi' | 'valid_pct') => mean(codes.map((c) => d.series[c][i]?.[k]).filter(present));
      return { from: p.from, to: p.to, ndvi: col('ndvi'), ndmi: col('ndmi'), valid_pct: col('valid_pct') };
    });

  const cloudy = t('satellite.cloudy');
  const onPlay = () => { if (!playing && index >= total - 1) setPicked(0); setPlaying((p) => !p); };
  return (
    <>
      <section className="sat-console" aria-labelledby="sat-title">
        <div className="sat-head">
          <h2 id="sat-title">{t('satellite.consoleTitle')}</h2>
          <dl className="sat-facts">
            <div><dt>{t('satellite.scope')}</dt><dd>{single ? place(codes[0]) : selected ? place(selected) : t('satellite.country')}</dd></div>
            <div><dt>{t(single ? 'satellite.kpi.meanDept' : 'satellite.kpi.mean')}</dt><dd className="num">{avg === null ? cloudy : fmtNum(avg, 2)}</dd></div>
            {best && worst && best.code !== worst.code && (
              <>
                <div><dt>{t('satellite.kpi.best')}</dt><dd>{place(best.code)} <span className="num">{fmtNum(best.v, 2)}</span></dd></div>
                <div><dt>{t('satellite.kpi.worst')}</dt><dd>{place(worst.code)} <span className="num">{fmtNum(worst.v, 2)}</span></dd></div>
              </>
            )}
            <div><dt>{t('satellite.kpi.valid')}</dt><dd className="num">{valid === null ? cloudy : `${fmtNum(valid, 0)} %`}</dd></div>
          </dl>
          {selected && !single && <button type="button" className="sat-toggle is-shown" onClick={() => setSelected('')}>{t('satellite.showAll')}</button>}
          <button type="button" className="sat-toggle" aria-expanded={drawer} aria-controls="sat-panel" onClick={() => setDrawer((o) => !o)}>{t('satellite.layers')}</button>
        </div>
        <div className="sat-body">
          <div className="sat-stage" role="region" aria-label={t('satellite.countryMapTitle')}>
            <SatelliteMap zones={zones.data} series={d.series} kind={kind} index={index} basemap={basemap} selected={selected}
              onSelect={setSelected} showDepartments={showDeps} name={place}
              parcels={parcels} showParcels={showParcels} selectedParcel={parcelId} onPickParcel={setParcelId} />
            {!relief && <ParcelSearch parcels={parcels} onPick={setParcelId} />}
            {!relief && parcel && <ParcelCard parcel={parcel} index={index} onClose={() => setParcelId('')} canOpenList={user?.role === 'producteur'} />}
            {relief && (
              <Suspense fallback={null}>
                <Relief3D zones={zones.data} series={d.series} kind={kind} index={index} onClose={() => setRelief(false)}
                  onError={() => { setRelief(false); setReliefError(true); }} />
              </Suspense>
            )}
          </div>
          <LayersPanel id="sat-panel" className={drawer ? 'is-open' : ''} basemap={basemap} onBasemap={setBasemap} kind={kind} onKind={setKind}
            showDepartments={showDeps} onToggleDepartments={() => setShowDeps((s) => !s)}
            showParcels={showParcels} onToggleParcels={parcels.length ? () => setShowParcels((s) => !s) : undefined} watch={watch} onSelect={setSelected}
            onRelief={hasWebGL() ? () => { setReliefError(false); setRelief(true); } : undefined} />
        </div>
        {reliefError && <p className="sat-note" role="status">{t('satellite.reliefError')}</p>}
        <Timeline points={line} index={index} onIndex={(i) => { setPicked(i); setPlaying(false); }} playing={playing} onPlay={onPlay} canPlay={canPlay} />
      </section>
      <p className="sat-credit">{d.simulated ? t('satellite.creditsContours') : t('satellite.credits')} {t('satellite.countryMapNote')}</p>
    </>
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
  const cloudy = t('satellite.cloudy');
  const where = (r: SatelliteRow) => (r.commune ? `${place(r.commune)} (${place(r.department)})` : place(r.department));
  const ndmiPct = (v: number) => ((v - indexRange('ndmi')[0]) / (indexRange('ndmi')[1] - indexRange('ndmi')[0])) * 100;
  return (
    <>
      <PageHeader title={t('nav.satellite')} desc={t('satellite.desc')} listen={t('satellite.listen')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.satellite') }]} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        {q.data && (q.data.simulated
          ? <Alert tone="demo" icon="satellite" title={t('satellite.banner')}><p className="small">{q.data.source}</p></Alert>
          : <Alert tone="info" icon="satellite" title={t('satellite.real')}>
            <p className="small">{t('satellite.bannerReal', { source: q.data.source, date: fmtDate(q.data.results.map((r) => r.acquired_at).sort().at(-1)) })}</p>
          </Alert>)}
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
                <Console d={d} />
                <div className={last ? 'split' : undefined}>
                  {last && (
                    <Card title={t('satellite.lastPass', { date: fmtDate(last.acquired_at), place: where(last) })}>
                      {last.ndvi === null ? <p>{cloudy}</p> : (
                        <>
                          <p><b className="num" style={{ fontSize: '1.75rem' }}>{fmtNum(last.ndvi, 2)}</b> <span className="muted">{t(`satellite.ndviLevel.${ndviLevel(last.ndvi)}`)}</span></p>
                          <div className="ndvi-scale mt-2.5" aria-hidden><i style={{ left: `${Math.min(100, Math.max(0, last.ndvi * 100))}%` }} /></div>
                          <div className="ndvi-ticks num" aria-hidden><span>0</span><span>0,25</span><span>0,5</span><span>0,75</span><span>1</span></div>
                        </>
                      )}
                      <p className="mt-3">
                        {last.ndmi === null ? t('satellite.ndmiNa')
                          : t('satellite.ndmiLine', { v: fmtNum(last.ndmi, 2), level: t(`satellite.ndmiLevel.${ndmiLevel(last.ndmi)}`) })}
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
                    render: (r) => (r.ndvi === null ? cloudy : <Bar pct={r.ndvi * 100} text={t('satellite.ndviCell', { v: fmtNum(r.ndvi, 2), level: t(`satellite.ndviLevel.${ndviLevel(r.ndvi)}`) })} />),
                    csv: (r) => (r.ndvi === null ? '' : String(r.ndvi)),
                  },
                  {
                    key: 'ndmi', label: t('satellite.moisture'),
                    render: (r) => (r.ndmi === null ? cloudy : <Bar moist pct={ndmiPct(r.ndmi)} text={t('satellite.ndmiCell', { v: fmtNum(r.ndmi, 2), level: t(`satellite.ndmiLevel.${ndmiLevel(r.ndmi)}`) })} />),
                    csv: (r) => (r.ndmi === null ? '' : String(r.ndmi)),
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
