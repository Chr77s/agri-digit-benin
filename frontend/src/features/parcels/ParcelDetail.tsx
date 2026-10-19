import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Card, EmptyState, Icon, PageHeader, QueryState, Timeline, buttonCls, fmtDate, fmtNum } from '../../shared/ui';
import type { GeoPolygon, Parcel } from '../../shared/api/types';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { StageBar } from '../producers/producerKit';
import { moistureLevel, ndviLevel, useSatellite } from '../satellite/api';
import { useCampaigns, useParcels } from './api';
import { MAP_CENTER, OSM, osmAttribution } from './ParcelsPage';

/** Sommets du contour, sans le point de fermeture (identique au premier). */
export const vertices = (g: GeoPolygon) => {
  const ring = g.coordinates[0] ?? [];
  const last = ring[ring.length - 1];
  return ring.length > 1 && last[0] === ring[0][0] && last[1] === ring[0][1] ? ring.slice(0, -1) : ring;
};

function FitBounds({ geometry }: { geometry: GeoPolygon }) {
  const map = useMap();
  useEffect(() => {
    const b = L.geoJSON(geometry).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
  }, [map, geometry]);
  return null;
}

export function ParcelDetail({ id }: { id: string }) {
  const { t } = useTranslation();
  const q = useParcels();
  const crumbs = [{ label: t('nav.home'), to: '/' }, { label: t('nav.parcels'), to: '/parcelles' }];
  return (
    <QueryState q={q}>
      {(d) => {
        const p = d.find((x) => x.id === id);
        if (!p) {
          return (
            <>
              <PageHeader title={t('parcels.notFound')} crumbs={crumbs} />
              <div className="card">
                <EmptyState icon="map-pin" title={t('parcels.notFound')} action={<Link className={buttonCls({ variant: 'secondary' })} to="/parcelles">{t('parcels.backList')}</Link>}>
                  {t('parcels.notFoundText')}
                </EmptyState>
              </div>
            </>
          );
        }
        return <Detail p={p} crumbs={[...crumbs, { label: p.name }]} />;
      }}
    </QueryState>
  );
}

