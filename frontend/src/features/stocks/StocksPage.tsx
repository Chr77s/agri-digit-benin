import { useTranslation } from 'react-i18next';
import { Alert, Badge, Card, EmptyState, PageHeader, QueryState, Stat, Table, fmtNum, type BadgeTone } from '../../shared/ui';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import { useStockOutlook, type StockLevel, type StockRow } from './api';

const LEVEL_TONE: Record<StockLevel, BadgeTone> = { rupture: 'bad', critique: 'urgent', bas: 'wait', ok: 'ok', non_calculable: 'neutral' };
const LEVELS: StockLevel[] = ['rupture', 'critique', 'bas', 'ok', 'non_calculable'];
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Jours de couverture : jamais d'infini ni de zéro trompeur quand rien n'est calculable. */
function Cover({ r }: { r: StockRow }) {
  const { t } = useTranslation();
  if (r.days_cover === null) return <span className="muted">{t('stocks.notComputable')}</span>;
  return <b>{r.level === 'rupture' ? t('stocks.noStock') : t('stocks.days', { n: fmtNum(r.days_cover, 1) })}</b>;
}

/** Stocks et anticipation des ruptures : stock des lots, sortie moyenne par jour, jours de couverture, niveau d'alerte. */
export function StocksPage() {
  const { t } = useTranslation();
  const q = useStockOutlook();
  const vcName = useVcName();
  const place = usePlaceName();
  return (
    <>
      <PageHeader title={t('stocks.title')} desc={t('stocks.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.stockOutlook') }]} />
      <QueryState q={q} empty={(d) => d.results.length === 0}
        emptyText={<div className="card"><EmptyState title={t('stocks.empty')} icon="warehouse">{t('stocks.emptyHelp')}</EmptyState></div>}>
        {(d) => (
          <div className="stack" style={gap(20)}>
            <div className="grid-fit" style={{ '--min': '150px' } as React.CSSProperties}>
              {LEVELS.map((l) => <Stat key={l} label={t(`stocks.level.${l}`)} value={fmtNum(d.summary[l])} foot={d.scope === 'mine' ? t('stocks.kpiFoot.mine') : t('stocks.kpiFoot.aggregate')} />)}
            </div>
            {d.summary.rupture + d.summary.critique > 0 && (
              <Alert tone="warn" icon="alert" title={t('stocks.attentionTitle')}>{t('stocks.attentionText', { count: d.summary.rupture + d.summary.critique })}</Alert>
            )}
            {d.scope === 'mine' ? (
              <Table<StockRow & { id: string }> title={t('stocks.mineTitle')} caption={t('stocks.mineCaption', { days: d.window_days })} exportName="stocks" rowKey={(r) => r.id} pageSize={10}
                data={d.results.map((r) => ({ ...r, id: `${r.product}|${r.site}|${r.value_chain}` }))}
                columns={[
                  { key: 'product', label: t('stocks.col.product'), primary: true, render: (r) => <><span className="cell-main">{r.product}</span><span className="cell-sub">{vcName(r.value_chain)} · {r.site_name ?? t('stocks.noSite')}</span></>, csv: (r) => r.product },
                  { key: 'stock_kg', label: t('stocks.col.stock'), num: true, render: (r) => fmtNum(r.stock_kg, 1) },
                  { key: 'daily_outflow_kg', label: t('stocks.col.daily'), num: true, render: (r) => (r.daily_outflow_kg > 0 ? fmtNum(r.daily_outflow_kg, 1) : '—') },
                  { key: 'days_cover', label: t('stocks.col.cover'), num: true, render: (r) => <Cover r={r} />, csv: (r) => r.days_cover },
                  { key: 'level', label: t('stocks.col.level'), render: (r) => <Badge tone={LEVEL_TONE[r.level]}>{t(`stocks.level.${r.level}`)}</Badge>, csv: (r) => r.level },
                ]} />
            ) : (
              <Table<StockRow & { id: string }> title={t('stocks.aggTitle')} caption={t('stocks.aggCaption', { days: d.window_days })} exportName="stocks-departements" rowKey={(r) => r.id} pageSize={12}
                data={d.results.map((r) => ({ ...r, id: `${r.department}|${r.value_chain}` }))}
                columns={[
                  { key: 'department', label: t('common.department'), primary: true, render: (r) => <><span className="cell-main">{place(r.department) || t('stocks.noDepartment')}</span><span className="cell-sub">{vcName(r.value_chain)}</span></>, csv: (r) => `${r.department} ${r.value_chain}` },
                  { key: 'holders', label: t('stocks.col.holders'), num: true, render: (r) => fmtNum(r.holders) },
                  { key: 'stock_kg', label: t('stocks.col.stock'), num: true, render: (r) => fmtNum(r.stock_kg, 1) },
                  { key: 'daily_outflow_kg', label: t('stocks.col.daily'), num: true, render: (r) => (r.daily_outflow_kg > 0 ? fmtNum(r.daily_outflow_kg, 1) : '—') },
                  { key: 'days_cover', label: t('stocks.col.cover'), num: true, render: (r) => <Cover r={r} />, csv: (r) => r.days_cover },
                  { key: 'at_risk_holders', label: t('stocks.col.atRisk'), num: true, render: (r) => (r.at_risk_holders ? <b>{fmtNum(r.at_risk_holders)}</b> : '0'), csv: (r) => r.at_risk_holders },
                  { key: 'level', label: t('stocks.col.level'), render: (r) => <Badge tone={LEVEL_TONE[r.level]}>{t(`stocks.level.${r.level}`)}</Badge>, csv: (r) => r.level },
                ]} />
            )}
            <Card title={t('stocks.methodTitle')} headingLevel={3}>
              <p className="small">{t('stocks.method', { days: d.window_days, critical: d.thresholds.critical_days, low: d.thresholds.low_days })}</p>
              <p className="small muted mt-2">{t('stocks.notComputableHelp')}</p>
            </Card>
          </div>
        )}
      </QueryState>
    </>
  );
}
