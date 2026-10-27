import { useEffect } from 'react';
import L from 'leaflet';
import { GeoJSON, Marker, useMap } from 'react-leaflet';
import type { SatelliteParcel } from './api';
import { SHEET_PX, isWide } from './layout';

const still = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pin = (selected: boolean) => L.divIcon({ className: `sat-pin${selected ? ' is-sel' : ''}`, html: '<i></i>', iconSize: [28, 36], iconAnchor: [14, 34] });
const PIN = pin(false);
const PIN_SELECTED = pin(true);

/** Comme Google Maps : la carte glisse vers la parcelle choisie. Fermer la fiche ne bouge plus la vue. */
function Focus({ parcel }: { parcel: SatelliteParcel | undefined }) {
  const map = useMap();
  const id = parcel?.id;
  useEffect(() => {
    if (!parcel) return;
    // sur grand écran la fiche est dans le panneau de droite ; sur téléphone elle est un volet en bas : la parcelle reste au-dessus
    map.flyToBounds(L.geoJSON(parcel.geometry).getBounds(), {
      paddingTopLeft: [40, 70], paddingBottomRight: [40, isWide() ? 40 : SHEET_PX], maxZoom: 17, animate: !still(), duration: 0.8,
    });
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
