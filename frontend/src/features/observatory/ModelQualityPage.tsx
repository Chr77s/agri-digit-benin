import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { useVcName } from '../../shared/api/ref';
import { Alert, Badge, Card, PageHeader, QueryState, Stat, Table, fmtNum } from '../../shared/ui';
import { Val } from '../dashboard/viz';

interface Share { value: number | null; n: number; reliable: boolean }
interface Trend { month: string; total: number; escalated: number; reviewed: number; confirmed: number; confirmed_share: number | null }
interface Diagnostic {
  id: 'diagnostic'; simulated: boolean; total: number; threshold: number; escalated_share: Share; escalated_low_confidence: number;
  escalated_by_producer: number; reviewed: number; confirmed_share: Share; corrected: number; trend: Trend[];
}
interface Errors { n: number; reliable: boolean; mae_kg: number | null; mape_pct: number | null; bias_pct: number | null }
interface YieldQuality {
  id: 'rendement'; overall: Errors; verified: Errors; by_value_chain: (Errors & { value_chain: string })[];
  declaration_gap: { n: number; mean_pct: number | null }; demo_reference: boolean;
}
interface Band { label: string; debtors: number; due: number; paid_share: number | null }
interface CreditQuality { id: 'credit'; measurable: boolean; reason: string | null; debtors: number; due: number; min_due: number; paid_share: number | null; bands: Band[] }
interface Quality {
  min_n: number; reliable_n: number; models: [Diagnostic, YieldQuality, CreditQuality];
  not_measured: { id: string; reason: string }[];
}

const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Une mesure et le nombre de cas qui la porte ; « non disponible » sous le minimum, « indicative » sous le seuil de fiabilité. */
function Measured({ v, n, reliable, unit = '%', digits = 1, signed = false }: { v: number | null; n: number; reliable: boolean; unit?: string; digits?: number; signed?: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      {v === null ? <Val v={null} /> : <>{signed && v > 0 ? '+' : ''}{fmtNum(v, digits)}&nbsp;{unit}</>}
      <small className="hint"> {t('mq.n', { n })}</small>
      {v !== null && !reliable && <> <Badge tone="wait">{t('mq.indicative')}</Badge></>}
    </>
  );
}

/** Qualité des modèles mesurée sur les données de la plateforme (TDR : cadre de réentraînement). */
export function ModelQualityPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['models-quality'], queryFn: () => api<Quality>('/models/quality') });
  return (
    <>
      <PageHeader title={t('mq.title')} desc={t('mq.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.modelQuality') }]} />
      <QueryState q={q}>
        {(d) => (
          <div className="stack" style={gap(20)}>
            <Alert tone="info" title={t('mq.howTitle')}>{t('mq.how', { min: d.min_n, reliable: d.reliable_n })}</Alert>
            <DiagnosticCard d={d.models[0]} />
            <YieldCard d={d.models[1]} />
            <CreditCard d={d.models[2]} />
            <Card title={t('mq.notMeasured.title')}>
              <ul className="stack" style={{ ...gap(10), listStyle: 'none', padding: 0 }}>
                {d.not_measured.map((m) => <li key={m.id}><b>{t(`mq.notMeasured.${m.id}`, { defaultValue: m.id })}</b><p className="small">{m.reason}</p></li>)}
              </ul>
            </Card>
          </div>
        )}
      </QueryState>
    </>
  );
}

function DiagnosticCard({ d }: { d: Diagnostic }) {
  const { t } = useTranslation();
  return (
    <Card title={t('mq.diagnostic.title')} actions={d.simulated ? <Badge tone="sim">{t('common.simulation')}</Badge> : undefined}>
      <div className="stack" style={gap(16)}>
        {d.simulated && <Alert tone="warn">{t('mq.diagnostic.simulated')}</Alert>}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Stat label={t('mq.diagnostic.total')} value={fmtNum(d.total)} />
          <Stat label={t('mq.diagnostic.escalated')} value={<Measured v={d.escalated_share.value} n={d.escalated_share.n} reliable={d.escalated_share.reliable} />}
            foot={t('mq.diagnostic.escalatedDetail', { low: d.escalated_low_confidence, threshold: fmtNum(d.threshold, 1), asked: d.escalated_by_producer })} />
          <Stat label={t('mq.diagnostic.confirmed')} value={<Measured v={d.confirmed_share.value} n={d.confirmed_share.n} reliable={d.confirmed_share.reliable} />}
            foot={t('mq.diagnostic.confirmedDetail', { reviewed: d.reviewed, corrected: d.corrected })} />
        </div>
        {d.trend.length > 0 && (
          <Table<Trend> title={t('mq.diagnostic.trend')} caption={t('mq.diagnostic.trend')} data={[...d.trend].reverse()} rowKey={(r) => r.month} exportName="qualite-diagnostic" columns={[
            { key: 'month', label: t('mq.diagnostic.month') },
            { key: 'total', label: t('mq.diagnostic.monthTotal'), num: true },
            { key: 'escalated', label: t('mq.diagnostic.monthEscalated'), num: true },
            { key: 'reviewed', label: t('mq.diagnostic.monthReviewed'), num: true },
            { key: 'confirmed', label: t('mq.diagnostic.monthConfirmed'), num: true },
            { key: 'confirmed_share', label: t('mq.diagnostic.monthShare'), num: true, render: (r) => <Val v={r.confirmed_share} digits={1} unit="%" /> },
          ]} />
        )}
      </div>
    </Card>
  );
}

