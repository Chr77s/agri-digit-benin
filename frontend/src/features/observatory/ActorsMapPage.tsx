import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { api, qs } from '../../shared/api/client';
import { useDepartments, usePlaceName, useVcName, useVcSelect } from '../../shared/api/ref';
import { Alert, Badge, Card, EmptyState, Field, PageHeader, QueryState, Select, Table, fmtNum } from '../../shared/ui';
import i18n from '../../i18n';
import { useAuth } from '../auth/AuthContext';

interface ActorFeature {
  type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { layer: string; [k: string]: unknown };
}
interface LayerMeta { id: string; label: string; chain_filter: boolean; count: number | null; truncated?: boolean; not_placed?: number }
interface ActorsCollection { features: ActorFeature[]; layers: LayerMeta[]; filters: { department: string | null; value_chain: string | null } }

const CENTER: [number, number] = [9.3, 2.3]; // centre du Bénin
const OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = () => `&copy; ${i18n.t('parcels.mapContributors')} <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`;
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Couleur par couche, puis par type de site : la légende écrit chaque libellé, la couleur ne porte jamais le sens seule. */
const LAYER_COLOR: Record<string, string> = { sites: '#1F5A32', schemes: '#0E7490', organisations: '#BE185D', cooperatives: '#4D7C0F', parcels: '#6B7280', pmea: '#B91C1C', equipment: '#A16207' };
const SITE_COLOR: Record<string, string> = { magasin: '#1F5A32', unite_transformation: '#B45309', point_vente: '#1D4ED8', centre_semencier: '#7C3AED' };
const colorOf = (f: ActorFeature) => (f.properties.layer === 'sites' ? SITE_COLOR[String(f.properties.kind)] : undefined) ?? LAYER_COLOR[f.properties.layer] ?? '#374151';
const isCluster = (f: ActorFeature) => typeof f.properties.count === 'number';
const radiusOf = (f: ActorFeature) => (isCluster(f) ? 9 + Math.min(10, Math.sqrt(Number(f.properties.count)) * 2) : f.properties.layer === 'parcels' ? 4 : 8);

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (points.length > 0) map.fitBounds(points, { padding: [32, 32], maxZoom: 11 }); }, [map, points]);
  return null;
}

/** Carte des acteurs : une case par couche, les filtres filière et département, la légende et le tableau des éléments affichés. */
export function ActorsMapPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const vc = useVcSelect();
  const [dep, setDep] = useState('');
  const [chain, setChain] = useState('');
  const [hidden, setHidden] = useState<string[]>([]);
  // L'agent et le producteur restent dans leur département : le serveur l'impose, pas de filtre pour eux.
  const canFilterDep = user?.role !== 'agent_atda' && user?.role !== 'producteur';
  const q = useQuery({ queryKey: ['actors-map', canFilterDep ? dep : '', chain], queryFn: () => api<ActorsCollection>(`/map/actors${qs({ department: canFilterDep ? dep : '', value_chain: chain })}`) });
  return (
    <>
      <PageHeader title={t('amap.title')} desc={t('amap.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.actorsMap') }]} />
      <div className="stack" style={gap(20)}>
        <div className="cluster" style={{ alignItems: 'flex-end' }}>
          {canFilterDep && (
            <div style={{ minWidth: 'min(100%, 240px)' }}>
              <Field label={t('common.department')}>{(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
            </div>
          )}
          <div style={{ minWidth: 'min(100%, 240px)' }}>
            <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={chain} onChange={(e) => setChain(e.target.value)} placeholder={t('common.all')} options={vc.options} groups={vc.groups} />}</Field>
          </div>
        </div>
        <QueryState q={q}>
          {(d) => <MapBody d={d} hidden={hidden} onToggle={(id) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))} chain={chain} />}
        </QueryState>
      </div>
    </>
  );
}