function Detail({ p, crumbs }: { p: Parcel; crumbs: { label: string; to?: string }[] }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  const vcName = useVcName();
  const camps = useCampaigns();
  const mine = (camps.data ?? []).filter((c) => c.parcel === p.id);
  const cur = mine[0];
  const pts = vertices(p.geometry);
  const commune = [place(user?.commune), place(user?.department)].filter(Boolean);
  return (
    <>
      <PageHeader title={p.name} crumbs={crumbs}
        desc={[cur ? t('parcels.detailCrop', { crop: vcName(cur.value_chain), stage: t(`stage.${cur.stage}`).toLowerCase() }) : t('parcels.noCampaign'), commune.join(', ')].filter(Boolean).join(' · ')}
        actions={<Link className={buttonCls()} to={`/campagnes?parcelle=${p.id}`}><Icon name="calendar" />{t('campaigns.open')}</Link>} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        {p.overlap_warning && <Alert tone="warn" title={t('parcels.overlapBadge')}>{t('parcels.overlapText')}</Alert>}
        <div className="split">
          <Card title={t('parcels.outline')} actions={<Badge tone="neutral">{t('parcels.osm')}</Badge>}>
            <div className="map" role="img" aria-label={t('parcels.outlineAlt', { area: fmtNum(p.area_ha, 2), n: pts.length })}>
              <MapContainer center={MAP_CENTER} zoom={15} className="map-canvas" scrollWheelZoom={false}>
                <TileLayer attribution={osmAttribution()} url={OSM} />
                <GeoJSON data={p.geometry} style={{ color: '#1F5A32', weight: 2.5, fillColor: '#6FA83A', fillOpacity: 0.35 }} />
                <FitBounds geometry={p.geometry} />
              </MapContainer>
              <div className="map-legend"><ul className="legend"><li><span className="sw sw--2" />{t('parcels.legendParcel')} · <span className="num">{t('parcels.ha', { n: fmtNum(p.area_ha, 2) })}</span></li></ul></div>
            </div>
            <details className="mt-2.5">
              <summary className="small flex min-h-touch cursor-pointer items-center font-bold">{t('parcels.seePoints', { count: pts.length })}</summary>
              <div className="table-scroll">
                <table className="coords num">
                  <caption className="sr-only">{t('parcels.pointsCaption')}</caption>
                  <thead><tr><th scope="col">{t('parcels.point')}</th><th scope="col">{t('parcels.lat')}</th><th scope="col">{t('parcels.lng')}</th></tr></thead>
                  <tbody>
                    {pts.map(([lng, lat], i) => (
                      <tr key={i}><td>{String.fromCharCode(65 + (i % 26))}{i >= 26 ? Math.floor(i / 26) : ''}</td><td>{fmtNum(lat, 5)}</td><td>{fmtNum(lng, 5)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>

          <div className="stack" style={{ ['--gap' as string]: '20px' }}>
            <Card title={t('parcels.sheet')} actions={p.overlap_warning ? <Badge tone="wait">{t('parcels.overlapBadge')}</Badge> : <Badge tone="ok">{t('parcels.noOverlap')}</Badge>}>
              <dl className="dl">
                <dt>{t('parcels.surface')}</dt><dd className="num">{t('parcels.ha', { n: fmtNum(p.area_ha, 2) })} <span className="small muted font-normal">{t('parcels.serverComputed')}</span></dd>
                <dt>{t('parcels.landTypeLabel')}</dt><dd>{t(`parcels.landType.${p.land_type}`, p.land_type)}</dd>
                {commune.length > 0 && <><dt>{t('common.commune')}</dt><dd>{commune.join(' (')}{commune.length > 1 ? ')' : ''}</dd></>}
                <dt>{t('parcels.overlapLabel')}</dt><dd>{p.overlap_warning ? t('parcels.overlapCount', { count: p.overlap_with.length || 1 }) : t('parcels.none')}</dd>
              </dl>
            </Card>
            <Card title={t('parcels.tenureLabel')}>
              <p><b>{t(`parcels.tenure.${p.tenure}`, p.tenure)}</b></p>
              <p className="small muted">{t('parcels.tenureText')}</p>
            </Card>
          </div>
        </div>

        <div className="grid-fit" style={{ ['--min' as string]: '340px' }}>
          <Card title={t('parcels.campaignsOn')} actions={<Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to="/campagnes">{t('parcels.manage')}<Icon name="chevron-right" /></Link>}>
            <QueryState q={camps} empty={() => mine.length === 0}
              emptyText={<EmptyState icon="calendar" title={t('parcels.noCampaignTitle')} action={<Link className={buttonCls()} to={`/campagnes?parcelle=${p.id}`}>{t('campaigns.open')}</Link>}>{t('parcels.noCampaignText')}</EmptyState>}>
              {() => (
                <Timeline items={mine.map((c) => ({
                  state: c.stage === 'recolte' ? 'done' : 'now',
                  time: t('campaigns.seasonLine', { season: c.season }),
                  title: `${vcName(c.value_chain)} · ${t(`stage.${c.stage}`).toLowerCase()}`,
                  text: <div className="mt-2"><StageBar stage={c.stage} /></div>,
                }))} />
              )}
            </QueryState>
          </Card>
          <SatelliteCard />
        </div>
      </div>
    </>
  );
}

/** Indices du département (le serveur ne calcule pas encore par parcelle) : données simulées, étiquetées. */
function SatelliteCard() {
  const { t } = useTranslation();
  const q = useSatellite();
  const place = usePlaceName();
  return (
    <Card title={t('parcels.satTitle')} actions={<Badge tone="sim">{t('pr.simulated')}</Badge>}
      foot={<><span className="small muted">{t('parcels.satScope')}</span><Link className={buttonCls({ variant: 'secondary', size: 'sm' })} to="/satellite">{t('parcels.satMore')}</Link></>}>
      <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<p className="muted">{t('satellite.empty')}</p>}>
        {(d) => {
          const r = d.results[0];
          return (
            <>
              <p>
                {r.ndvi === null ? t('common.notAvailable') : <><b className="num">{fmtNum(r.ndvi, 2)}</b> · {t(`satellite.ndviLevel.${ndviLevel(r.ndvi)}`)}</>}
                {' '}<span className="small muted">{t('parcels.satDate', { date: fmtDate(r.acquired_at), place: place(r.department) })}</span>
              </p>
              {r.soil_moisture_pct !== null && (
                <p className="small muted mt-2">{t('parcels.satMoisture', { v: fmtNum(r.soil_moisture_pct, 1), level: t(`satellite.moistureLevel.${moistureLevel(r.soil_moisture_pct)}`) })}</p>
              )}
            </>
          );
        }}
      </QueryState>
    </Card>
  );
}
