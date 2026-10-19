import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Card, Chips, EmptyState, Field, PageHeader, Select, Table, fmtNum } from '../../shared/ui';
import { useDepartments, useValueChains } from '../../shared/api/ref';
import { TableView, Val } from '../dashboard/viz';
import '../dashboard/pilotage.css';
import { RISKS, communeRisks, yieldSeries, type CommuneRisk, type Level, type Risk, type YieldPoint } from './simulate';

const LEVEL_TONE = { faible: 'neutral', modere: 'wait', eleve: 'urgent' } as const;
const fmt1 = (n: number) => fmtNum(n, 1);

/** /previsions : rendements et risques SIMULÉS, étiquetés comme tels ; aucune décision automatique. */
export function ForecastsPage() {
  const { t } = useTranslation();
  const deps = useDepartments();
  const vcs = useValueChains();
  const year = new Date().getFullYear();
  const [vc, setVc] = useState('');
  const [dep, setDep] = useState('');
  const [horizon, setHorizon] = useState(String(year));
  const [risk, setRisk] = useState<string[]>(['all']);
  const chains = (vcs.data ?? []).filter((v) => !v.reserve);
  const vcCode = vc || chains[0]?.code || '';
  const vcLabel = chains.find((v) => v.code === vcCode)?.name ?? vcCode;
  const depObj = deps.data?.find((d) => d.code === dep) ?? deps.data?.[0];
  const series = useMemo(() => (vcCode && depObj ? yieldSeries(vcCode, depObj.code, year + 1) : []), [vcCode, depObj, year]);
  const risks = useMemo(() => (vcCode && depObj ? communeRisks(vcCode, depObj.communes) : []), [vcCode, depObj]);
  const shown = risk[0] === 'all' ? risks : risks.filter((r) => r[risk[0] as Risk] !== 'faible');
  const target = series.find((p) => p.year === Number(horizon));
  const lvl = (l: Level) => <Badge tone={LEVEL_TONE[l]}>{t(`pilotage.fc.level.${l}`)}</Badge>;

  return (
    <div className="pv">
      <PageHeader title={t('pilotage.fc.title')} crumbs={[{ label: t('pilotage.crumbFollow') }, { label: t('nav.forecasts') }]} desc={t('pilotage.fc.desc')} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="warn" title={t('pilotage.fc.simTitle')}>{t('pilotage.fc.simText')}</Alert>
        <form className="card card--flat filters" aria-label={t('pilotage.fc.params')} onSubmit={(e) => e.preventDefault()}>
          <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={vcCode} onChange={(e) => setVc(e.target.value)} options={chains.map((v) => ({ value: v.code, label: v.name }))} />}</Field>
          <Field label={t('common.department')}>{(p) => <Select {...p} value={depObj?.code ?? ''} onChange={(e) => setDep(e.target.value)} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          <Field label={t('pilotage.fc.horizon')}>{(p) => <Select {...p} value={horizon} onChange={(e) => setHorizon(e.target.value)} options={[{ value: String(year), label: t('pilotage.fc.endOf', { year }) }, { value: String(year + 1), label: t('pilotage.fc.season', { year: year + 1 }) }]} />}</Field>
          <span className="ml-auto"><Badge tone="sim">{t('pilotage.fc.simBadge')}</Badge></span>
        </form>
        {!depObj || !vcCode ? <EmptyState title={t('pilotage.fc.loadingRef')} /> : (
          <>
            <div className="split">
              <Card title={t('pilotage.fc.chartTitle', { vc: vcLabel, place: depObj.name })} sub={t('pilotage.fc.chartSub')} actions={<Badge tone="sim">{t('pilotage.fc.simForecast')}</Badge>}>
                {target && (
                  <p className="mb-2" aria-live="polite">
                    {t('pilotage.fc.headline', { year: target.year, value: fmt1(target.value), low: fmt1(target.low ?? target.value), high: fmt1(target.high ?? target.value) })}
                  </p>
                )}
                <YieldChart pts={series} />
                <TableView caption={t('pilotage.fc.chartTitle', { vc: vcLabel, place: depObj.name })} head={[t('pilotage.fc.year'), 't/ha', t('pilotage.fc.nature')]}
                  rows={series.map((p) => [p.year, p.forecast ? `${fmt1(p.value)} (${fmt1(p.low!)}–${fmt1(p.high!)})` : fmt1(p.value), t(p.forecast ? 'pilotage.fc.forecastSim' : 'pilotage.fc.historySim')])} />
              </Card>
              <Card title={t('pilotage.fc.methodTitle')} actions={<Badge tone="sim">{t('pilotage.sim')}</Badge>}>
                <ul className="small" style={{ paddingLeft: 18, listStyle: 'disc' }}>
                  {(['rain', 'ndvi', 'history', 'pests'] as const).map((k) => <li key={k} className="mb-1.5"><b>{t(`pilotage.fc.method.${k}.k`)}</b> : {t(`pilotage.fc.method.${k}.v`)}</li>)}
                </ul>
                <div className="mt-3"><Alert tone="info" icon="shield-check">{t('pilotage.fc.noAuto')}</Alert></div>
              </Card>
            </div>
            <Table<CommuneRisk> title={t('pilotage.fc.riskTitle')} caption={t('pilotage.fc.riskCaption')} data={shown} rowKey={(r) => r.code} pageSize={12}
              toolbar={<Chips single label={t('pilotage.fc.filterRisk')} value={risk} onChange={setRisk}
                options={[{ value: 'all', label: t('common.all'), count: risks.length }, ...RISKS.map((k) => ({ value: k, label: t(`pilotage.fc.risk.${k}`) }))]} />}
              columns={[
                { key: 'name', label: t('common.commune') },
                ...RISKS.map((k) => ({ key: k, label: t(`pilotage.fc.risk.${k}`), render: (r: CommuneRisk) => lvl(r[k]), csv: (r: CommuneRisk) => t(`pilotage.fc.level.${r[k]}`) })),
                { key: 'yield', label: t('pilotage.fc.yieldForecast'), num: true, render: (r) => <Val v={r.yield} unit="t/ha" />, csv: (r) => r.yield ?? t('common.notAvailable') },
              ]} />
            <p className="src">{t('pilotage.fc.riskFoot')}</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Courbe : historique (trait plein) puis prévision (tirets) avec sa fourchette. Survol : valeur du point. */
function YieldChart({ pts }: { pts: YieldPoint[] }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<YieldPoint | null>(null);
  if (pts.length < 2) return null;
  const W = 600; const H = 240; const L = 40; const R = 16; const T = 16; const B = 28;
  const max = Math.ceil(Math.max(...pts.map((p) => p.high ?? p.value)) * 2) / 2 + 0.5;
  const x = (i: number) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const hist = pts.filter((p) => !p.forecast);
  const lastH = hist.length - 1;
  const fc = pts.map((p, i) => ({ p, i })).filter(({ p }) => p.forecast);
  const line = (list: { p: YieldPoint; i: number }[]) => list.map(({ p, i }, k) => `${k ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const band = [...fc.map(({ p, i }) => `${x(i)},${y(p.high!)}`), ...[...fc].reverse().map(({ p, i }) => `${x(i)},${y(p.low!)}`)].join(' ');
  const ticks = Array.from({ length: Math.round(max / 0.5) + 1 }, (_, i) => i * 0.5);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('pilotage.fc.chartAria')} onMouseLeave={() => setHover(null)}>
        <g className="grid">{ticks.map((v) => <line key={v} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />)}</g>
        {ticks.filter((v) => v % 1 === 0).map((v) => <text key={v} className="tick" x={L - 8} y={y(v) + 4} textAnchor="end">{fmtNum(v)}</text>)}
        {pts.map((p, i) => <text key={p.year} className="tick" x={x(i)} y={H - 6} textAnchor="middle">{p.year}</text>)}
        <polygon points={band} style={{ fill: 'rgba(226,177,50,.18)' }} />
        <path className="line" d={line(hist.map((p, i) => ({ p, i })))} />
        <path className="line line--forecast" d={line([{ p: hist[lastH], i: lastH }, ...fc])} />
        {pts.map((p, i) => (
          <g key={p.year} onMouseEnter={() => setHover(p)}>
            <circle cx={x(i)} cy={y(p.value)} r={14} fill="transparent" />
            <circle className="point" cx={x(i)} cy={y(p.value)} r={hover === p ? 6 : 4} style={p.forecast ? { stroke: 'var(--d3)' } : undefined} />
          </g>
        ))}
        <text className="val" x={x(lastH)} y={y(hist[lastH].value) - 12} textAnchor="middle">{fmt1(hist[lastH].value)}</text>
        <text className="val" x={x(pts.length - 1)} y={y(pts[pts.length - 1].value) - 12} textAnchor="end">{fmt1(pts[pts.length - 1].value)}</text>
      </svg>
      <ul className="legend">
        <li><span className="sw" />{t('pilotage.fc.historySim')}</li>
        <li><span className="sw sw--dash" />{t('pilotage.fc.forecastSim')}</li>
        <li><span className="sw" style={{ background: 'rgba(226,177,50,.35)' }} />{t('pilotage.fc.range')}</li>
      </ul>
      <figcaption aria-live="polite">
        {hover ? t('pilotage.fc.tip', { year: hover.year, value: fmt1(hover.value), kind: t(hover.forecast ? 'pilotage.fc.forecastSim' : 'pilotage.fc.historySim') }) : t('pilotage.fc.hoverHint')}
      </figcaption>
    </figure>
  );
}