function MapBody({ d, hidden, onToggle, chain }: { d: ActorsCollection; hidden: string[]; onToggle: (id: string) => void; chain: string }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const vcName = useVcName();
  const shown = d.features.filter((f) => !hidden.includes(f.properties.layer));
  const points = shown.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number]);
  const label = (m: LayerMeta) => t(`amap.layer.${m.id}`, { defaultValue: m.label });
  const rows: TableRow[] = shown.map((f, i) => ({
    key: `${i}-${f.geometry.coordinates.join(',')}`, layer: t(`amap.short.${f.properties.layer}`, { defaultValue: f.properties.layer }), name: names(f, t), kind: kindOf(f, t),
    place: place(String(f.properties.department ?? '')), detail: describe(f, t, place, vcName).slice(1).join(' · '),
  }));
  const kinds = [...new Set(d.features.filter((f) => f.properties.layer === 'sites').map((f) => String(f.properties.kind)))];
  return (
    <div className="stack" style={gap(20)}>
      <div className="split">
        <Card title={t('amap.layers')}>
          <ul className="stack" style={{ ...gap(10), listStyle: 'none', padding: 0 }}>
            {d.layers.map((m) => (
              <li key={m.id}>
                <label className="cluster" style={{ alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={!hidden.includes(m.id)} onChange={() => onToggle(m.id)} />
                  <span>
                    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: LAYER_COLOR[m.id] ?? '#374151', marginRight: 6 }} aria-hidden />
                    {label(m)} {m.count !== null && <b className="num">({t('amap.count', { count: m.count })})</b>}
                  </span>
                </label>
                {chain && !m.chain_filter && <p className="hint">{t('amap.noChainFilter')}</p>}
                {m.truncated && <Alert tone="warn">{t('amap.truncated')}</Alert>}
                {!!m.not_placed && <p className="hint">{t('amap.notPlaced', { n: m.not_placed })}</p>}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('amap.legend')}>
          <ul className="stack" style={{ ...gap(8), listStyle: 'none', padding: 0 }}>
            {kinds.map((k) => (
              <li key={k}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: SITE_COLOR[k] ?? '#374151', marginRight: 6 }} aria-hidden />{t(`trace.kind.${k}`, { defaultValue: k })}</li>
            ))}
            <li className="hint">{t('amap.approx')}</li>
          </ul>
        </Card>
      </div>
      {shown.length === 0
        ? <div className="card"><EmptyState icon="map-pin" title={t('amap.empty')}>{t('amap.emptyHelp')}</EmptyState></div>
        : (
          <div className="map" role="img" aria-label={t('amap.mapAlt', { n: shown.length })}>
            <MapContainer center={CENTER} zoom={7} className="map-canvas" scrollWheelZoom={false}>
              <TileLayer attribution={attribution()} url={OSM} />
              <FitBounds points={points} />
              {shown.map((f, i) => (
                <CircleMarker key={`${f.properties.layer}-${f.properties.id ?? f.properties.producer ?? f.properties.department}-${i}`}
                  center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]} radius={radiusOf(f)}
                  pathOptions={{ color: colorOf(f), fillColor: colorOf(f), fillOpacity: 0.55, weight: 2 }}>
                  <Popup>{describe(f, t, place, vcName).map((line, j) => <div key={j}>{line}</div>)}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      {shown.length > 0 && (
        <Table<TableRow> title={t('amap.tableTitle')} caption={t('amap.tableTitle')} data={rows} pageSize={10} exportName="carte-des-acteurs" rowKey={(r) => r.key}
          columns={[
            { key: 'layer', label: t('amap.col.layer'), render: (r) => <Badge tone="neutral">{r.layer}</Badge>, csv: (r) => r.layer },
            { key: 'name', label: t('amap.col.name') },
            { key: 'kind', label: t('amap.col.kind') },
            { key: 'place', label: t('amap.col.place') },
            { key: 'detail', label: t('amap.col.detail') },
          ]} />
      )}
    </div>
  );
}

type T = TFunction;
interface TableRow { key: string; layer: string; name: string; kind: string; place: string; detail: string }

function names(f: ActorFeature, t: T): string {
  const p = f.properties;
  if (isCluster(f)) return (p.names as string[]).join(', ') + (Number(p.count) > (p.names as string[]).length ? ` (+${Number(p.count) - (p.names as string[]).length})` : '');
  return String(p.name ?? (p.producer ? t('amap.producer', { code: p.producer }) : ''));
}

function kindOf(f: ActorFeature, t: T): string {
  const p = f.properties;
  if (p.layer === 'sites') return t(`trace.kind.${p.kind}`, { defaultValue: String(p.kind) });
  if (p.layer === 'schemes') return t(`sch.kind.${p.kind}`, { defaultValue: String(p.kind) });
  if (p.layer === 'organisations') return Object.entries(p.by_tag as Record<string, number>).map(([k, n]) => `${t(`org.kind.${k}`, { defaultValue: k })} ${n}`).join(', ');
  return '';
}

/** Lignes du popup et du tableau : le titre, puis les détails. Aucun nom de personne, aucun téléphone. */
function describe(f: ActorFeature, t: T, place: (c?: string | null) => string, vcName: (c: string) => string): string[] {
  const p = f.properties;
  const lines = [names(f, t)];
  if (p.layer === 'sites') lines.push(kindOf(f, t), [place(String(p.commune ?? '')), place(String(p.department))].filter(Boolean).join(', '), p.capacity_t != null ? t('amap.capacity', { n: fmtNum(Number(p.capacity_t), 0) }) : '');
  else if (p.layer === 'schemes') lines.push(kindOf(f, t), t(`amap.status.${p.status}`, { defaultValue: String(p.status) }), t('amap.area', { n: fmtNum(Number(p.area_available_ha), 1) }));
  else if (isCluster(f)) lines.push(place(String(p.department)), t('amap.inDepartment', { count: Number(p.count) }), t('amap.approx'));
  else if (p.layer === 'parcels') lines.push(place(String(p.department)), t('amap.area', { n: fmtNum(Number(p.area_ha), 2) }), (p.value_chains as string[]).map(vcName).join(', '));
  return lines.filter(Boolean);
}
