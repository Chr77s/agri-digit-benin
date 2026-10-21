import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Card, ErrorState, Field, Icon, PageHeader, Select, Skeleton, Table, fmtNum } from '../../shared/ui';
import { useDepartments, usePlaceName, useVcSelect } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { useAnalysis, type Supply, type Trend } from './api';
import { gap } from './FormError';

const TREND_TONE = { hausse: 'wait', baisse: 'bad', stable: 'ok' } as const;
const RELIABILITY_TONE = { insuffisante: 'bad', faible: 'wait', moyenne: 'neutral', bonne: 'ok' } as const;

/** Analyses prospectives des marchés : tendance des prix (relevés) et offre attendue (campagnes). Heuristique, jamais une certitude. */
export function AnalysisPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const vc = useVcSelect();
  const deps = useDepartments();
  const [chain, setChain] = useState('mais');
  const [department, setDepartment] = useState('');
  const agent = user?.role === 'agent_atda';
  const q = useAnalysis(chain, agent ? undefined : department || undefined);
  return (
    <>
      <PageHeader title={t('mk.analysis.title')} desc={t('mk.analysis.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.marketOutlook') }]} />
      <div className="stack" style={gap(20)}>
        <div className="form-grid">
          <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={chain} onChange={(e) => setChain(e.target.value)} options={vc.options} groups={vc.groups} />}</Field>
          {!agent && <Field label={t('common.department')} optional>{(p) => <Select {...p} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>}
        </div>
        <Alert tone="info" icon="info">{t('mk.analysis.method')}</Alert>
        {q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data ? <div className="card"><Skeleton lines={5} /></div> : (
          <>
            <Trends rows={q.data.prices} min={q.data.method.min_observations} span={q.data.method.min_span_days} />
            <SupplyTable rows={q.data.supply} />
          </>
        )}
      </div>
    </>
  );
}

function Trends({ rows, min, span }: { rows: Trend[]; min: number; span: number }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const pooled = rows.filter((r) => r.market === null);
  return (
    <Card title={t('mk.analysis.trendTitle')} sub={t('mk.analysis.trendSub')}>
      {rows.length === 0 ? <p className="muted">{t('mk.analysis.noReadings')}</p> : (
        <div className="stack" style={gap(14)}>
          {pooled.map((r) => <Alert key={`${r.form}|${r.product}`} tone={r.reliability === 'insuffisante' ? 'warn' : 'info'} icon={r.reliability === 'insuffisante' ? 'alert' : 'trend'}>{r.text}</Alert>)}
          <Table<Trend & { id: string }> caption={t('mk.analysis.trendTitle')} rowKey={(r) => r.id} pageSize={8} exportName="tendances-prix"
            data={rows.map((r) => ({ ...r, id: `${r.market}|${r.form}|${r.product}` }))}
            columns={[
              { key: 'market', label: t('weather.market'), primary: true, render: (r) => <><span className="cell-main">{r.market ?? t('mk.analysis.allMarkets')}</span><span className="cell-sub">{r.product} · {t(`mk.form.${r.form}`)}{r.market && r.department ? ` · ${place(r.department)}` : ''}</span></>, csv: (r) => `${r.market ?? ''} ${r.product}` },
              { key: 'moving_avg_xof', label: t('mk.analysis.avg'), num: true, render: (r) => (r.moving_avg_xof === null ? t('common.notAvailable') : fmtNum(r.moving_avg_xof)) },
              { key: 'variation_pct', label: t('mk.analysis.variation'), num: true, render: (r) => (r.variation_pct === null ? t('common.notAvailable') : `${r.variation_pct > 0 ? '+' : r.variation_pct < 0 ? '−' : ''}${String(Math.abs(r.variation_pct)).replace('.', ',')} %`), csv: (r) => r.variation_pct },
              { key: 'trend', label: t('mk.analysis.trend'), render: (r) => (r.trend ? <Badge tone={TREND_TONE[r.trend]} icon={r.trend === 'hausse' ? 'arrow-up' : r.trend === 'baisse' ? 'arrow-down' : 'check'}>{t(`mk.trend.${r.trend}`)}</Badge> : <span className="muted">{t('common.notAvailable')}</span>), csv: (r) => r.trend },
              { key: 'reliability', label: t('mk.analysis.reliability'), render: (r) => <><Badge tone={RELIABILITY_TONE[r.reliability]}>{t(`mk.reliability.${r.reliability}`)}</Badge> <span className="small muted">{t('mk.prices.nReadings', { count: r.observations })}</span></>, csv: (r) => `${r.reliability} ${r.observations}` },
              { key: 'projection', label: t('mk.analysis.projection'), num: true, render: (r) => (r.projection
                ? <span title={t('mk.analysis.projectionHint')}>{fmtNum(r.projection.price_xof)} <span className="small muted">({fmtNum(r.projection.low_xof)} – {fmtNum(r.projection.high_xof)})</span></span>
                : <span className="muted small">{t('mk.analysis.noProjection', { min, span })}</span>), csv: (r) => r.projection?.price_xof },
            ]} />
        </div>
      )}
    </Card>
  );
}

function SupplyTable({ rows }: { rows: Supply[] }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const demo = rows.some((r) => r.yield_source === 'demonstration');
  return (
    <Card title={t('mk.supply.title')} sub={t('mk.supply.sub')} actions={demo ? <Badge tone="demo">{t('mk.supply.demoYield')}</Badge> : undefined}>
      {rows.length === 0 ? <p className="muted">{t('mk.supply.empty')}</p> : (
        <div className="stack" style={gap(10)}>
          <Table<Supply & { id: string }> caption={t('mk.supply.title')} rowKey={(r) => r.id} pageSize={8} exportName="offre-attendue"
            data={rows.map((r) => ({ ...r, id: `${r.department}|${r.season}` }))}
            columns={[
              { key: 'department', label: t('common.department'), primary: true, render: (r) => <><span className="cell-main">{place(r.department)}</span><span className="cell-sub">{r.season}</span></>, csv: (r) => `${r.department} ${r.season}` },
              { key: 'producers', label: t('mk.supply.producers'), num: true, render: (r) => (r.masked ? '—' : fmtNum(r.producers)) },
              { key: 'campaigns_pending', label: t('mk.supply.pending'), num: true, render: (r) => fmtNum(r.campaigns_pending) },
              { key: 'expected_kg', label: t('mk.supply.expected'), num: true, render: (r) => (r.masked ? <span className="muted small"><Icon name="lock" /> {t('mk.supply.masked')}</span> : <b>{fmtNum(r.expected_kg)}</b>), csv: (r) => r.expected_kg },
              { key: 'harvested_kg', label: t('mk.supply.harvested'), num: true, render: (r) => (r.masked ? '—' : fmtNum(r.harvested_kg)), csv: (r) => r.harvested_kg },
              { key: 'previous_harvest_kg', label: t('mk.supply.previous'), num: true, render: (r) => (r.masked ? '—' : r.previous_harvest_kg === null ? t('common.notAvailable') : <>{fmtNum(r.previous_harvest_kg)} <span className="small muted">({r.previous_season})</span></>), csv: (r) => r.previous_harvest_kg },
              { key: 'change_pct', label: t('mk.supply.change'), num: true, render: (r) => (r.change_pct === null ? t('common.notAvailable') : `${r.change_pct > 0 ? '+' : ''}${String(r.change_pct).replace('.', ',')} %`), csv: (r) => r.change_pct },
            ]} />
          <p className="hint">{t('mk.supply.note')}</p>
        </div>
      )}
    </Card>
  );
}
