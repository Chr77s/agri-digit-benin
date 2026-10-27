import { useEffect } from 'react';
import { GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import type { SatellitePoint, SatelliteZones } from '../../shared/api/types';
import { fmtNum } from '../../shared/ui';
import { BASEMAPS, type Basemap } from '../parcels/ParcelBasemaps';
import { ndmiLevel, ndviLevel, type SatelliteParcel } from './api';
import { ParcelMarkers } from './ParcelMarkers';
import { indexColor, type IndexKind } from './scale';

const BENIN_BOUNDS: [[number, number], [number, number]] = [[6.2, 0.7], [12.4, 3.9]];

function FitBenin() {
  const map = useMap();
  useEffect(() => { map.fitBounds(BENIN_BOUNDS, { padding: [12, 12] }); }, [map]);
  return null;
}

interface Props {
  zones: SatelliteZones | undefined;
  series: Record<string, SatellitePoint[]>;
  kind: IndexKind;
  index: number;
  basemap: Basemap;
  selected: string;
  onSelect: (code: string) => void;
  showDepartments: boolean;
  name: (code: string) => string;
  parcels?: SatelliteParcel[];
  showParcels?: boolean;
  selectedParcel?: string;
  onPickParcel?: (id: string) => void;
}

/** Carte plein cadre : un fond réel, et les départements colorés par l'indice du passage choisi. */
export function SatelliteMap({ zones, series, kind, index, basemap, selected, onSelect, showDepartments, name, parcels = [], showParcels = true, selectedParcel = '', onPickParcel }: Props) {
  const { t } = useTranslation();
  const tile = BASEMAPS.find((b) => b.key === basemap) ?? BASEMAPS[0];
  const { key: tileKey, ...tileProps } = tile;
  return (
    <MapContainer center={[9.3, 2.3]} zoom={6} className="sat-map" scrollWheelZoom={false}>
      <TileLayer key={tileKey} {...tileProps} />
      <FitBenin />
      {showDepartments && zones?.features.map((f) => {
        const code = f.properties.code;
        const pts = series[code];
        const v = pts ? (pts[Math.min(index, pts.length - 1)]?.[kind] ?? null) : null;
        const label = name(code);
        const level = v === null ? '' : t(`satellite.${kind}Level.${(kind === 'ndvi' ? ndviLevel : ndmiLevel)(v)}`);
        return (
          <GeoJSON key={`${code}-${kind}-${index}-${selected === code}-${basemap}`} data={f}
            style={{ fillColor: indexColor(kind, v), fillOpacity: pts ? 0.72 : 0.04, color: selected === code ? '#F3C54A' : '#0A2415', weight: selected === code ? 3 : 1 }}
            eventHandlers={{ click: () => pts && onSelect(code) }}>
            <Tooltip sticky>{!pts ? label : v === null ? t('satellite.tooltipCloudy', { name: label }) : t('satellite.tooltip', { name: label, v: fmtNum(v, 2), level })}</Tooltip>
          </GeoJSON>
        );
      })}
      <ParcelMarkers parcels={parcels} selected={selectedParcel} showMarkers={showParcels} onPick={(id) => onPickParcel?.(id)} />
    </MapContainer>
  );
}
