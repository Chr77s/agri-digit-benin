import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs } from '../../shared/api/client';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import { Alert, Card, EmptyState, Field, QueryState, Select, Table, Tabs, fmtNum } from '../../shared/ui';
import { Src, Val } from './viz';

interface ProductionRow { value_chain: string; season: string; masked: boolean; producers: number | null; parcels: number | null; quantity_kg: number | null; yield_kg_ha: number | null }
interface Production { source: string; updated_at: string | null; min_cell: number; seasons: string[]; rows: ProductionRow[] }
interface WorkRow { key: string; total: number | null; f_u35: number | null; f_o35: number | null; m_u35: number | null; m_o35: number | null; masked: boolean }
interface Workforce { source: string; min_cell: number; by_department: WorkRow[]; by_value_chain: WorkRow[] }
interface Compare { cells_used: number; n_treated: number | null; n_control: number | null; gap_pct: number | null; available: boolean }
interface ImpactCell { department: string; value_chain: string; season: string; n_treated: number | null; n_control: number | null; mean_treated: number | null; mean_control: number | null; gap_pct: number | null; available: boolean }
interface ImpactProgram { program: string; name: string; n_treated: number | null; gap_pct: number | null; available: boolean; cells_used: number }
interface Impact { source: string; min_group: number; window_days: number; warning: string; overall: Compare; excluded: number; cells: ImpactCell[]; by_program: ImpactProgram[] }

const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Cellule masquée par le serveur (moins de 5 personnes) : jamais un zéro, et la raison à portée de la souris. */
function Masked() {
  const { t } = useTranslation();
  return <span className="na" title={t('sead.maskedHelp', { n: 5 })}>{t('sead.masked')}</span>;
}
const Count = ({ v }: { v: number | null }) => (v === null ? <Masked /> : <>{fmtNum(v)}</>);
const Gap = ({ v }: { v: number | null }) => (v === null ? <Val v={null} /> : <>{v > 0 ? '+' : ''}{fmtNum(v, 1)}&nbsp;%</>);

/** Suivi-évaluation détaillé : production par filière et saison, effectifs, impact des appuis. */
export function SeaDetail({ department }: { department: string }) {
  return (
    <div className="stack" style={gap(20)}>
      <ProductionCard department={department} />
      <WorkforceCard department={department} />
      <ImpactCard department={department} />
    </div>
  );
}

function ProductionCard({ department }: { department: string }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const [season, setSeason] = useState('');
  const q = useQuery({ queryKey: ['sea-production', department, season], queryFn: () => api<Production>(`/dashboard/sea/production${qs({ department, season })}`) });
  return (
    <Card title={t('sead.production.title')} sub={t('sead.production.desc')}
      actions={q.data && q.data.seasons.length > 0 ? (
        <div style={{ minWidth: 180 }}>
          <Field label={t('sead.production.season')}>{(p) => <Select {...p} value={season} onChange={(e) => setSeason(e.target.value)} placeholder={t('sead.production.allSeasons')} options={q.data.seasons.map((s) => ({ value: s, label: s }))} />}</Field>
        </div>
      ) : undefined}>
      <QueryState q={q} empty={(d) => d.rows.length === 0} emptyText={<EmptyState icon="wheat" title={t('sead.production.empty')}>{t('sead.production.emptyHelp')}</EmptyState>}>
        {(d) => (
          <div className="stack" style={gap(10)}>
            <Table<ProductionRow> caption={t('sead.production.title')} data={d.rows} rowKey={(r) => r.value_chain + r.season} exportName="production-par-filiere" columns={[
              { key: 'value_chain', label: t('common.valueChain'), render: (r) => vcName(r.value_chain), csv: (r) => r.value_chain },
              { key: 'season', label: t('sead.production.season') },
              { key: 'producers', label: t('sead.production.producers'), num: true, render: (r) => <Count v={r.producers} />, csv: (r) => r.producers },
              { key: 'parcels', label: t('sead.production.parcels'), num: true, render: (r) => <Count v={r.parcels} />, csv: (r) => r.parcels },
              { key: 'quantity_kg', label: t('sead.production.quantity'), num: true, render: (r) => (r.masked ? <Masked /> : <Val v={r.quantity_kg} digits={0} />), csv: (r) => r.quantity_kg },
              { key: 'yield_kg_ha', label: t('sead.production.yield'), num: true, render: (r) => (r.masked ? <Masked /> : <Val v={r.yield_kg_ha} digits={0} />), csv: (r) => r.yield_kg_ha },
            ]} />
            {d.rows.some((r) => r.masked) && <p className="hint">{t('sead.maskedHelp', { n: d.min_cell })}</p>}
            <Src source={d.source} at={d.updated_at} />
          </div>
        )}
      </QueryState>
    </Card>
  );
}

