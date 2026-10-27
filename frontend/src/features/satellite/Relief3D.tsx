import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SatellitePoint, SatelliteZones } from '../../shared/api/types';
import { fmtNum } from '../../shared/ui';
import type { Basemap } from '../parcels/ParcelBasemaps';
import type { SatelliteParcel } from './api';
import { SHEET_PX, isWide } from './layout';
import { outlineCollection, parcelCollection, reliefStyle, zoneCollection } from './reliefStyle';
import type { IndexKind } from './scale';

maplibregl.setWorkerUrl(workerUrl); // sans cela, Vite ne trouve pas le worker de MapLibre ("Worker failed to load")

const HOME = { center: [2.3, 9.3] as [number, number], zoom: 6.3, pitch: 55, bearing: 0 };
const EXAGGERATION = 3; // le relief béninois est doux (658 m au plus) : on l'accentue pour qu'il se lise
const PARCEL_VIEW = { zoom: 14, pitch: 62 };
const still = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Camera { center: [number, number]; zoom: number; pitch: number; bearing: number }
interface Data { zones: SatelliteZones | undefined; series: Record<string, SatellitePoint[]>; kind: IndexKind; index: number; parcels: SatelliteParcel[]; selectedParcel: string }

interface Props extends Omit<Data, 'selectedParcel'> {
  basemap: Basemap;
  selectedParcel?: string;
  onPickParcel?: (id: string) => void;
  onClose: () => void;
  onError: () => void;
}

const setData = (map: maplibregl.Map, id: string, data: GeoJSON.GeoJSON) => (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data);

function pushData(map: maplibregl.Map, d: Data) {
  setData(map, 'zones', zoneCollection(d.zones, d.series, d.kind, d.index));
  setData(map, 'parcels', parcelCollection(d.parcels, d.selectedParcel));
  setData(map, 'outline', outlineCollection(d.parcels, d.selectedParcel));
}

/** Le pays (ou la parcelle choisie) en 3D : imagerie satellite sur le relief réel, indices et parcelles par-dessus. Chargé à la demande. */
export default function Relief3D({ zones, series, kind, index, basemap, parcels, selectedParcel = '', onPickParcel, onClose, onError }: Props) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loaded = useRef(false);
  const [exag, setExag] = useState(EXAGGERATION);
  const latest = useRef<Data & { exag: number }>({ zones, series, kind, index, parcels, selectedParcel, exag });
  latest.current = { zones, series, kind, index, parcels, selectedParcel, exag };
  const pick = useRef(onPickParcel);
  pick.current = onPickParcel;
  const fail = useRef(onError);
  fail.current = onError;

  const first = parcels.find((p) => p.id === selectedParcel);
  // dernière vue, gardée pour la retrouver quand le fond de carte change (la carte est alors recréée)
  const camera = useRef<Camera>(first ? { center: [first.lon, first.lat], bearing: 0, ...PARCEL_VIEW } : HOME);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: el, style: reliefStyle(basemap, latest.current.exag), ...camera.current, maxPitch: 80, attributionControl: { compact: true } });
    } catch (e) {
      console.warn('Relief 3D indisponible :', e); // sans WebGL : la carte 2D reste complète
      fail.current();
      return undefined;
    }
    mapRef.current = map;
    // appareil sans assez de mémoire graphique : retour à la 2D plutôt qu'un cadre vide
    const canvas = map.getCanvas();
    const onLost = () => { console.warn('Relief 3D : contexte WebGL perdu'); fail.current(); };
    canvas.addEventListener('webglcontextlost', onLost);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    // `load` tarde tant que des tuiles sont en attente : les sources de données existent dès que le style est chargé
    map.on('style.load', () => { loaded.current = true; pushData(map, latest.current); });
    map.on('moveend', () => { camera.current = { center: map.getCenter().toArray() as [number, number], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }; });
    map.on('click', 'parcels', (e) => { const id = e.features?.[0]?.properties?.id; if (id) pick.current?.(String(id)); });
    map.on('mouseenter', 'parcels', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'parcels', () => { map.getCanvas().style.cursor = ''; });
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost); // map.remove() libère lui-même le contexte : ce n'est pas une panne
      loaded.current = false; mapRef.current = null; map.remove();
    };
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded.current) pushData(map, latest.current);
  }, [zones, series, kind, index, parcels, selectedParcel]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded.current) map.setTerrain({ source: 'dem', exaggeration: exag });
  }, [exag]);

  // Comme en 2D : la caméra glisse vers la parcelle choisie. Fermer la fiche ne bouge plus la vue.
  useEffect(() => {
    const map = mapRef.current;
    const p = latest.current.parcels.find((x) => x.id === selectedParcel);
    if (!map || !p) return;
    // sur téléphone la fiche est un volet en bas : on décale le centre pour que la parcelle reste au-dessus
    map.flyTo({ center: [p.lon, p.lat], bearing: map.getBearing(), ...PARCEL_VIEW, padding: { top: 0, left: 0, right: 0, bottom: isWide() ? 0 : SHEET_PX }, duration: still() ? 0 : 1600 });
  }, [selectedParcel]);

  return (
    <div className="sat-relief-view" role="region" aria-label={t('satellite.relief')}>
      <div ref={host} className="sat-relief-host" />
      <label className="sat-relief-exag">
        <span>{t('satellite.reliefExag', { n: fmtNum(exag, 1) })}</span>
        <input type="range" min={1} max={6} step={0.5} value={exag} onChange={(e) => setExag(Number(e.target.value))} />
      </label>
      <button type="button" className="sat-relief-close" onClick={onClose}>{t('satellite.reliefClose')}</button>
    </div>
  );
}
