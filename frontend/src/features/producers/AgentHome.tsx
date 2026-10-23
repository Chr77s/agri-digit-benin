import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Avatar, Badge, EmptyState, ErrorState, Hero, Icon, Skeleton, buttonCls, fmtDate, fmtNum } from '../../shared/ui';
import { api, rows } from '../../shared/api/client';
import type { Contest, Paginated, SelectionRun } from '../../shared/api/types';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { useAlerts } from '../alerts/api';
import { useSupports } from '../supports/SupportsPage';
import { useHarvests } from '../harvests/HarvestPages';
import { useOfflineStatus } from '../outbox/offlineQueue';
import { useProducers } from './api';
import './agent.css';

/** Jours écoulés depuis une date ISO. */
export const daysSince = (iso?: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0);
/** Délai d'instruction d'une fiche au-delà duquel elle est signalée (jours). */
export const LATE_DAYS = 5;

// Contestations ouvertes des sélections validées (le contrat liste les contestations par sélection).
const useOpenContests = () => useQuery({
  queryKey: ['contests', 'open-all'],
  queryFn: async () => {
    const runs = rows(await api<Paginated<SelectionRun> | SelectionRun[]>('/selection-runs')).filter((r) => r.status === 'validee');
    const all = await Promise.all(runs.map((r) => api<Paginated<Contest> | Contest[]>(`/selection-runs/${r.id}/contests`).then(rows)));
    return all.flat().filter((c) => c.status === 'deposee');
  },
  retry: false,
});

