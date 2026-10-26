import { LayersControl, TileLayer } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';

export const MAP_CENTER: [number, number] = [11.298, 2.438];

const OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const RELIEF = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const RELIEF_ATTRIBUTION = 'Données : &copy; OpenStreetMap contributors · relief : SRTM · style : <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>)';
const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Imagerie : &copy; Esri, Vantor, Earthstar Geographics et la communauté SIG';
const SENTINEL_2025 = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg';
const SENTINEL_ATTRIBUTION = 'Données Copernicus Sentinel-2 modifiées 2025 · &copy; EOX IT Services GmbH · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a> · <a href="https://cloudless.eox.at">EOxCloudless</a>';

type Basemap = 'street' | 'relief' | 'satellite' | 'sentinel';

export function ParcelBasemaps({ defaultLayer = 'street' }: { defaultLayer?: Basemap }) {
  const { t } = useTranslation();
  return (
    <LayersControl position="topleft">
      <LayersControl.BaseLayer checked={defaultLayer === 'street'} name={t('parcels.basemap.street')}>
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM} maxZoom={19} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={defaultLayer === 'relief'} name={t('parcels.basemap.relief')}>
        <TileLayer attribution={RELIEF_ATTRIBUTION} url={RELIEF} subdomains="abc" maxNativeZoom={17} maxZoom={19} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={defaultLayer === 'sentinel'} name={t('parcels.basemap.sentinel')}>
        <TileLayer attribution={SENTINEL_ATTRIBUTION} url={SENTINEL_2025} maxNativeZoom={18} maxZoom={19} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={defaultLayer === 'satellite'} name={t('parcels.basemap.satellite')}>
        <TileLayer attribution={SATELLITE_ATTRIBUTION} url={SATELLITE} maxZoom={19} />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}