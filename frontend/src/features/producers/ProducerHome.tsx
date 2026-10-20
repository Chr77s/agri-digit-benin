import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Icon, Skeleton, buttonCls, fmtDate, fmtNum, speak, useIsMobile, type IconName } from '../../shared/ui';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import type { Campaign, Notification } from '../../shared/api/types';
import { useOfflineStatus } from '../outbox/offlineQueue';
import { useAuth } from '../auth/AuthContext';
import { useCampaigns, useParcels } from '../parcels/api';
import { useNotifications } from '../alerts/api';
import { useSupportActions, useSupports } from '../supports/SupportsPage';
import { useForecast } from '../weather/api';
import { ListenGhost, StageBar } from './producerKit';

const dayFmt = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short' });
const SHORTCUTS: { to: string; icon: IconName; key: string }[] = [
  { to: '/diagnostic', icon: 'leaf-scan', key: 'diagnosis' },
  { to: '/marche', icon: 'market', key: 'market' },
  { to: '/meteo-prix', icon: 'coins', key: 'prices' },
  { to: '/ma-carte', icon: 'id-card', key: 'card' },
];

export function ProducerHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  const parcels = useParcels();
  const campaigns = useCampaigns();
  const notes = useNotifications();
  const firstName = (user?.full_name ?? '').split(/\s+/)[0] ?? '';
  const where = [place(user?.commune), place(user?.department)].filter(Boolean).join(', ');
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const alert = (notes.data ?? []).find((n) => !(n.is_read ?? n.read_at));
  const mobile = useIsMobile();

  if (mobile) {
    return (
      <MobileHome firstName={firstName} place={place(user?.commune) || where} commune={user?.commune ?? ''} where={where}
        alert={alert}
        campaigns={campaigns} parcels={parcels} />
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('home.hello', { name: firstName })}</h1>
          <p className="page-desc">{t('home.desc', { date: today.charAt(0).toUpperCase() + today.slice(1), where: where || t('common.notAvailable') })}</p>
        </div>
        <div className="page-actions">
          <ListenGhost text={t('home.listenPage', { name: firstName })} label={t('home.listenBtn')} />
          <Link className={buttonCls()} to="/assistant"><Icon name="chat" />{t('nav.assistant')}</Link>
        </div>
      </div>

      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        {alert && (
          <Alert tone="warn" live title={alert.title ?? t('notifications.message')}
            actions={<>
              <Link className={buttonCls({ variant: 'secondary', size: 'sm' })} to="/diagnostic"><Icon name="camera" />{t('home.sendPhoto')}</Link>
              <Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to="/messages">{t('home.readMessage')}</Link>
            </>}>
            {alert.body ?? alert.message}
          </Alert>
        )}

        <div className="split">
          <div className="stack" style={{ ['--gap' as string]: '20px' }}>
            <WeatherCard commune={user?.commune ?? ''} name={place(user?.commune) || where} />
            <Card title={t('home.stagesTitle')} sub={campaigns.data ? t('home.stagesSub', { count: campaigns.data.length }) : undefined}
              actions={<Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to="/campagnes">{t('nav.campaigns')}<Icon name="chevron-right" /></Link>}>
              <ParcelStages campaigns={campaigns} parcels={parcels} />
            </Card>
          </div>
          <div className="stack" style={{ ['--gap' as string]: '20px' }}>
            <TasksCard campaigns={campaigns.data ?? []} parcelName={(id) => parcels.data?.find((p) => p.id === id)?.name ?? ''} />
            <SupportCard />
            <Card title={t('home.shortcuts')}>
              <div className="shortcuts">
                {SHORTCUTS.map((s) => (
                  <Link key={s.to} className="shortcut" to={s.to}>
                    <span className="sc-ic"><Icon name={s.icon} /></span>
                    <span>{t(`home.sc.${s.key}`)}<small>{t(`home.sc.${s.key}Sub`)}</small></span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Accueil sous 640 px (maquettes/mobile : accueil, accueil-hors-ligne) ---------- */
const TILES: { to: string; icon: IconName; key: string }[] = [
  { to: '/appuis', icon: 'gift', key: 'supports' }, { to: '/mes-cooperatives', icon: 'users', key: 'coop' },
  { to: '/ma-carte', icon: 'id-card', key: 'card' }, { to: '/meteo-prix', icon: 'coins', key: 'prices' },
];

function MobileHome({ firstName, place, commune, where, alert, campaigns, parcels }: {
  firstName: string; place: string; commune: string; where: string; alert?: Notification;
  campaigns: Q<Campaign[]>; parcels: Q<{ id: string; name: string; area_ha: number; overlap_warning: boolean }[]>;
}) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const { online, pending } = useOfflineStatus();
  const fc = useForecast(commune, 5);
  const [now, ...next] = fc.days;
  const heavy = next.find((d) => d.rainMm >= 30);
  const c = campaigns.data?.[0];
  const p = c && parcels.data?.find((x) => x.id === c.parcel);
  return (
    <div className="m-home">
      <section className="m-hero" aria-labelledby="m-hello">
        <div className="m-hello">
          <div>
            <h1 id="m-hello">{t('home.hello', { name: firstName })}</h1>
            <p><Icon name="map-pin" size="sm" />{where || t('common.notAvailable')}</p>
          </div>
          {/* La cloche des messages reste dans l'en-tête compact de la coque, au-dessus. */}
          {'speechSynthesis' in window && (
            <button type="button" className="m-hero-btn m-hero-btn--listen" aria-label={t('home.listenBtn')} onClick={() => speak(t('home.listenPage', { name: firstName }))}><Icon name="megaphone" /></button>
          )}
        </div>
        <Link className="m-wx" to="/meteo-prix">
          <Icon name={now.icon} className="m-wx-ic" />
          <span className="m-wx-deg num">{now.tmax}°</span>
          <span className="m-wx-t">
            <b>{heavy ? t('home.heavyRain', { day: heavy.date.toLocaleDateString('fr-FR', { weekday: 'long' }) }) : t('home.rainToday', { pct: now.rainPct })}</b>
            {t('mobile.home.wxWhere', { place: place || t('common.notAvailable') })} · {fc.simulated ? t('weather.simulated') : t('weather.live')}
          </span>
        </Link>
      </section>

      {!online && (
        <div className="m-offline" role="status">
          <Icon name="wifi-off" />
          <span><b>{t('mobile.home.offline')}</b>{pending.length ? t('mobile.home.offlinePending', { count: pending.length }) : t('mobile.home.offlineNone')}</span>
          {pending.length > 0 && <Link to="/profil/envoi">{t('mobile.home.see')}</Link>}
        </div>
      )}

      <div className="m-home-body">
        {alert && (
          <Link className="m-alert" to="/messages">
            <span className="m-alert-ic"><Icon name="alert" /></span>
            <span><b>{alert.title ?? t('notifications.message')}</b>{alert.body ?? alert.message}</span>
            <Icon name="chevron-right" />
          </Link>
        )}

        {campaigns.isLoading || parcels.isLoading ? <Skeleton lines={2} />
          : c && p ? (
            <Link className="card m-stage" to="/campagnes">
              <span className="m-row">
                <span className="m-ico"><Icon name="sprout" /></span>
                <span className="m-grow"><b>{vcName(c.value_chain)} · {p.name}</b><small className="num">{t('parcels.ha', { n: fmtNum(p.area_ha, 2) })}</small></span>
                <Icon name="chevron-right" />
              </span>
              <StageBar stage={c.stage} />
            </Link>
          ) : (
            <Card><EmptyState icon="parcel" title={t('home.emptyTitle')} action={<Link className={buttonCls()} to="/parcelles"><Icon name="plus" />{t('home.emptyAction')}</Link>}>{t('home.emptyText')}</EmptyState></Card>
          )}

        {!online && pending.length > 0 && (
          <section aria-labelledby="m-pending">
            <h2 className="m-sec" id="m-pending">{t('mobile.home.pendingTitle')}</h2>
            <ul className="list card">
              {pending.slice(0, 3).map((w) => (
                <li key={w.id} className="list-item">
                  <span className="li-icon"><Icon name="cloud-upload" /></span>
                  <span className="li-main"><span className="li-title">{w.label}</span><span className="li-meta num">{new Date(w.created_at).toLocaleString('fr-FR')}</span></span>
                  <Badge tone="wait">{t('mobile.home.waiting')}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        <TasksCard campaigns={campaigns.data ?? []} parcelName={(id) => parcels.data?.find((x) => x.id === id)?.name ?? ''} />
        <SupportCard />

        <nav className="m-tiles" aria-label={t('home.shortcuts')}>
          {TILES.map((s) => <Link key={s.to} className="m-tile" to={s.to}><i><Icon name={s.icon} /></i>{t(`mobile.home.tile.${s.key}`)}</Link>)}
        </nav>
      </div>
    </div>
  );
}

function WeatherCard({ commune, name }: { commune: string; name: string }) {
  const { t } = useTranslation();
  const fc = useForecast(commune, 5);
  const [now, ...next] = fc.days;
  const heavy = next.find((d) => d.rainMm >= 30);
  return (
    <Card title={t('home.weatherTitle', { place: name })} sub={fc.simulated ? t('home.weatherSub') : t('weather.liveSub', { source: fc.source, time: new Date(fc.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })} actions={<Badge tone={fc.simulated ? 'sim' : 'ok'}>{fc.simulated ? t('weather.simulated') : t('weather.live')}</Badge>}>
      <div className="wx-now">
        <span className="wx-ic"><Icon name={now.icon} /></span>
        <div>
          <p className="wx-temp num">{now.tmax} °C</p>
          <p className="muted">{t('home.rainToday', { pct: now.rainPct })}</p>
        </div>
        <Link className={buttonCls({ variant: 'ghost', size: 'sm' })} style={{ marginLeft: 'auto' }} to="/meteo-prix">{t('home.week')}<Icon name="chevron-right" /></Link>
      </div>
      <ul className="wx-days" aria-label={t('home.nextDays')}>
        {next.map((d) => (
          <li key={d.date.toISOString()} className={d.rainMm >= 10 ? 'is-rain' : undefined}>
            <span>{dayFmt(d.date)}</span><Icon name={d.icon} /><b className="num">{d.tmax}°</b>
            <span className={`num${d.rainMm ? '' : ' muted'}`}>{t('weather.mm', { n: d.rainMm })}</span>
          </li>
        ))}
      </ul>
      {heavy && (
        <div className="mt-3.5">
          <Alert tone="info" icon="drop" title={t('home.heavyRain', { day: heavy.date.toLocaleDateString('fr-FR', { weekday: 'long' }) })}>{t('home.heavyRainTip')}</Alert>
        </div>
      )}
    </Card>
  );
}

type Q<T> = { isLoading: boolean; isError: boolean; error: unknown; data: T | undefined; refetch: () => unknown };

function ParcelStages({ campaigns, parcels }: { campaigns: Q<Campaign[]>; parcels: Q<{ id: string; name: string; area_ha: number; overlap_warning: boolean }[]> }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  if (campaigns.isLoading || parcels.isLoading) return <Skeleton />;
  if (campaigns.isError || parcels.isError) return <ErrorState error={campaigns.error ?? parcels.error} onRetry={() => { void campaigns.refetch(); void parcels.refetch(); }} />;
  const ps = parcels.data ?? [];
  if (ps.length === 0) {
    return (
      <EmptyState icon="parcel" title={t('home.emptyTitle')} action={<Link className={buttonCls()} to="/parcelles"><Icon name="plus" />{t('home.emptyAction')}</Link>}>
        {t('home.emptyText')}
      </EmptyState>
    );
  }
  const cs = campaigns.data ?? [];
  return (
    <>
      {ps.map((p) => {
        const c = cs.find((x) => x.parcel === p.id);
        return (
          <div key={p.id} className="parcel-row">
            <div>
              <Link to={`/parcelles?parcelle=${p.id}`}>{p.name}</Link>
              <p className="small muted">
                {c ? `${vcName(c.value_chain)} · ` : ''}<span className="num">{t('parcels.ha', { n: fmtNum(p.area_ha, 2) })}</span>
                {p.overlap_warning && <> · <Badge tone="wait">{t('parcels.overlapBadge')}</Badge></>}
              </p>
            </div>
            {c ? <StageBar stage={c.stage} /> : <Link className="small" to="/campagnes">{t('home.noCampaign')}</Link>}
          </div>
        );
      })}
    </>
  );
}

/** Repères selon le stade de chaque campagne ; cocher ne les enregistre pas (pas d'API de tâches). */
function TasksCard({ campaigns, parcelName }: { campaigns: Campaign[]; parcelName: (id: string) => string }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const [done, setDone] = useState<string[]>([]);
  return (
    <Card title={t('home.tasksTitle')} actions={campaigns.length > 0 ? <span className="small muted num">{t('home.tasksDone', { n: done.length, total: campaigns.length })}</span> : undefined}>
      {campaigns.length === 0
        ? <p className="muted">{t('home.tasksEmpty')}</p>
        : campaigns.map((c) => (
          <div key={c.id} className="task">
            <input className="cb" type="checkbox" id={`tk-${c.id}`} checked={done.includes(c.id)}
              onChange={(e) => setDone((d) => (e.target.checked ? [...d, c.id] : d.filter((x) => x !== c.id)))} />
            <label htmlFor={`tk-${c.id}`}>
              <span className="t-title">{t(`home.task.${c.stage}`, { crop: vcName(c.value_chain) })}</span>
              <span className="t-meta">{parcelName(c.parcel)} · {t(`stage.${c.stage}`)}</span>
            </label>
          </div>
        ))}
      <p className="hint mt-2">{t('home.tasksHint')}</p>
    </Card>
  );
}

function SupportCard() {
  const { t } = useTranslation();
  const q = useSupports();
  const { confirm } = useSupportActions();
  const pending = (q.data ?? []).filter((s) => s.status === 'remis');
  if (q.isLoading || q.isError || pending.length === 0) return null;
  const s = pending[0];
  return (
    <Card title={t('home.supportTitle')} actions={<Badge tone="wait">{t('home.supportPending', { count: pending.length })}</Badge>}>
      <ul className="list">
        <li className="list-item">
          <span className="li-icon"><Icon name="gift" /></span>
          <span className="li-main">
            <span className="li-title">{s.item}, {s.quantity} {s.unit}</span>
            <span className="li-meta">{t('home.supportMeta', { date: fmtDate(s.created_at), repay: s.repayable ? t('home.repayable') : t('home.notRepayable') })}</span>
          </span>
        </li>
      </ul>
      {confirm.error && <Alert tone="danger" live>{confirm.error.message}</Alert>}
      <div className="cluster mt-3">
        <Button icon="check" busy={confirm.isPending} onClick={() => confirm.mutate(s.id)}>{t('home.supportConfirm')}</Button>
        <Link className={buttonCls({ variant: 'ghost' })} to="/appuis">{t('home.supportAll')}</Link>
      </div>
    </Card>
  );
}
