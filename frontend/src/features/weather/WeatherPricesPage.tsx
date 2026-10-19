import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Card, Chips, Field, Icon, PageHeader, Select, Switch, Table, fmtNum } from '../../shared/ui';
import { useDepartments, usePlaceName, useVcName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import '../producers/producteur.css';
import { PRICE_CHAINS, demoForecast, demoPriceHistory, demoPrices, type MarketPrice } from './demo';

/** /meteo-prix (producteur, agent ATDA) : aucune API météo ni prix côté serveur, toutes les valeurs sont simulées et étiquetées. */
export function WeatherPricesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const place = usePlaceName();
  const vcName = useVcName();
  const [commune, setCommune] = useState(user?.commune ?? '');
  const [chain, setChain] = useState(['mais']);
  const rows = demoPrices(chain[0]);
  const communes = (deps.data ?? []).filter((d) => !user?.department || d.code === user.department || user.role === 'producteur')
    .map((d) => ({ label: d.name, options: d.communes.map((c) => ({ value: c.code, label: `${c.name} (${d.name})` })) }));
  const name = place(commune) || t('weather.benin');
  return (
    <>
      <PageHeader title={t('nav.weatherPrices')} desc={t('weather.desc')} listen={t('weather.listen')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.weatherPrices') }]}
        actions={
          <div className="w-full sm:w-64">
            <Field label={t('common.commune')}>
              {(p) => <Select {...p} value={commune} onChange={(e) => setCommune(e.target.value)} options={[]} groups={communes} placeholder={communes.length ? undefined : t('common.loadingDots')} />}
            </Field>
          </div>
        } />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Forecast commune={commune} name={name} />
        <Prices chain={chain} setChain={setChain} rows={rows} />
        <div className="grid-fit" style={{ ['--min' as string]: '320px' }}>
          <PriceChart chain={chain[0]} name={vcName(chain[0])} market={rows[0].market} />
          <Subscriptions />
        </div>
      </div>
    </>
  );
}

function Forecast({ commune, name }: { commune: string; name: string }) {
  const { t } = useTranslation();
  const days = demoForecast(commune || 'benin');
  const total = days.reduce((s, d) => s + d.rainMm, 0);
  const heavy = days.filter((d) => d.rainMm >= 30);
  const dry = days.every((d) => d.rainMm < 5);
  const label = (d: Date, i: number) => (i === 0 ? t('weather.today') : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
  return (
    <>
      <Card title={t('weather.weekTitle', { place: name })} sub={t('weather.updated')} actions={<Badge tone="sim">{t('weather.simulated')}</Badge>}>
        <ul className="week">
          {days.map((d, i) => (
            <li key={d.date.toISOString()} className={i === 0 ? 'is-today' : d.rainMm >= 10 ? 'is-rain' : undefined}
              aria-label={t('weather.dayLabel', { day: label(d.date, i), max: d.tmax, min: d.tmin, mm: d.rainMm, pct: d.rainPct })}>
              <span className="d" aria-hidden>{label(d.date, i)}</span>
              <Icon name={d.icon} />
              <span className="tmax num" aria-hidden>{d.tmax}°</span>
              <span className="muted num" aria-hidden>{d.tmin}°</span>
              <span className="rainbar" aria-hidden><i style={{ height: `${Math.min(100, (d.rainMm / 60) * 100)}%` }} /></span>
              <span className="num" aria-hidden>{d.rainMm >= 30 ? <b>{t('weather.mm', { n: d.rainMm })}</b> : t('weather.mm', { n: d.rainMm })} · {d.rainPct} %</span>
            </li>
          ))}
        </ul>
        <p className="hint mt-3">{t('weather.total', { mm: total })}</p>
      </Card>
      <section aria-labelledby="t-alertes" className="stack" style={{ ['--gap' as string]: '12px' }}>
        <h2 className="section-title" id="t-alertes">{t('weather.alertsTitle')}</h2>
        {heavy.map((d) => (
          <Alert key={d.date.toISOString()} tone="warn" icon="drop" title={t('weather.heavy', { day: d.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), mm: d.rainMm })}>
            <p>{t('weather.heavyTip')}</p><p className="small muted">{t('weather.simNote')}</p>
          </Alert>
        ))}
        {dry && <Alert tone="info" icon="sun" title={t('weather.dry')}><p>{t('weather.dryTip')}</p><p className="small muted">{t('weather.simNote')}</p></Alert>}
        {heavy.length === 0 && !dry && <p className="muted">{t('weather.noAlert')}</p>}
        <p className="hint">{t('weather.realAlerts')}</p>
      </section>
    </>
  );
}

type PriceRow = MarketPrice & { id: string };

function Prices({ chain, setChain, rows }: { chain: string[]; setChain: (v: string[]) => void; rows: MarketPrice[] }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  return (
      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
        <Table<PriceRow> title={t('weather.pricesTitle')} caption={t('weather.pricesCaption', { crop: vcName(chain[0]) })} rowKey={(r) => r.id} data={rows.map((r) => ({ ...r, id: r.market }))}
          toolbar={<Chips single label={t('common.valueChain')} value={chain} onChange={setChain} options={PRICE_CHAINS.map((c) => ({ value: c.code, label: vcName(c.code) }))} />}
          columns={[
            { key: 'market', label: t('weather.market'), render: (r) => <span className="cell-main">{r.market}</span> },
            { key: 'department', label: t('common.department') },
            { key: 'price', label: t('weather.price'), num: true, render: (r) => <b>{fmtNum(r.price)}</b> },
            {
              key: 'change', label: t('weather.change'), num: true,
              render: (r) => (r.change === 0 ? <span className="muted">{t('weather.stable')}</span>
                : <span className={r.change > 0 ? 'up' : 'down'}><Icon name={r.change > 0 ? 'arrow-up' : 'arrow-down'} />{r.change > 0 ? '+' : '−'}{Math.abs(r.change)} %</span>),
            },
          ]} />
        <div className="cluster"><Badge tone="demo">{t('pr.demo')}</Badge><span className="small muted">{t('weather.pricesSource')}</span></div>
      </div>
  );
}

function PriceChart({ chain, name, market }: { chain: string; name: string; market: string }) {
  const { t } = useTranslation();
  const pts = demoPriceHistory(chain);
  const vals = pts.map((p) => p.price);
  const lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.05;
  const x = (i: number) => 50 + (i * 290) / (pts.length - 1);
  const y = (v: number) => 160 - ((v - lo) / (hi - lo)) * 140;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.price).toFixed(1)}`).join(' ');
  const d = (dt: Date) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const last = pts[pts.length - 1];
  return (
    <figure className="card chart">
      <div className="card-head" style={{ margin: 0 }}><h3 className="card-title">{t('weather.chartTitle', { crop: name, market })}</h3><Badge tone="demo">{t('pr.demo')}</Badge></div>
      <svg viewBox="0 0 360 190" role="img" aria-label={t('weather.chartAlt', { crop: name, market, from: pts[0].price, to: last.price })}>
        <g>{[20, 70, 120, 160].map((yy) => <line key={yy} className="gridline" x1="40" x2="352" y1={yy} y2={yy} />)}</g>
        <g className="tick" textAnchor="end">{[20, 90, 160].map((yy) => <text key={yy} x="34" y={yy + 4}>{Math.round(lo + ((160 - yy) / 140) * (hi - lo))}</text>)}</g>
        <path className="area" d={`${line} L${x(pts.length - 1)} 160 L50 160Z`} />
        <path className="line" d={line} />
        <circle className="point" cx={x(pts.length - 1)} cy={y(last.price)} r="4" />
        <text className="val" x={x(pts.length - 1)} y={y(last.price) - 12} textAnchor="middle">{last.price}</text>
        <g className="tick" textAnchor="middle"><text x="50" y="180">{d(pts[0].date)}</text><text x="195" y="180">{d(pts[4].date)}</text><text x="335" y="180">{d(last.date)}</text></g>
      </svg>
      <figcaption>{t('weather.chartCaption')}</figcaption>
    </figure>
  );
}

/** Préférences d'envoi : aucune API d'abonnement, l'état reste sur cet écran (étiqueté). */
function Subscriptions() {
  const { t } = useTranslation();
  const [on, setOn] = useState<Record<string, boolean>>({ meteo: true, mais: true, soja: false });
  return (
    <Card title={t('weather.smsTitle')} actions={<Badge tone="demo">{t('pr.demo')}</Badge>}>
      <fieldset className="fieldset">
        <legend className="sr-only">{t('weather.smsTitle')}</legend>
        {Object.keys(on).map((k) => (
          <Switch key={k} label={t(`weather.sub.${k}`)} checked={on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} />
        ))}
      </fieldset>
      <p className="hint mt-2.5">{t('weather.smsHint')}</p>
    </Card>
  );
}
