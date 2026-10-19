import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs, rows } from '../../shared/api/client';
import type { Dashboard, FarmAggregate, Indicator, SeaDashboard } from '../../shared/api/types';
import { Alert, Badge, Card, EmptyState, Field, Icon, PageHeader, QueryState, Select, Table, buttonCls, fmtDateTime, fmtNum } from '../../shared/ui';
import { useDepartments, useVcName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { HBars, OfflineNote, Src, Val } from './viz';

/** Indicateurs mis en avant dans la carte principale ; les autres vont dans le tableau. */
const HERO = ['producers_validated', 'producers_total', 'producers_women'];

const scopeName = (s: Dashboard['scope'], fallback: string) => (typeof s === 'string' ? s : s?.name ?? fallback);

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const vcName = useVcName();
  // L'agent ATDA est borné à son département par le serveur.
  const canFilter = user?.role !== 'agent_atda';
  const [dep, setDep] = useState(canFilter ? '' : user?.department ?? '');
  const dash = useQuery({ queryKey: ['dashboard', dep], queryFn: () => api<Dashboard>(`/dashboard${qs({ department: dep })}`) });
  const sea = useQuery({ queryKey: ['sea', dep], queryFn: () => api<SeaDashboard>(`/dashboard/sea${qs({ department: dep })}`) });
  const agg = useQuery({ queryKey: ['farm-agg', dep], queryFn: async () => rows(await api<FarmAggregate[]>(`/farms/aggregates${qs({ level: dep ? 'commune' : 'department', department: dep })}`)) });
  const byCommune = !!dep;

  return (
    <div className="pv">
      <PageHeader
        title={t('pilotage.dash.title')}
        crumbs={[{ label: t('pilotage.crumb') }, { label: t('nav.dashboard') }]}
        desc={t('pilotage.dash.desc')}
        actions={<>
          <Link className={buttonCls({ variant: 'secondary' })} to="/suivi-evaluation"><Icon name="chart-bar" />{t('nav.sea')}</Link>
          {user?.role === 'admin_maep' && <Link className={buttonCls()} to="/exports"><Icon name="download" />{t('pilotage.dash.export')}</Link>}
        </>}
      />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <form className="card card--flat filters" role="search" aria-label={t('pilotage.dash.filters')} onSubmit={(e) => e.preventDefault()}>
          {canFilter && (
            <Field label={t('common.department')}>{(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder={t('dashboard.allCountry')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
          )}
          {dash.dataUpdatedAt > 0 && (
            <p className="small muted ml-auto flex items-center gap-1" aria-live="polite">
              <Icon name="history" />{t('pilotage.dash.readAt', { date: fmtDateTime(new Date(dash.dataUpdatedAt).toISOString()), scope: scopeName(dash.data?.scope ?? '', t('admin.national')) })}
            </p>
          )}
        </form>
        <OfflineNote at={dash.dataUpdatedAt} />
        <Alert tone="demo" title={t('pilotage.demoTitle')}>{t('pilotage.dash.demoText')}</Alert>

        <QueryState q={dash} empty={(d) => d.indicators.length === 0} emptyText={<EmptyState title={t('dashboard.emptyIndicators')} />}>
          {(d) => <Indicators list={d.indicators} />}
        </QueryState>

        <div className="grid-fit" style={{ '--min': '380px', alignItems: 'start' } as React.CSSProperties}>
          <Card title={byCommune ? t('dashboard.farmsByCommune') : t('dashboard.farmsByDepartment')} sub={t('pilotage.dash.farmsSub')} actions={<Badge tone="demo">{t('pilotage.demo')}</Badge>}>
            <QueryState q={agg} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('dashboard.emptyFarms')} />}>
              {(d) => {
                const sorted = [...d].sort((a, b) => (b.farms ?? -1) - (a.farms ?? -1));
                const total = d.reduce((s, r) => s + (r.farms ?? 0), 0);
                return <>
                  <HBars data={sorted.map((r) => ({ label: r.name, value: r.farms }))} unit={t('pilotage.dash.farmsUnit')} describedBy="src-farms" label={byCommune ? t('dashboard.farmsByCommune') : t('dashboard.farmsByDepartment')} />
                  <p className="src mt-3" id="src-farms">{t('pilotage.dash.farmsSrc', { source: d[0].source, date: fmtDateTime(d[0].updated_at), total: fmtNum(total) })}</p>
                </>;
              }}
            </QueryState>
          </Card>
          <Card title={t('pilotage.dash.byChain')} sub={t('pilotage.dash.byChainSub')}>
            <QueryState q={sea} empty={(d) => !d.indicators.some((i) => i.key === 'producers_by_chain' && i.breakdown?.length)} emptyText={<EmptyState title={t('pilotage.dash.byChainEmpty')} />}>
              {(d) => {
                const prod = d.indicators.find((i) => i.key === 'producers_by_chain');
                const area = d.indicators.find((i) => i.key === 'area_by_chain');
                const chains = [...new Set([...(prod?.breakdown ?? []), ...(area?.breakdown ?? [])].map((b) => b.label))];
                const rowsVc = chains.map((c) => ({
                  vc: c, name: vcName(c),
                  producers: prod?.breakdown?.find((b) => b.label === c)?.value ?? null,
                  area: area?.breakdown?.find((b) => b.label === c)?.value ?? null,
                })).sort((a, b) => (b.producers ?? -1) - (a.producers ?? -1));
                return (
                  <div className="table-scroll">
                    <table className="data-table table--cards">
                      <caption className="sr-only">{t('pilotage.dash.byChain')}</caption>
                      <thead><tr><th scope="col">{t('common.valueChain')}</th><th scope="col" className="num">{t('pilotage.dash.validated')}</th><th scope="col" className="num">{t('pilotage.dash.areaHa')}</th><th scope="col" className="num">{t('pilotage.dash.yield')}</th></tr></thead>
                      <tbody>{rowsVc.map((r) => (
                        <tr key={r.vc}>
                          <td className="td-primary" data-label={t('common.valueChain')}><span className="cell-main">{r.name}</span></td>
                          <td className="num" data-label={t('pilotage.dash.validated')}><Val v={r.producers} digits={0} /></td>
                          <td className="num" data-label={t('pilotage.dash.areaHa')}><Val v={r.area} /></td>
                          <td className="num" data-label={t('pilotage.dash.yield')}><Val v={null} /></td>
                        </tr>
                      ))}</tbody>
                    </table>
                    {prod && <Src source={prod.source} at={prod.updated_at} />}
                  </div>
                );
              }}
            </QueryState>
          </Card>
        </div>

        <QueryState q={agg} empty={(d) => d.length === 0} emptyText={null}>
          {(d) => (
            <Table<FarmAggregate> title={byCommune ? t('dashboard.farmsByCommune') : t('dashboard.farmsByDepartment')} caption={t('dashboard.farmsCaption')} data={d} rowKey={(r) => r.name} exportName="fermes-poc" columns={[
              { key: 'name', label: byCommune ? t('common.commune') : t('common.department') },
              { key: 'farms', label: t('dashboard.farmsDetected'), num: true, render: (r) => <Val v={r.farms} digits={0} /> },
              { key: 'maize_ha', label: t('dashboard.maizeHa'), num: true, render: (r) => <Val v={r.maize_ha} /> },
              { key: 'source', label: t('common.source') },
              { key: 'updated_at', label: t('common.date'), num: true, render: (r) => fmtDateTime(r.updated_at) },
            ]} />
          )}
        </QueryState>
      </div>
    </div>
  );
}

function Indicators({ list }: { list: Indicator[] }) {
  const { t } = useTranslation();
  const k = (key: string) => list.find((i) => i.key === key);
  const main = k('producers_validated') ?? list[0];
  const total = k('producers_total');
  const women = k('producers_women');
  const rest = list.filter((i) => !HERO.includes(i.key) && i !== main);
  const share = total?.value && women?.value !== null && women?.value !== undefined ? Math.round((100 * women.value) / total.value) : null;
  return (
    <>
      <Card title={main.label} actions={<Badge tone="demo">{t('pilotage.demo')}</Badge>}>
        <div className="hero-ind">
          <p className="big num"><Val v={main.value} digits={0} /></p>
          {(total || women) && (
            <dl className="dl" style={{ flex: '1 1 320px' }}>
              {total && <><dt>{t('pilotage.dash.registered')}</dt><dd className="num"><Val v={total.value} digits={0} /></dd></>}
              {women && <><dt>{t('pilotage.dash.women')}</dt><dd className="num"><Val v={women.value} digits={0} />{share !== null && ` (${t('pilotage.dash.ofRegistered', { pct: share })})`}</dd></>}
            </dl>
          )}
        </div>
        <div className="mt-3"><Src source={main.source} at={main.updated_at} /></div>
      </Card>
      {rest.length > 0 && (
        <section className="table-card" aria-labelledby="h-ind">
          <div className="table-toolbar"><h2 className="card-title mr-auto" id="h-ind">{t('dashboard.others')}</h2></div>
          <div className="table-scroll">
            <table className="data-table table--cards">
              <caption className="sr-only">{t('pilotage.dash.indCaption')}</caption>
              <thead><tr><th scope="col">{t('dashboard.indicator')}</th><th scope="col" className="num">{t('dashboard.value')}</th><th scope="col">{t('common.source')}</th><th scope="col">{t('dashboard.updated')}</th></tr></thead>
              <tbody>
                {rest.map((r) => {
                  const na = r.value === null || r.value === undefined;
                  return (
                    <tr key={r.key} className={na ? 'ind-row-na' : undefined}>
                      <td className="td-primary" data-label={t('dashboard.indicator')}><span className="cell-main">{r.label}</span>{na && <span className="cell-sub">{t('pilotage.noSourceYet')}</span>}</td>
                      <td className="num" data-label={t('dashboard.value')}><Val v={r.value} unit={r.unit} /></td>
                      <td data-label={t('common.source')}>{na ? <span className="na">{t('pilotage.noSource')}</span> : r.source}</td>
                      <td className="num" data-label={t('dashboard.updated')}>{r.updated_at ? fmtDateTime(r.updated_at) : <span className="na">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
