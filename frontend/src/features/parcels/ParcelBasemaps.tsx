import { LayersControl, TileLayer } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';

export const MAP_CENTER: [number, number] = [11.298, 2.438];

export type Basemap = 'street' | 'relief' | 'satellite' | 'sentinel';

/** Fonds de carte en ligne. `key` est aussi la clé de traduction `parcels.basemap.<key>`. */
export const BASEMAPS: { key: Basemap; url: string; attribution: string; maxZoom: number; maxNativeZoom?: number; subdomains?: string }[] = [
  { key: 'street', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  { key: 'relief', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', subdomains: 'abc', maxNativeZoom: 17, maxZoom: 19,
    attribution: 'Données : &copy; OpenStreetMap contributors · relief : SRTM · style : <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>)' },
  { key: 'sentinel', url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg', maxNativeZoom: 18, maxZoom: 19,
    attribution: 'Données Copernicus Sentinel-2 modifiées 2025 · &copy; EOX IT Services GmbH · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a> · <a href="https://cloudless.eox.at">EOxCloudless</a>' },
  // Esri n'a plus d'image au niveau 19 (tuile grise « Map data not yet available », vérifié sur six zones du Bénin) : on agrandit le 18
  { key: 'satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxNativeZoom: 18, maxZoom: 19,
    attribution: 'Imagerie : &copy; Esri, Vantor, Earthstar Geographics et la communauté SIG' },
];

export function ParcelBasemaps({ defaultLayer = 'street' }: { defaultLayer?: Basemap }) {
  const { t } = useTranslation();
  return (
    <LayersControl position="topleft">
      {BASEMAPS.map(({ key, ...tile }) => (
        <LayersControl.BaseLayer key={key} checked={defaultLayer === key} name={t(`parcels.basemap.${key}`)}>
          <TileLayer {...tile} />
        </LayersControl.BaseLayer>
      ))}
    </LayersControl>
  );
}
