import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoJSON, Marker, useMap } from 'react-leaflet';
import type { SatelliteParcel } from './api';

const still = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pin = (selected: boolean) => L.divIcon({ className: `sat-pin${selected ? ' is-sel' : ''}`, html: '<i></i>', iconSize: [28, 36], iconAnchor: [14, 34] });
const PIN = pin(false);
const PIN_SELECTED = pin(true);

/** Comme Google Maps : la carte glisse vers la parcelle choisie (en laissant la place à la fiche) puis revient à la vue d'avant. */
function Focus({ parcel }: { parcel: SatelliteParcel | undefined }) {
  const map = useMap();
  const home = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const id = parcel?.id;
  useEffect(() => {
    const animate = !still();
    if (parcel) {
      home.current ??= { center: map.getCenter(), zoom: map.getZoom() };
      const wide = window.innerWidth >= 1024;
      map.flyToBounds(L.geoJSON(parcel.geometry).getBounds(), {
        paddingTopLeft: [wide ? 380 : 40, 60], paddingBottomRight: [40, wide ? 40 : 280], maxZoom: 17, animate, duration: 0.8,
      });
    } else if (home.current) {
      map.flyTo(home.current.center, home.current.zoom, { animate, duration: 0.8 });
      home.current = null;
    }
    // la dépendance est l'identifiant : un rechargement des données ne doit pas relancer le déplacement
  }, [id, map]);
  return null;
}

interface Props {
  parcels: SatelliteParcel[];
  selected: string;
  onPick: (id: string) => void;
  /** Faux : les marqueurs sont masqués, mais la mise au point sur une parcelle choisie par la recherche reste. */
  showMarkers: boolean;
}

/** Une épingle par parcelle (focus au clavier, Entrée pour choisir) et, pour la parcelle choisie, son contour. */
export function ParcelMarkers({ parcels, selected, onPick, showMarkers }: Props) {
  const current = parcels.find((p) => p.id === selected);
  return (
    <>
      <Focus parcel={current} />
      {showMarkers && parcels.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lon]} icon={p.id === selected ? PIN_SELECTED : PIN} title={`${p.name} · ${p.producer}`}
          zIndexOffset={p.id === selected ? 1000 : 0} eventHandlers={{ click: () => onPick(p.id) }} />
      ))}
      {current && (
        <GeoJSON key={current.id} data={current.geometry} interactive={false}
          style={{ color: '#F3C54A', weight: 3, fillColor: '#F3C54A', fillOpacity: 0.18 }} />
      )}
    </>
  );
}
