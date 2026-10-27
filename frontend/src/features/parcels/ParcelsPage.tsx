import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import turfArea from '@turf/area';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Chips, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Table, buttonCls, fmtNum, useIsMobile } from '../../shared/ui';
import type { GeoPolygon, Parcel } from '../../shared/api/types';
import { useVcName } from '../../shared/api/ref';
import i18n from '../../i18n';
import { ListenGhost } from '../producers/producerKit';
import { useCampaigns, useCreateParcel, useParcels } from './api';
import { ParcelBasemaps } from './ParcelBasemaps';
import { ParcelDetail } from './ParcelDetail';
import { GpsTrace } from './GpsTrace';
import { DrawBar, type DrawApi } from './DrawBar';
import { MapFinder } from './MapFinder';
import { fitPoints, ringOf } from './shape';
import './gps.css';
import './newparcel.css';

const BENIN: [number, number] = [9.3, 2.3];

export const LAND_TYPES = ['pluvial_plateau', 'bas_fond', 'irrigue'] as const;
export const TENURES = ['propriete', 'location', 'pret', 'coutumier', 'autre'] as const;

// Libellés de leaflet-draw dans la langue courante (les autres textes restent ceux de la bibliothèque). Appelé à chaque création de la barre d'outils.
function applyDrawLocale() {
  const t = (key: string): string => i18n.t(key);
  L.drawLocal.draw.toolbar.buttons.polygon = t('parcels.draw.polygon');
  L.drawLocal.draw.toolbar.actions.text = t('common.cancel');
  L.drawLocal.draw.toolbar.finish.text = t('parcels.draw.finish');
  L.drawLocal.draw.toolbar.undo.text = t('parcels.draw.undo');
  L.drawLocal.draw.handlers.polygon.tooltip = { start: t('parcels.draw.start'), cont: t('parcels.draw.cont'), end: t('parcels.draw.end') };
  L.drawLocal.edit.toolbar.buttons.edit = t('parcels.draw.edit');
  L.drawLocal.edit.toolbar.buttons.remove = t('parcels.draw.remove');
  L.drawLocal.edit.toolbar.actions.save.text = t('parcels.draw.validate');
  L.drawLocal.edit.toolbar.actions.cancel.text = t('common.cancel');
}

interface DrawProps { onDrawn: (g: GeoPolygon | null) => void; onDrawing: (on: boolean) => void; api: MutableRefObject<DrawApi | null> }

function DrawControl({ onDrawn, onDrawing, api }: DrawProps) {
  const map = useMap();
  useEffect(() => {
    applyDrawLocale();
    const items = new L.FeatureGroup();
    map.addLayer(items);
    // le contour se trace avec les gros boutons de DrawBar ; la barre de leaflet-draw ne garde que modifier et supprimer
    const ctl = new L.Control.Draw({
      position: 'topright',
      draw: { polygon: false, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false },
      edit: { featureGroup: items, remove: true },
    });
    map.addControl(ctl);
    const poly = new L.Draw.Polygon(map as L.DrawMap, { allowIntersection: false, showArea: false }); // le typage de leaflet-draw attend ce type, la carte est la même
    api.current = {
      start: () => { items.clearLayers(); onDrawn(null); poly.enable(); },
      finish: () => poly.completeShape(),
      undo: () => poly.deleteLastVertex(),
      cancel: () => poly.disable(),
      clear: () => { poly.disable(); items.clearLayers(); onDrawn(null); },
    };
    const started = () => onDrawing(true);
    const stopped = () => onDrawing(false);
    map.on(L.Draw.Event.DRAWSTART, started);
    map.on(L.Draw.Event.DRAWSTOP, stopped);
    const created = (e: L.LeafletEvent) => {
      items.clearLayers();
      const layer = (e as L.DrawEvents.Created).layer as L.Polygon;
      items.addLayer(layer);
      onDrawn((layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>).geometry as GeoPolygon);
    };
    const edited = () => {
      const l = items.getLayers()[0] as L.Polygon | undefined;
      onDrawn(l ? ((l.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>).geometry as GeoPolygon) : null);
    };
    map.on(L.Draw.Event.CREATED, created);
    map.on(L.Draw.Event.EDITED, edited);
    map.on(L.Draw.Event.DELETED, edited);
    return () => {
      map.off(L.Draw.Event.CREATED, created); map.off(L.Draw.Event.EDITED, edited); map.off(L.Draw.Event.DELETED, edited);
      map.off(L.Draw.Event.DRAWSTART, started); map.off(L.Draw.Event.DRAWSTOP, stopped);
      poly.disable(); api.current = null;
      map.removeControl(ctl); map.removeLayer(items);
    };
  }, [map, onDrawn, onDrawing, api]);
  return null;
}

