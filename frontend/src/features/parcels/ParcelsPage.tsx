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
import { Badge, Button, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, fmtNum } from '../../shared/ui';
import type { GeoPolygon, Parcel } from '../../shared/api/types';
import { useCreateParcel, useParcels } from './api';

export const LAND_TYPES = [
  { value: 'pluvial_plateau', label: 'Pluvial (plateau)' },
  { value: 'bas_fond', label: 'Bas-fond' },
  { value: 'irrigue', label: 'Irrigué' },
];
export const TENURES = [
  { value: 'propriete', label: 'Propriété' },
  { value: 'location', label: 'Location' },
  { value: 'pret', label: 'Prêt' },
  { value: 'coutumier', label: 'Droit coutumier' },
  { value: 'autre', label: 'Autre' },
];
const label = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

function DrawControl({ onDrawn }: { onDrawn: (g: GeoPolygon | null) => void }) {
  const map = useMap();
  useEffect(() => {
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

const schema = z.object({
  name: z.string().trim().min(1, 'Donnez un nom à la parcelle, par exemple « Champ du marigot ».'),
  land_type: z.string().min(1, 'Choisissez le type de terrain.'),
  tenure: z.string().min(1, 'Choisissez le statut foncier.'),
});

export function ParcelsPage() {
  const q = useParcels();
  const create = useCreateParcel();
  const [geom, setGeom] = useState<GeoPolygon | null>(null);
  const [geomErr, setGeomErr] = useState('');
  const [result, setResult] = useState<Parcel | 'queued' | null>(null);
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { land_type: '', tenure: '' } });
  const preview = geom ? turfArea({ type: 'Feature', properties: {}, geometry: geom }) / 10000 : null;

  const onSubmit = f.handleSubmit(async (v) => {
    if (!geom) { setGeomErr('Dessinez le contour de la parcelle sur la carte avec l’outil polygone (en haut à droite).'); return; }
    try {
      const r = await create.mutateAsync({ ...v, land_type: v.land_type as Parcel['land_type'], tenure: v.tenure as Parcel['tenure'], geometry: geom });
      setResult(r);
      f.reset();
    } catch { /* affiché */ }
  });

  return (
    <>
      <PageHeader title="Mes parcelles" listen="Mes parcelles. Dessinez votre champ sur la carte, puis donnez-lui un nom et enregistrez." />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-[420px] overflow-hidden rounded border border-border" aria-label="Carte de dessin de la parcelle" role="region">
          <MapContainer center={[11.298, 2.438]} zoom={14} className="h-full w-full">
            <TileLayer attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <DrawControl onDrawn={(g) => { setGeom(g); setGeomErr(''); setResult(null); }} />
            {q.data?.map((p) => <GeoJSON key={p.id} data={p.geometry} style={{ color: p.overlap_warning ? '#8A5A00' : '#1F5B3A', weight: 2 }} />)}
          </MapContainer>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
          <h2 className="text-xl font-semibold">Nouvelle parcelle</h2>
          <p aria-live="polite">
            Surface estimée : <strong>{preview === null ? 'dessinez la parcelle' : `${fmtNum(preview, 2)} ha`}</strong>
            {preview !== null && <span className="block text-sm text-muted">Aperçu. La surface officielle est recalculée par le serveur.</span>}
          </p>
          {geomErr && <p role="alert" className="text-sm text-error">{geomErr}</p>}
          <Field label="Nom de la parcelle" error={f.formState.errors.name?.message}>
            {(p) => <input {...p} {...f.register('name')} className={inputCls} />}
          </Field>
          <Field label="Type de terrain" error={f.formState.errors.land_type?.message}>
            {(p) => <Select {...p} {...f.register('land_type')} placeholder="Choisir" options={LAND_TYPES} />}
          </Field>
          <Field label="Statut foncier" error={f.formState.errors.tenure?.message}>
            {(p) => <Select {...p} {...f.register('tenure')} placeholder="Choisir" options={TENURES} />}
          </Field>
          {create.error && <Notice tone="error" live>{create.error.message}</Notice>}
          <Button type="submit" busy={create.isPending}>Enregistrer la parcelle</Button>
          <div aria-live="polite">
            {result === 'queued' && <Notice tone="warn">Pas de réseau : la parcelle est gardée sur ce téléphone et sera envoyée automatiquement.</Notice>}
            {result && result !== 'queued' && (
              <Notice tone={result.overlap_warning ? 'warn' : 'success'}>
                <p>Parcelle enregistrée : <strong>{fmtNum(result.area_ha, 2)} ha</strong> (surface calculée par le serveur).</p>
                {result.overlap_warning && <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden size={18} /> Cette parcelle chevauche une autre parcelle de plus de 20 %. Un agent vérifiera.</p>}
                <p>Suite : ouvrez une campagne dans « Mes campagnes ».</p>
              </Notice>
            )}
          </div>
        </form>
      </div>
      <h2 className="mb-2 mt-6 text-xl font-semibold">Parcelles enregistrées</h2>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune parcelle enregistrée.">Dessinez votre premier champ sur la carte ci-dessus.</EmptyState>}>
        {(d) => (
          <ul className="grid gap-2 md:grid-cols-2">
            {d.map((p) => (
              <li key={p.id} className="rounded border border-border bg-surface p-3">
                <p className="text-lg font-semibold">{p.name}</p>
                <p>{fmtNum(p.area_ha, 2)} ha, {label(LAND_TYPES, p.land_type)}, {label(TENURES, p.tenure)}</p>
                {p.overlap_warning && <Badge tone="warn">Chevauchement à vérifier</Badge>}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}