function YieldCard({ d }: { d: YieldQuality }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const o = d.overall;
  return (
    <Card title={t('mq.yield.title')} sub={t('mq.yield.truth')}>
      <div className="stack" style={gap(16)}>
        {d.demo_reference && <Alert tone="warn">{t('mq.yield.demoReference')}</Alert>}
        <h3 className="small"><b>{t('mq.yield.overall')}</b></h3>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Stat label={t('mq.yield.mae')} value={<Measured v={o.mae_kg} n={o.n} reliable={o.reliable} unit="kg" digits={0} />} />
          <Stat label={t('mq.yield.mape')} value={<Measured v={o.mape_pct} n={o.n} reliable={o.reliable} />} />
          <Stat label={t('mq.yield.bias')} value={<Measured v={o.bias_pct} n={o.n} reliable={o.reliable} signed />} />
        </div>
        <p className="small"><b>{t('mq.yield.verified')}</b> : <Measured v={d.verified.mape_pct} n={d.verified.n} reliable={d.verified.reliable} /></p>
        <p className="hint">{t('mq.yield.verifiedHelp')}</p>
        <p className="small"><b>{t('mq.yield.declarationGap')}</b> : <Measured v={d.declaration_gap.mean_pct} n={d.declaration_gap.n} reliable={d.declaration_gap.n >= 30} /></p>
        {d.by_value_chain.length > 0 && (
          <Table<YieldQuality['by_value_chain'][number]> title={t('mq.yield.byChain')} caption={t('mq.yield.byChain')} data={d.by_value_chain} rowKey={(r) => r.value_chain} exportName="qualite-rendement" columns={[
            { key: 'value_chain', label: t('mq.yield.chain'), render: (r) => vcName(r.value_chain), csv: (r) => r.value_chain },
            { key: 'n', label: t('mq.cases'), num: true },
            { key: 'mae_kg', label: t('mq.yield.mae'), num: true, render: (r) => <Val v={r.mae_kg} digits={0} unit="kg" /> },
            { key: 'mape_pct', label: t('mq.yield.mape'), num: true, render: (r) => <Val v={r.mape_pct} digits={1} unit="%" /> },
          ]} />
        )}
      </div>
    </Card>
  );
}

function CreditCard({ d }: { d: CreditQuality }) {
  const { t } = useTranslation();
  return (
    <Card title={t('mq.credit.title')} sub={t('mq.credit.scope')}>
      {!d.measurable
        ? <Alert tone="info">{t('mq.credit.notMeasurable', { reason: d.reason ?? '' })}</Alert>
        : (
          <div className="stack" style={gap(16)}>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <Stat label={t('mq.credit.debtors')} value={fmtNum(d.debtors)} />
              <Stat label={t('mq.credit.due')} value={fmtNum(d.due)} />
              <Stat label={t('mq.credit.paid')} value={<Measured v={d.paid_share} n={d.due} reliable />} />
            </div>
            <Table<Band> caption={t('mq.credit.title')} data={d.bands} rowKey={(b) => b.label} exportName="qualite-score" columns={[
              { key: 'label', label: t('mq.credit.band') },
              { key: 'debtors', label: t('mq.credit.bandDebtors'), num: true },
              { key: 'due', label: t('mq.credit.bandDue'), num: true },
              { key: 'paid_share', label: t('mq.credit.bandPaid'), num: true, render: (b) => <Val v={b.paid_share} digits={1} unit="%" /> },
            ]} />
          </div>
        )}
    </Card>
  );
}
