import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError, api } from '../../shared/api/client';
import { useVcName, useVcSelect } from '../../shared/api/ref';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, QueryState, Select, Table, Textarea, fmtNum, toast } from '../../shared/ui';
import { HBars, Val } from '../dashboard/viz';

interface Row {
  id: string; year: number;
  production_t: number | null; consumption_t: number | null; imports_t: number | null; exports_t: number | null;
  coverage_pct: number | null; import_dependency_pct: number | null; coverage_change_pts: number | null;
  production_change_pct: number | null; consumption_change_pct: number | null; imports_change_pct: number | null;
  source: string; demo: boolean;
}
interface Chain { value_chain: string; series: Row[]; latest: Row }
interface WatchAlert { value_chain: string; year: number; kind: 'couverture_faible' | 'importations_en_hausse' | 'production_en_baisse'; value: number; threshold: number; source: string; demo: boolean }
interface Coverage {
  thresholds: { coverage_min_pct: number; imports_rise_pct: number; production_drop_pct: number };
  demo_source: string; chains: Chain[]; alerts: WatchAlert[]; can_edit: boolean;
}

const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;
const useCoverage = () => useQuery({ queryKey: ['national-coverage'], queryFn: () => api<Coverage>('/national-coverage') });
const tonnes = (v: number | null) => <Val v={v} digits={0} />;
const pct = (v: number | null, signed = false) => (v === null ? <Val v={null} /> : <>{signed && v > 0 ? '+' : ''}{fmtNum(v, 1)}&nbsp;%</>);

/** Couverture de la consommation nationale, importations, tendances et veille (TDR : suivi-évaluation). */
export function CoveragePage() {
  const { t } = useTranslation();
  const q = useCoverage();
  const vcName = useVcName();
  const [chain, setChain] = useState('');
  return (
    <>
      <PageHeader title={t('ncov.title')} desc={t('ncov.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.coverage') }]} />
      <QueryState q={q} empty={(d) => d.chains.length === 0 && !d.can_edit} emptyText={<div className="card"><EmptyState icon="globe" title={t('ncov.empty')}>{t('ncov.emptyHelp')}</EmptyState></div>}>
        {(d) => {
          const current = d.chains.find((c) => c.value_chain === chain) ?? d.chains[0];
          const demo = d.chains.some((c) => c.series.some((r) => r.demo));
          return (
            <div className="stack" style={gap(20)}>
              {demo && <Alert tone="warn" title={d.demo_source || t('ncov.demoTitle')}>{t('ncov.demoText')}</Alert>}
              {d.chains.length > 0 && <Watch d={d} />}
              {d.chains.length === 0
                ? <div className="card"><EmptyState icon="globe" title={t('ncov.empty')}>{t('ncov.emptyHelp')}</EmptyState></div>
                : (
                  <>
                    <Table<Row & { value_chain: string }> title={t('ncov.latest')} caption={t('ncov.latest')} data={d.chains.map((c) => ({ value_chain: c.value_chain, ...c.latest }))} rowKey={(r) => r.value_chain} exportName="couverture-nationale" columns={[
                      { key: 'value_chain', label: t('ncov.col.chain'), render: (r) => vcName(r.value_chain), csv: (r) => r.value_chain },
                      { key: 'year', label: t('ncov.col.year'), num: true },
                      { key: 'production_t', label: t('ncov.col.production'), num: true, render: (r) => tonnes(r.production_t) },
                      { key: 'consumption_t', label: t('ncov.col.consumption'), num: true, render: (r) => tonnes(r.consumption_t) },
                      { key: 'imports_t', label: t('ncov.col.imports'), num: true, render: (r) => tonnes(r.imports_t) },
                      { key: 'coverage_pct', label: t('ncov.col.coverage'), num: true, render: (r) => pct(r.coverage_pct) },
                      { key: 'import_dependency_pct', label: t('ncov.col.dependency'), num: true, render: (r) => pct(r.import_dependency_pct) },
                      { key: 'source', label: t('ncov.col.source'), render: (r) => <>{r.demo && <Badge tone="demo">{t('pilotage.demo')}</Badge>} {r.source}</> },
                    ]} />
                    {current && <Trend chain={current} chains={d.chains} onChain={setChain} canEdit={d.can_edit} />}
                  </>
                )}
              {d.can_edit && (
                <div className="split">
                  <EntryForm />
                  <ImportForm />
                </div>
              )}
            </div>
          );
        }}
      </QueryState>
    </>
  );
}