function WorkforceCard({ department }: { department: string }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const vcName = useVcName();
  const q = useQuery({ queryKey: ['sea-workforce', department], queryFn: () => api<Workforce>(`/dashboard/sea/workforce${qs({ department })}`) });
  const table = (rows: WorkRow[], label: string, name: (k: string) => string, file: string) => (
    <Table<WorkRow> caption={label} data={rows} rowKey={(r) => r.key} exportName={file} columns={[
      { key: 'key', label, render: (r) => name(r.key), csv: (r) => r.key },
      ...(['f_u35', 'f_o35', 'm_u35', 'm_o35', 'total'] as const).map((c) => ({ key: c, label: t(`sead.workforce.${c}`), num: true, render: (r: WorkRow) => <Count v={r[c]} />, csv: (r: WorkRow) => r[c] })),
    ]} />
  );
  return (
    <Card title={t('sead.workforce.title')} sub={t('sead.workforce.desc', { n: 5 })}>
      <QueryState q={q} empty={(d) => d.by_department.length === 0} emptyText={<EmptyState icon="users" title={t('sead.workforce.empty')} />}>
        {(d) => (
          <>
            <Tabs label={t('sead.workforce.title')} tabs={[
              { id: 'dep', label: t('sead.workforce.byDepartment'), content: table(d.by_department, t('sead.workforce.key'), place, 'effectifs-par-departement') },
              { id: 'vc', label: t('sead.workforce.byChain'), content: <div className="stack" style={gap(8)}>{table(d.by_value_chain, t('sead.workforce.chainKey'), vcName, 'effectifs-par-filiere')}<p className="hint">{t('sead.workforce.chainNote')}</p></div> },
            ]} />
            <Src source={d.source} />
          </>
        )}
      </QueryState>
    </Card>
  );
}

function ImpactCard({ department }: { department: string }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const vcName = useVcName();
  const q = useQuery({ queryKey: ['sea-impact', department], queryFn: () => api<Impact>(`/dashboard/sea/impact${qs({ department })}`) });
  const small = (v: number | null, min: number) => (v === null ? <span className="na">{t('sead.impact.small', { n: min })}</span> : fmtNum(v));
  return (
    <Card title={t('sead.impact.title')} sub={t('sead.impact.desc', { months: 12 })}>
      <QueryState q={q} empty={(d) => d.cells.length === 0} emptyText={<EmptyState icon="gift" title={t('sead.impact.empty')}>{t('sead.impact.emptyHelp')}</EmptyState>}>
        {(d) => (
          <div className="stack" style={gap(16)}>
            <Alert tone="warn" title={t('sead.impact.warnTitle')}>{d.warning}</Alert>
            <div className="ind">
              <span className="ind-name">{t('sead.impact.overall')}</span>
              <span className="ind-val num">{d.overall.available ? <Gap v={d.overall.gap_pct} /> : <Val v={null} />}</span>
              <span className="ind-def">
                {d.overall.available
                  ? t('sead.impact.overallBasis', { cells: d.overall.cells_used, treated: d.overall.n_treated ?? '< 5', control: d.overall.n_control ?? '< 5' })
                  : t('sead.impact.overallNone', { n: d.min_group })}
              </span>
            </div>
            {d.excluded > 0 && <p className="hint">{t('sead.impact.excluded', { n: d.excluded })}</p>}
            <Table<ImpactCell> title={t('sead.impact.cells')} caption={t('sead.impact.cells')} data={d.cells} rowKey={(c) => c.department + c.value_chain + c.season} exportName="impact-des-appuis" columns={[
              { key: 'department', label: t('common.department'), render: (c) => place(c.department), csv: (c) => c.department },
              { key: 'value_chain', label: t('common.valueChain'), render: (c) => vcName(c.value_chain), csv: (c) => c.value_chain },
              { key: 'season', label: t('sead.production.season') },
              { key: 'n_treated', label: t('sead.impact.treated'), num: true, render: (c) => small(c.n_treated, d.min_group), csv: (c) => c.n_treated },
              { key: 'n_control', label: t('sead.impact.control'), num: true, render: (c) => small(c.n_control, d.min_group), csv: (c) => c.n_control },
              { key: 'mean_treated', label: t('sead.impact.meanTreated'), num: true, render: (c) => <Val v={c.mean_treated} digits={0} />, csv: (c) => c.mean_treated },
              { key: 'mean_control', label: t('sead.impact.meanControl'), num: true, render: (c) => <Val v={c.mean_control} digits={0} />, csv: (c) => c.mean_control },
              { key: 'gap_pct', label: t('sead.impact.gap'), num: true, render: (c) => <Gap v={c.gap_pct} />, csv: (c) => c.gap_pct },
            ]} />
            {d.by_program.length > 0 && (
              <>
                <Table<ImpactProgram> title={t('sead.impact.byProgram')} caption={t('sead.impact.byProgram')} data={d.by_program} rowKey={(p) => p.program} columns={[
                  { key: 'name', label: t('sead.impact.program') },
                  { key: 'n_treated', label: t('sead.impact.treated'), num: true, render: (p) => small(p.n_treated, d.min_group), csv: (p) => p.n_treated },
                  { key: 'gap_pct', label: t('sead.impact.gap'), num: true, render: (p) => <Gap v={p.gap_pct} />, csv: (p) => p.gap_pct },
                ]} />
                <p className="hint">{t('sead.impact.byProgramHelp')}</p>
              </>
            )}
            <Src source={d.source} />
          </div>
        )}
      </QueryState>
    </Card>
  );
}