/** Accueil de l'agent ATDA : file de travail du jour (maquettes/web/agent/accueil.html). */
export function AgentHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  const vcName = useVcName();
  const pending = useProducers({ status: 'en_attente' });
  const alerts = useAlerts();
  const supports = useSupports();
  const harvests = useHarvests({ to_check: true });
  const contests = useOpenContests();
  const { online, pending: queued } = useOfflineStatus();

  const fiches = [...(pending.data ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const mine = (by?: string) => by !== undefined && (by === user?.id || by === user?.phone);
  const urgent = (alerts.data ?? []).filter((a) => a.status === 'en_attente_validation' && !mine(a.created_by));
  const toConfirm = (supports.data ?? []).filter((s) => s.status === 'remis').sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const flagged = [...(harvests.data ?? [])].sort((a, b) => Math.abs(b.deviation_pct ?? 0) - Math.abs(a.deviation_pct ?? 0));
  const open = contests.data ?? [];
  const conflicts = queued.filter((q) => q.conflict).length;

  const loading = pending.isLoading || alerts.isLoading || supports.isLoading || harvests.isLoading;
  const nothing = !loading && !fiches.length && !urgent.length && !toConfirm.length && !flagged.length && !open.length;

  const queue = [
    { id: 'q-fiches', n: fiches.length, label: t('ag.home.qFiches', { count: fiches.length }) },
    { id: 'q-alertes', n: urgent.length, label: t('ag.home.qAlerts', { count: urgent.length }), hot: urgent.length > 0 },
    { id: 'q-appuis', n: toConfirm.length, label: t('ag.home.qSupports', { count: toConfirm.length }) },
    { id: 'q-recoltes', n: flagged.length, label: t('ag.home.qHarvests', { count: flagged.length }) },
    { id: 'q-contest', n: open.length, label: t('ag.home.qContests', { count: open.length }) },
  ];

  return (
    <>
      <Hero title={t('ag.home.title')}
        actions={<>
          <Link className={buttonCls({ variant: 'accent' })} to="/appuis"><Icon name="gift" />{t('ag.home.recordSupport')}</Link>
        </>}
        aside={!loading && <div className="hero-count"><b className="num">{queue.reduce((a, q) => a + q.n, 0)}</b><small>{t('refonte.todo')}</small></div>} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        {!online && <Alert tone="warn" icon="wifi-off" live>{t('ag.home.offline')}</Alert>}
        {conflicts > 0 && <Alert tone="warn">{t('ag.home.conflicts', { count: conflicts })}</Alert>}
        {pending.isError ? <ErrorState error={pending.error} onRetry={() => pending.refetch()} /> : loading ? <Skeleton lines={5} /> : nothing ? (
          <div className="card"><EmptyState title={t('ag.home.emptyTitle')} action={<Link className={buttonCls({ variant: 'secondary' })} to="/producteurs">{t('ag.home.seeRegistry')}</Link>}>{t('ag.home.emptyText')}</EmptyState></div>
        ) : null}

        <div className="stack">
          <div className="work">
            {urgent.length > 0 && (
              <section className="card" id="q-alertes" aria-labelledby="h-alertes">
                <div className="card-head">
                  <div><h2 className="card-title" id="h-alertes">{t('ag.home.urgentTitle', { count: urgent.length })}</h2><p className="card-sub">{t('ag.home.urgentSub')}</p></div>
                  <Badge tone="urgent">{t('alerts.severity.urgent')}</Badge>
                </div>
                <ul className="list">
                  {urgent.map((a) => (
                    <li key={a.id} className="list-item">
                      <span className="li-icon"><Icon name="megaphone" /></span>
                      <span className="li-main"><span className="li-title">{a.title}</span>
                        <span className="li-meta">{[place(a.department), a.communes.length ? t('ag.home.communesN', { count: a.communes.length }) : '', a.created_at ? fmtDate(a.created_at) : ''].filter(Boolean).join(' · ')}</span></span>
                      <span className="li-end"><Link className={buttonCls({ size: 'sm' })} to={`/alertes#a-${a.id}`}>{t('ag.home.review')}</Link></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(pending.isLoading || fiches.length > 0) && <section className="card" id="q-fiches" aria-labelledby="h-fiches">
              <div className="card-head">
                <div><h2 className="card-title" id="h-fiches">{t('ag.home.fichesTitle')}</h2><p className="card-sub">{t('ag.home.fichesSub')}</p></div>
                <Link className="small" to="/producteurs">{t('ag.home.allFiches', { count: fiches.length })}</Link>
              </div>
              {pending.isLoading ? <Skeleton /> : fiches.length === 0 ? <p className="small muted">{t('ag.home.noFiche')}</p> : (
                <ul className="list">
                  {fiches.slice(0, 3).map((p) => {
                    const d = daysSince(p.created_at);
                    return (
                      <li key={p.id} className="list-item">
                        <Avatar name={`${p.first_name} ${p.last_name}`} />
                        <span className="li-main"><span className="li-title">{p.first_name} {p.last_name}</span>
                          <span className="li-meta">{place(p.commune)} · {p.code} · {t('ag.home.registeredAgo', { count: d })}</span></span>
                        <span className="li-end">{d > LATE_DAYS && <Badge tone="wait">{t('ag.home.late')}</Badge>}<Link className={buttonCls({ variant: 'secondary', size: 'sm' })} to={`/producteurs/${p.id}`}>{t('ag.home.open')}</Link></span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>}

            {(supports.isLoading || toConfirm.length > 0) && <section className="card" id="q-appuis" aria-labelledby="h-appuis">
              <div className="card-head">
                <div><h2 className="card-title" id="h-appuis">{t('ag.home.supportsTitle')}</h2><p className="card-sub">{t('ag.home.supportsSub')}</p></div>
                <Link className="small" to="/appuis">{t('ag.home.supportsLink')}</Link>
              </div>
              {supports.isLoading ? <Skeleton /> : toConfirm.length === 0 ? <p className="small muted">{t('ag.home.noSupport')}</p> : (
                <ul className="list">
                  {toConfirm.slice(0, 3).map((s) => (
                    <li key={s.id} className="list-item">
                      <span className="li-icon"><Icon name="clock" /></span>
                      <span className="li-main"><span className="li-title">{s.producer_code} · {s.item}, {fmtNum(Number(s.quantity), 2)} {t(`supports.unit.${s.unit}`, s.unit)}</span>
                        <span className="li-meta">{s.created_at ? t('ag.home.handedAgo', { date: fmtDate(s.created_at), count: daysSince(s.created_at) }) : t('ag.home.handed')}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>}

            <div className="grid-fit" style={{ '--min': '300px' } as React.CSSProperties}>
              {(harvests.isLoading || flagged.length > 0) && <section className="card" id="q-recoltes" aria-labelledby="h-recoltes">
                <div className="card-head"><h2 className="card-title" id="h-recoltes">{t('nav.flaggedHarvests')}</h2><Link className="small" to="/recoltes-signalees">{t('ag.home.check')}</Link></div>
                {harvests.isLoading ? <Skeleton lines={2} /> : flagged.length === 0 ? <p className="small muted">{t('harvest.flaggedEmpty')}</p> : (
                  <ul className="list">
                    {flagged.slice(0, 3).map((h) => (
                      <li key={h.id} className="list-item">
                        <span className="li-main"><span className="li-title">{h.producer_code}{h.value_chain ? ` · ${vcName(h.value_chain)}` : ''}</span>
                          <span className="li-meta num">{t('ag.home.declaredFor', { q: fmtNum(h.quantity_kg), e: fmtNum(h.estimated_kg) })}</span></span>
                        <span className="li-end"><Badge tone="bad" icon={false}>{h.deviation_pct !== null && h.deviation_pct > 0 ? '+' : ''}{fmtNum(h.deviation_pct)} %</Badge></span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>}
              {(contests.isLoading || open.length > 0) && <section className="card" id="q-contest" aria-labelledby="h-contest">
                <div className="card-head"><h2 className="card-title" id="h-contest">{t('selection.contests')}</h2><Link className="small" to="/contestations">{t('ag.home.instruct')}</Link></div>
                {contests.isLoading ? <Skeleton lines={2} /> : open.length === 0 ? <p className="small muted">{t('ag.home.noContest')}</p> : (
                  <ul className="list">
                    {open.slice(0, 3).map((c) => (
                      <li key={c.id} className="list-item">
                        <span className="li-main"><span className="li-title">{t('ag.home.farm', { farm: c.farm_id })}</span>{c.created_at && <span className="li-meta">{t('contests.filedOn', { date: fmtDate(c.created_at) })}</span>}</span>
                        <span className="li-end"><Badge tone="wait">{t('ag.home.toInstruct')}</Badge></span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
