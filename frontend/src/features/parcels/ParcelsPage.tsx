import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import turfArea from '@turf/area';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Badge, Button, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, fmtNum } from '../../shared/ui';
import type { GeoPolygon, Parcel } from '../../shared/api/types';
import i18n from '../../i18n';
import { useCreateParcel, useParcels } from './api';

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

function DrawControl({ onDrawn }: { onDrawn: (g: GeoPolygon | null) => void }) {
  const map = useMap();
  useEffect(() => {
    applyDrawLocale();
    const items = new L.FeatureGroup();
    map.addLayer(items);
    const ctl = new L.Control.Draw({
      position: 'topright',
      draw: { polygon: { allowIntersection: false, showArea: false }, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false },
      edit: { featureGroup: items, remove: true },
    });
    map.addControl(ctl);
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
      map.removeControl(ctl); map.removeLayer(items);
    };
  }, [map, onDrawn]);
  return null;
}

// Les messages sont des clés de traduction : Field les traduit à l'affichage.
const schema = z.object({
  name: z.string().trim().min(1, 'parcels.errName'),
  land_type: z.string().min(1, 'parcels.errLandType'),
  tenure: z.string().min(1, 'parcels.errTenure'),
});

export function ParcelsPage() {
  const { t } = useTranslation();
  const q = useParcels();
  const create = useCreateParcel();
  const [geom, setGeom] = useState<GeoPolygon | null>(null);
  const [geomErr, setGeomErr] = useState('');
  const [result, setResult] = useState<Parcel | 'queued' | null>(null);
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { land_type: '', tenure: '' } });
  const preview = geom ? turfArea({ type: 'Feature', properties: {}, geometry: geom }) / 10000 : null;

  const onSubmit = f.handleSubmit(async (v) => {
    if (!geom) { setGeomErr(t('parcels.errGeom')); return; }
    try {
      const r = await create.mutateAsync({ ...v, land_type: v.land_type as Parcel['land_type'], tenure: v.tenure as Parcel['tenure'], geometry: geom });
      setResult(r);
      f.reset();
    } catch { /* affiché */ }
  });

  return (
    <>
      <PageHeader title={t('nav.parcels')} listen={t('parcels.listen')} />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-[min(420px,50vh)] min-h-[240px] overflow-hidden rounded border border-border" aria-label={t('parcels.mapLabel')} role="region">
          <MapContainer center={[11.298, 2.438]} zoom={14} className="h-full w-full">
            <TileLayer attribution={`&copy; ${t('parcels.mapContributors')} <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <DrawControl onDrawn={(g) => { setGeom(g); setGeomErr(''); setResult(null); }} />
            {q.data?.map((p) => <GeoJSON key={p.id} data={p.geometry} style={{ color: p.overlap_warning ? '#8A5A00' : '#1F5B3A', weight: 2 }} />)}
          </MapContainer>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
          <h2 className="text-xl font-semibold">{t('parcels.new')}</h2>
          <p aria-live="polite">
            <Trans i18nKey="parcels.area" values={{ value: preview === null ? t('parcels.drawFirst') : t('parcels.ha', { n: fmtNum(preview, 2) }) }} components={{ b: <strong /> }} />
            {preview !== null && <span className="block text-sm text-muted">{t('parcels.previewNote')}</span>}
          </p>
          {geomErr && <p role="alert" className="text-sm text-error">{geomErr}</p>}
          <Field label={t('parcels.name')} error={f.formState.errors.name?.message}>
            {(p) => <input {...p} {...f.register('name')} className={inputCls} />}
          </Field>
          <Field label={t('parcels.landTypeLabel')} error={f.formState.errors.land_type?.message}>
            {(p) => <Select {...p} {...f.register('land_type')} placeholder={t('common.choose')} options={LAND_TYPES.map((v) => ({ value: v, label: t(`parcels.landType.${v}`) }))} />}
          </Field>
          <Field label={t('parcels.tenureLabel')} error={f.formState.errors.tenure?.message}>
            {(p) => <Select {...p} {...f.register('tenure')} placeholder={t('common.choose')} options={TENURES.map((v) => ({ value: v, label: t(`parcels.tenure.${v}`) }))} />}
          </Field>
          {create.error && <Notice tone="error" live>{create.error.message}</Notice>}
          <Button type="submit" busy={create.isPending}>{t('parcels.save')}</Button>
          <div aria-live="polite">
            {result === 'queued' && <Notice tone="warn">{t('parcels.queued')}</Notice>}
            {result && result !== 'queued' && (
              <Notice tone={result.overlap_warning ? 'warn' : 'success'}>
                <p><Trans i18nKey="parcels.saved" values={{ area: fmtNum(result.area_ha, 2) }} components={{ b: <strong /> }} /></p>
                {result.overlap_warning && <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden size={18} /> {t('parcels.overlap')}</p>}
                <p>{t('parcels.next')}</p>
              </Notice>
            )}
          </div>
        </form>
      </div>
      <h2 className="mb-2 mt-6 text-xl font-semibold">{t('parcels.list')}</h2>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('parcels.empty')}>{t('parcels.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="grid gap-2 md:grid-cols-2">
            {d.map((p) => (
              <li key={p.id} className="rounded border border-border bg-surface p-3">
                <p className="text-lg font-semibold">{p.name}</p>
                <p>{t('parcels.line', { area: fmtNum(p.area_ha, 2), landType: t(`parcels.landType.${p.land_type}`, p.land_type), tenure: t(`parcels.tenure.${p.tenure}`, p.tenure) })}</p>
                {p.overlap_warning && <Badge tone="warn">{t('parcels.overlapBadge')}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}