/** Vue de départ : les parcelles déjà tracées, sinon tout le Bénin. Plus reprise une fois que l'utilisateur a choisi sa vue. */
function InitialView({ parcels, placed }: { parcels: Parcel[]; placed: MutableRefObject<boolean> }) {
  const map = useMap();
  const n = parcels.length;
  useEffect(() => {
    const lock = () => { placed.current = true; };
    map.on('dragstart', lock);
    return () => { map.off('dragstart', lock); };
  }, [map, placed]);
  useEffect(() => {
    if (placed.current) return;
    if (n) map.fitBounds(L.geoJSON(parcels.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: p.geometry }))).getBounds(), { maxZoom: 16, padding: [30, 30] });
    else map.setView(BENIN, 7);
    // seul le nombre de parcelles compte : un rechargement des mêmes données ne doit pas déplacer la carte
  }, [map, n]);
  return null;
}

// Les messages sont des clés de traduction : Field les traduit à l'affichage.
const schema = z.object({
  name: z.string().trim().min(1, 'parcels.errName'),
  land_type: z.string().min(1, 'parcels.errLandType'),
  tenure: z.string().min(1, 'parcels.errTenure'),
});

/** /parcelles : carte, formulaire et liste ; /parcelles?parcelle=<id> : fiche d'une parcelle ; /parcelles?tracer=1 : mesure en marchant. */
export function ParcelsPage() {
  const [params] = useSearchParams();
  const mobile = useIsMobile();
  const id = params.get('parcelle');
  if (params.get('tracer')) return <GpsTrace />;
  return id ? <ParcelDetail id={id} /> : mobile ? <MobileParcels /> : <ParcelsList />;
}