function Watch({ d }: { d: Coverage }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const th = d.thresholds;
  return (
    <Card title={t('ncov.watch.title')} sub={t('ncov.watch.thresholds', { coverage: th.coverage_min_pct, imports: th.imports_rise_pct, production: th.production_drop_pct })}>
      {d.alerts.length === 0
        ? <p className="small">{t('ncov.watch.none')}</p>
        : (
          <ul className="stack" style={{ ...gap(8), listStyle: 'none', padding: 0 }}>
            {d.alerts.map((a) => (
              <li key={`${a.value_chain}-${a.kind}`} className="cluster">
                <Badge tone="bad">{t('ncov.watch.year', { chain: vcName(a.value_chain), year: a.year })}</Badge>
                <span>{t(`ncov.watch.${a.kind}`, { value: fmtNum(Math.abs(a.value), 1), threshold: fmtNum(Math.abs(a.threshold), 0) })}</span>
                {a.demo && <Badge tone="demo">{t('pilotage.demo')}</Badge>}
              </li>
            ))}
          </ul>
        )}
    </Card>
  );
}

function Trend({ chain, chains, onChain, canEdit }: { chain: Chain; chains: Chain[]; onChain: (c: string) => void; canEdit: boolean }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: (id: string) => api(`/national-coverage/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['national-coverage'] }); toast(t('ncov.deleted')); },
  });
  return (
    <Card title={t('ncov.trend', { chain: vcName(chain.value_chain) })}
      actions={<div style={{ minWidth: 200 }}><Field label={t('common.valueChain')}>{(p) => <Select {...p} value={chain.value_chain} onChange={(e) => onChain(e.target.value)} options={chains.map((c) => ({ value: c.value_chain, label: vcName(c.value_chain) }))} />}</Field></div>}>
      <div className="stack" style={gap(16)}>
        {chain.series.some((r) => r.coverage_pct !== null) && (
          <HBars label={t('ncov.coverageBars')} unit="%" digits={1} data={chain.series.map((r) => ({ label: String(r.year), value: r.coverage_pct }))} />
        )}
        {del.error && <Alert tone="danger" live>{del.error.message}</Alert>}
        <Table<Row> caption={t('ncov.trend', { chain: vcName(chain.value_chain) })} data={[...chain.series].reverse()} rowKey={(r) => r.id} pageSize={20} exportName={`couverture-${chain.value_chain}`} columns={[
          { key: 'year', label: t('ncov.col.year'), num: true },
          { key: 'production_t', label: t('ncov.col.production'), num: true, render: (r) => tonnes(r.production_t) },
          { key: 'consumption_t', label: t('ncov.col.consumption'), num: true, render: (r) => tonnes(r.consumption_t) },
          { key: 'imports_t', label: t('ncov.col.imports'), num: true, render: (r) => tonnes(r.imports_t) },
          { key: 'exports_t', label: t('ncov.col.exports'), num: true, render: (r) => tonnes(r.exports_t) },
          { key: 'coverage_pct', label: t('ncov.col.coverage'), num: true, render: (r) => pct(r.coverage_pct) },
          { key: 'import_dependency_pct', label: t('ncov.col.dependency'), num: true, render: (r) => pct(r.import_dependency_pct) },
          { key: 'production_change_pct', label: t('ncov.col.productionChange'), num: true, render: (r) => pct(r.production_change_pct, true) },
          { key: 'imports_change_pct', label: t('ncov.col.importsChange'), num: true, render: (r) => pct(r.imports_change_pct, true) },
          { key: 'coverage_change_pts', label: t('ncov.col.coverageChange'), num: true, render: (r) => (r.coverage_change_pts === null ? <Val v={null} /> : <>{r.coverage_change_pts > 0 ? '+' : ''}{fmtNum(r.coverage_change_pts, 1)}</>) },
          { key: 'source', label: t('ncov.col.source'), render: (r) => <>{r.demo && <Badge tone="demo">{t('pilotage.demo')}</Badge>} {r.source}</> },
          ...(canEdit ? [{ key: 'del', label: t('common.action'), actions: true, render: (r: Row) => (
            <Button variant="ghost" size="sm" busy={del.isPending && del.variables === r.id}
              onClick={() => { if (window.confirm(t('ncov.confirmDelete', { chain: vcName(chain.value_chain), year: r.year }))) del.mutate(r.id); }}>{t('ncov.delete')}</Button>
          ) }] : []),
        ]} />
      </div>
    </Card>
  );
}

const VALUES = ['production_t', 'consumption_t', 'imports_t', 'exports_t'] as const;
const decimal = (s: string) => s.replace(',', '.').replace(/[^\d.]/g, '');

function EntryForm() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vc = useVcSelect();
  const empty = { chain: '', year: String(new Date().getFullYear() - 1), production_t: '', consumption_t: '', imports_t: '', exports_t: '', source: '' };
  const [v, setV] = useState(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/national-coverage', { method: 'POST', body: { value_chain: v.chain, year: Number(v.year), source: v.source.trim(), ...Object.fromEntries(VALUES.map((k) => [k, v[k] === '' ? null : Number(v[k])])) } }),
    onSuccess: () => { setV(empty); void qc.invalidateQueries({ queryKey: ['national-coverage'] }); toast(t('ncov.form.saved')); },
  });
  return (
    <form noValidate className="card stack" style={gap(16)} aria-labelledby="h-ncov-form" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (!v.chain) er.chain = t('ncov.form.errChain');
      if (!v.year) er.year = t('ncov.form.errYear');
      if (v.source.trim().length < 3) er.source = t('ncov.form.errSource');
      if (VALUES.every((k) => v[k] === '')) er.values = t('ncov.form.errValue');
      setErrs(er);
      if (!Object.keys(er).length) m.mutate();
    }}>
      <div className="card-head m-0"><h2 className="card-title" id="h-ncov-form">{t('ncov.form.title')}</h2></div>
      <p className="hint">{t('ncov.form.hint')}</p>
      <div className="form-grid">
        <Field label={t('common.valueChain')} error={errs.chain}>{(p) => <Select {...p} value={v.chain} onChange={(e) => setV({ ...v, chain: e.target.value })} placeholder={t('common.choose')} options={vc.options} groups={vc.groups} />}</Field>
        <Field label={t('ncov.form.year')} error={errs.year}>{(p) => <Input {...p} inputMode="numeric" value={v.year} onChange={(e) => setV({ ...v, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} />}</Field>
        {VALUES.map((k) => (
          <Field key={k} label={t(`ncov.col.${k.replace('_t', '')}`)} optional error={k === 'production_t' ? errs.values : undefined}>
            {(p) => <Input {...p} inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: decimal(e.target.value) })} />}
          </Field>
        ))}
        <Field label={t('ncov.form.source')} hint={t('ncov.form.sourceHint')} error={errs.source}>{(p) => <Input {...p} value={v.source} maxLength={300} onChange={(e) => setV({ ...v, source: e.target.value })} />}</Field>
      </div>
      {m.error && <Alert tone="danger" live>{m.error.message}</Alert>}
      <div className="cluster justify-end"><Button type="submit" busy={m.isPending}>{t('common.save')}</Button></div>
    </form>
  );
}

function ImportForm() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const m = useMutation({
    mutationFn: (rows: unknown[]) => api<{ imported: number }>('/national-coverage/import', { method: 'POST', body: { rows } }),
    onSuccess: (r) => { setText(''); setProblems([]); void qc.invalidateQueries({ queryKey: ['national-coverage'] }); toast(t('ncov.import.done', { n: r.imported })); },
    onError: (e) => {
      const rows = e instanceof ApiError ? (e.body.fields as unknown as { rows?: Record<string, string[]>[] } | undefined)?.rows : undefined;
      setProblems((rows ?? []).flatMap((r, i) => Object.entries(r ?? {}).map(([f, msgs]) => t('ncov.import.rowError', { n: i + 1, msg: `${f} : ${[msgs].flat().join(' ')}` }))));
    },
  });
  const submit = () => {
    try {
      const data: unknown = JSON.parse(text);
      const rows = Array.isArray(data) ? data : (data as { rows?: unknown[] }).rows;
      if (!Array.isArray(rows)) throw new Error('rows');
      setProblems([]);
      m.mutate(rows);
    } catch { setProblems([t('ncov.import.errJson')]); }
  };
  return (
    <form noValidate className="card stack" style={gap(16)} aria-labelledby="h-ncov-import" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="card-head m-0"><h2 className="card-title" id="h-ncov-import">{t('ncov.import.title')}</h2></div>
      <p className="hint">{t('ncov.import.hint')}</p>
      <Field label={t('ncov.import.label')}>{(p) => <Textarea {...p} rows={8} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
      {problems.length > 0 && <Alert tone="danger" live><ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul></Alert>}
      {m.error && problems.length === 0 && <Alert tone="danger" live>{m.error.message}</Alert>}
      <div className="cluster justify-end"><Button type="submit" variant="secondary" busy={m.isPending} disabled={!text.trim()}>{t('ncov.import.button')}</Button></div>
    </form>
  );
}
