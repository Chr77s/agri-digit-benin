import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs } from '../../shared/api/client';
import type { SeaDashboard, SeaIndicator } from '../../shared/api/types';
import { Alert, Badge, Button, Card, EmptyState, Field, Icon, PageHeader, QueryState, Select, buttonCls, fmtNum } from '../../shared/ui';
import { useDepartments, useVcName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { HBars, Meter, OfflineNote, Src, StackBar, TableView, Val } from './viz';
import { SeaDetail } from './SeaDetail';

/** Indicateurs regroupés par question de suivi (maquette suivi-evaluation). `na:` = indicateur des TDR sans source : affiché « non disponible ». */
const GROUPS: { id: string; keys: string[] }[] = [
  { id: 'coverage', keys: ['producers_by_chain', 'area_by_chain'] },
  { id: 'inclusion', keys: ['women_share', 'under_35_share', 'application_acceptance'] },
  { id: 'production', keys: ['campaigns_by_stage', 'na:maize_yield', 'harvests_flagged'] },
  { id: 'access', keys: ['supports_value', 'na:credits_granted'] },
  { id: 'advice', keys: ['assistant_questions', 'assistant_escalation', 'na:adoption'] },
  { id: 'alerts', keys: ['alert_delivery'] },
];
const STAGES = ['semis', 'croissance', 'floraison', 'recolte', 'terminee'];

export function SeaPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const [dep, setDep] = useState('');
  // L'agent ATDA est borné à son département par le serveur : pas de filtre pour lui.
  const canFilter = user?.role !== 'agent_atda';
  const q = useQuery({ queryKey: ['sea', canFilter ? dep : ''], queryFn: () => api<SeaDashboard>(`/dashboard/sea${qs({ department: canFilter ? dep : '' })}`) });
  return (
    <div className="pv">
      <PageHeader
        title={t('pilotage.sea.title')}
        crumbs={[{ label: t('pilotage.crumb') }, { label: t('nav.sea') }]}
        desc={t('pilotage.sea.desc')}
        actions={<>
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>{t('common.print')}</Button>
          {user?.role === 'admin_maep' && <Link className={buttonCls()} to="/exports"><Icon name="download" />{t('pilotage.sea.export')}</Link>}
        </>}
      />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="warn" title={t('pilotage.sea.noteTitle')}>{t('pilotage.sea.noteText')}</Alert>
        <OfflineNote at={q.dataUpdatedAt} />
        <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {canFilter && (
            <div style={{ minWidth: 'min(100%, 260px)' }}>
              <Field label={t('common.department')}>
                {(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder={t('sea.allCountry')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}
              </Field>
            </div>
          )}
          {q.data && (
            <p className="cluster" aria-live="polite">
              <b>{t('sea.scope', { name: typeof q.data.scope === 'string' ? q.data.scope : q.data.scope?.name ?? '' })}</b>
              <Badge tone="demo">{t('pilotage.demo')}</Badge>
            </p>
          )}
        </div>
        <QueryState q={q} empty={(d) => d.indicators.length === 0} emptyText={<EmptyState title={t('sea.empty')} />}>
          {(d) => {
            const byKey = new Map(d.indicators.map((i) => [i.key, i]));
            const used = new Set(GROUPS.flatMap((g) => g.keys));
            const others = d.indicators.filter((i) => !used.has(i.key));
            return (
              <div className="sea-grid">
                {GROUPS.map((g) => (
                  <Card key={g.id} title={t(`pilotage.sea.q.${g.id}`)}>
                    {g.keys.map((k) => (k.startsWith('na:')
                      ? <Missing key={k} id={k.slice(3)} />
                      : byKey.has(k) ? <Ind key={k} ind={byKey.get(k)!} /> : null))}
                  </Card>
                ))}
                {others.length > 0 && <Card title={t('pilotage.sea.q.others')}>{others.map((i) => <Ind key={i.key} ind={i} />)}</Card>}
              </div>
            );
          }}
        </QueryState>
        <SeaDetail department={canFilter ? dep : ''} />
      </div>
    </div>
  );
}

/** Indicateur des TDR sans aucune source dans la plateforme : jamais un zéro. */
function Missing({ id }: { id: string }) {
  const { t } = useTranslation();
  return (
    <div className="ind">
      <span className="ind-name">{t(`pilotage.sea.na.${id}.label`)}</span>
      <span className="ind-val"><Val v={null} /></span>
      <span className="ind-def">{t(`pilotage.sea.na.${id}.why`)}</span>
      <span className="src">{t('pilotage.noSource')}</span>
    </div>
  );
}

function Ind({ ind }: { ind: SeaIndicator }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const pct = ind.unit === '%';
  const money = ind.unit === 'XOF';
  const value = money && ind.value !== null ? <>{fmtNum(ind.value / 1e6, 1)}&nbsp;{t('pilotage.sea.mfcfa')}</> : <Val v={ind.value} unit={pct ? '%' : ind.key === 'area_by_chain' ? 'ha' : ''} digits={pct || ind.key === 'area_by_chain' ? 1 : 0} />;
  const bd = ind.breakdown ?? [];
  const chainLabel = (l: string) => (ind.key.endsWith('_by_chain') ? vcName(l) : l);
  return (
    <div className="ind">
      <span className="ind-name">{ind.label}</span>
      <span className="ind-val num">{value}</span>
      {pct && ind.value !== null && <Meter pct={ind.value} label={`${ind.label} : ${fmtNum(ind.value, 1)} %`} />}
      {ind.key === 'producers_by_chain' && bd.length > 0 && (
        <div className="full mb-2 mt-1"><HBars data={bd.map((b) => ({ label: chainLabel(b.label), value: b.value })).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))} label={ind.label} /></div>
      )}
      {ind.key === 'area_by_chain' && bd.length > 0 && (
        <>
          <span className="ind-def">{bd.map((b) => `${vcName(b.label)} ${fmtNum(b.value, 1)} ha`).join(' · ')}</span>
          <TableView caption={ind.label} head={[t('common.valueChain'), t('pilotage.dash.areaHa')]} rows={bd.map((b) => [vcName(b.label), <Val key="v" v={b.value} />])} />
        </>
      )}
      {ind.key === 'campaigns_by_stage' && bd.length > 0 && (
        <StackBar label={ind.label} data={[...bd].sort((a, b) => STAGES.indexOf(a.label) - STAGES.indexOf(b.label)).map((b) => ({ label: t(`stage.${b.label}`, { defaultValue: b.label }), value: b.value ?? 0 }))} />
      )}
      {ind.key === 'supports_value' && bd.length > 0 && (
        <span className="ind-def">{bd.map((b) => `${b.label} : ${fmtNum((b.value ?? 0) / 1e6, 1)} ${t('pilotage.sea.mfcfa')}`).join(' · ')}</span>
      )}
      {ind.value === null ? <span className="src">{t('pilotage.noSource')}</span> : <span className="full"><Src source={ind.source} at={ind.updated_at} /></span>}
    </div>
  );
}