/** Vignette du contour d'une parcelle. */
export function ParcelThumb({ p }: { p: Parcel }) {
  const xy = fitPoints(ringOf(p.geometry), 56, 56, 6);
  return <svg className="parcel-thumb" viewBox="0 0 56 56" aria-hidden><path d={xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z'} /></svg>;
}

/** Sous 640 px (maquette mobile « Mes parcelles ») : une carte par champ, et la mesure en marchant. */
function MobileParcels() {
  const { t } = useTranslation();
  const q = useParcels();
  const camps = useCampaigns();
  const vcName = useVcName();
  const total = (q.data ?? []).reduce((s, p) => s + p.area_ha, 0);
  return (
    <>
      <PageHeader title={t('nav.parcels')} desc={q.data ? t('gps.listSub', { count: q.data.length, area: fmtNum(total, 1) }) : undefined} />
      <div className="stack" style={{ ['--gap' as string]: '14px' }}>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="parcel" title={t('parcels.empty')}>{t('parcels.emptyHelp')}</EmptyState></div>}>
          {(d) => (
            <ul className="list card">
              {d.map((p) => {
                const c = camps.data?.find((x) => x.parcel === p.id);
                return (
                  <li key={p.id}>
                    <Link className="list-item" to={`/parcelles?parcelle=${p.id}`}>
                      <ParcelThumb p={p} />
                      <span className="li-main">
                        <span className="li-title">{p.name}</span>
                        <span className="li-meta num">{t('parcels.ha', { n: fmtNum(p.area_ha, 1) })}{c ? ` · ${vcName(c.value_chain)}, ${t(`stage.${c.stage}`).toLowerCase()}` : ''}</span>
                      </span>
                      {p.overlap_warning ? <Badge tone="wait">{t('parcels.overlapBadge')}</Badge> : <Badge tone="ok">{t(`parcels.tenure.${p.tenure}`, p.tenure)}</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryState>
        <p className="hint">{t('parcels.previewNote')}</p>
        <p className="small"><Icon name="map-pin" /> {t('gps.howTo')}</p>
        <div className="m-cta"><Link className={buttonCls({ block: true })} to="/parcelles?tracer=1"><Icon name="target" />{t('gps.measure')}</Link></div>
      </div>
    </>
  );
}

function ParcelsList() {
  const { t } = useTranslation();
  const q = useParcels();
  const count = q.data?.length;
  return (
    <>
      <PageHeader title={t('nav.parcels')} desc={t('parcels.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.parcels') }]}
        actions={<>
          <ListenGhost text={t('parcels.listen')} />
          {!!count && <a className={buttonCls({ variant: 'secondary' })} href="#t-liste"><Icon name="list-check" />{t('parcels.seeAll', { count })}</a>}
        </>} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <p className="small"><Icon name="map-pin" /> {t('gps.desktopHint')} <Link to="/parcelles?tracer=1">{t('gps.measure')}</Link></p>
        <NewParcel parcels={q.data ?? []} />
        <QueryState q={q} empty={(d) => d.length === 0}
          emptyText={<div className="card"><EmptyState icon="parcel" title={t('parcels.empty')}>{t('parcels.emptyHelp')}</EmptyState></div>}>
          {(d) => <ParcelTable data={d} />}
        </QueryState>
      </div>
    </>
  );
}

function NewParcel({ parcels }: { parcels: Parcel[] }) {
  const { t } = useTranslation();
  const create = useCreateParcel();
  const [geom, setGeom] = useState<GeoPolygon | null>(null);
  const [geomErr, setGeomErr] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const [drawing, setDrawing] = useState(false);
  const draw = useRef<DrawApi | null>(null);
  const placed = useRef(false); // vrai dès que l'utilisateur a choisi sa vue (recherche, position, déplacement)
  const [result, setResult] = useState<Parcel | 'queued' | null>(null);
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { land_type: '', tenure: '' } });
  // Fonction stable : sinon la barre de dessin est recréée (et le tracé effacé) à chaque rendu.
  const onDrawn = useCallback((g: GeoPolygon | null) => { setGeom(g); setGeomErr(false); setResult(null); }, []);
  const preview = geom ? turfArea({ type: 'Feature', properties: {}, geometry: geom }) / 10000 : null;

  const onSubmit = f.handleSubmit(async (v) => {
    if (!geom) { setGeomErr(true); return; }
    try {
      const r = await create.mutateAsync({ ...v, land_type: v.land_type as Parcel['land_type'], tenure: v.tenure as Parcel['tenure'], geometry: geom });
      setResult(r);
      f.reset();
    } catch { /* affiché */ }
  }, () => { if (!geom) setGeomErr(true); });

  return (
    <div className="stack" style={{ ['--gap' as string]: '16px' }}>
      <section aria-labelledby="t-carte">
        <h2 className="sr-only" id="t-carte">{t('parcels.mapLabel')}</h2>
        <DrawBar api={draw} drawing={drawing} hasShape={!!geom} />
        <div className="map np-map" role="region" aria-label={t('parcels.mapLabel')}>
          <MapContainer ref={setMap} center={BENIN} zoom={7} className="map-canvas">
            <ParcelBasemaps defaultLayer="satellite" />
            <DrawControl onDrawn={onDrawn} onDrawing={setDrawing} api={draw} />
            <InitialView parcels={parcels} placed={placed} />
            {parcels.map((p) => <GeoJSON key={p.id} data={p.geometry} style={{ color: p.overlap_warning ? '#B4532D' : '#016648', weight: 2, dashArray: p.overlap_warning ? '5 4' : undefined }} />)}
          </MapContainer>
          <MapFinder map={map} onNavigate={() => { placed.current = true; }} />
          <div className="map-legend">
            <ul className="legend">
              <li><span className="sw" />{t('parcels.legendSaved')}</li>
              <li><span className="sw sw--4" />{t('parcels.overlapBadge')}</li>
            </ul>
          </div>
        </div>
        <p className="hint mt-2.5">{t('parcels.mapHint')}</p>
        <p className="small muted mt-1">{t('parcels.basemap.note')}</p>
      </section>

      <form onSubmit={onSubmit} noValidate className="card np-form" aria-labelledby="t-nouvelle">
        <h2 className="card-title full" id="t-nouvelle">{t('parcels.new')}</h2>
        <div className="area-out full" aria-live="polite">
          <span className="muted">{t('parcels.areaLabel')}</span>
          <b className="num">{preview === null ? t('parcels.drawFirst') : t('parcels.ha', { n: fmtNum(preview, 2) })}</b>
          <span className="hint" style={{ flexBasis: '100%' }}>{t('parcels.previewNote')}</span>
        </div>
        {geomErr && <div className="full"><Alert tone="danger" live title={t('parcels.errGeomTitle')}>{t('parcels.errGeom')}</Alert></div>}
        <Field label={t('parcels.name')} error={f.formState.errors.name?.message}>
          {(p) => <Input {...p} {...f.register('name')} autoComplete="off" />}
        </Field>
        <Field label={t('parcels.landTypeLabel')} error={f.formState.errors.land_type?.message}>
          {(p) => <Select {...p} {...f.register('land_type')} placeholder={t('common.choose')} options={LAND_TYPES.map((v) => ({ value: v, label: t(`parcels.landType.${v}`) }))} />}
        </Field>
        <Field label={t('parcels.tenureLabel')} error={f.formState.errors.tenure?.message}>
          {(p) => <Select {...p} {...f.register('tenure')} placeholder={t('common.choose')} options={TENURES.map((v) => ({ value: v, label: t(`parcels.tenure.${v}`) }))} />}
        </Field>
        {create.error && <div className="full"><Alert tone="danger" live>{create.error.message}</Alert></div>}
        <div className="full"><Button type="submit" block icon="check" busy={create.isPending}>{t('parcels.save')}</Button></div>
        <p className="hint full">{t('parcels.offlineHint')}</p>
        <div className="full" aria-live="polite">
          {result === 'queued' && <Alert tone="warn" icon="wifi-off">{t('parcels.queued')}</Alert>}
          {result && result !== 'queued' && (
            <Alert tone={result.overlap_warning ? 'warn' : 'ok'} title={result.overlap_warning ? t('parcels.overlap') : undefined}>
              <p><Trans i18nKey="parcels.saved" values={{ area: fmtNum(result.area_ha, 2) }} components={{ b: <b className="num" /> }} /></p>
              <p>{t('parcels.nextPrefix')} <Link to={`/campagnes?parcelle=${result.id}`}>{t('parcels.nextLink')}</Link>.</p>
            </Alert>
          )}
        </div>
      </form>
    </div>
  );
}

type Row = Parcel & { crop: string };

function ParcelTable({ data }: { data: Parcel[] }) {
  const { t } = useTranslation();
  const camps = useCampaigns();
  const vcName = useVcName();
  const [filter, setFilter] = useState(['all']);
  const rows: Row[] = data.map((p) => {
    const c = camps.data?.find((x) => x.parcel === p.id);
    return { ...p, crop: c ? `${vcName(c.value_chain)} · ${t(`stage.${c.stage}`).toLowerCase()}` : '' };
  });
  const flagged = rows.filter((r) => r.overlap_warning).length;
  const shown = filter[0] === 'check' ? rows.filter((r) => r.overlap_warning) : rows;
  const total = data.reduce((s, p) => s + p.area_ha, 0);
  return (
    <div id="t-liste" className="stack" style={{ ['--gap' as string]: '8px' }}>
      <Table<Row> title={t('parcels.list')} caption={t('parcels.caption')} rowKey={(r) => r.id} data={shown}
        toolbar={<Chips single label={t('parcels.filter')} value={filter} onChange={setFilter}
          options={[{ value: 'all', label: t('common.allF'), count: rows.length }, { value: 'check', label: t('parcels.toCheck'), count: flagged }]} />}
        columns={[
          { key: 'name', label: t('parcels.colName'), render: (r) => <><span className="cell-main">{r.name}</span><span className="cell-sub">{t('parcels.gps')}</span></> },
          { key: 'crop', label: t('parcels.colCrop'), render: (r) => r.crop || <span className="muted">{t('parcels.noCampaign')}</span> },
          { key: 'area_ha', label: t('parcels.colArea'), num: true, render: (r) => fmtNum(r.area_ha, 2), csv: (r) => r.area_ha },
          { key: 'land_type', label: t('parcels.landTypeLabel'), render: (r) => t(`parcels.landType.${r.land_type}`, r.land_type) },
          { key: 'tenure', label: t('parcels.tenureLabel'), render: (r) => t(`parcels.tenure.${r.tenure}`, r.tenure) },
          { key: 'overlap_warning', label: t('parcels.colState'), render: (r) => (r.overlap_warning ? <Badge tone="wait">{t('parcels.overlapBadge')}</Badge> : <Badge tone="ok">{t('parcels.noOverlap')}</Badge>) },
          { key: 'open', label: t('ui.actions'), actions: true, render: (r) => <Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to={`/parcelles?parcelle=${r.id}`} aria-label={t('parcels.openNamed', { name: r.name })}>{t('parcels.open')}</Link> },
        ]} />
      <p className="small muted num">{t('parcels.total', { count: data.length, area: fmtNum(total, 2) })}</p>
    </div>
  );
}
