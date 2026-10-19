import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePlaceName } from '../../shared/api/ref';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Icon, PageHeader, QueryState, Radio, buttonCls, fmtDate, fmtNum, speak, toast, useIsMobile, type IconName } from '../../shared/ui';
import { LANGS as LANG_NAMES } from '../onboarding/FirstLaunchPage';
import { useAuth } from '../auth/AuthContext';
import { syncQueue, useOfflineStatus } from '../outbox/offlineQueue';
import { useProducer } from './api';
import { StatusBadge } from './ProducersPages';
import './producteur.css';

const LANGS = ['fr', 'fon', 'bba', 'yo', 'dnd'];
const maskPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 4)} •• •• ${p.slice(-2)}` : p);

/** /profil (producteur) : identité lue sur la fiche, langue, saisies gardées sur le téléphone. Le serveur n'offre pas encore de changement de numéro ni de suppression en libre-service : la page l'explique au lieu de le simuler. */
export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { section } = useParams();
  const mobile = useIsMobile();
  // Sous 640 px : un menu, puis un écran par rubrique (/profil/langue, /profil/donnees, /profil/envoi, /profil/aide).
  if (mobile) return <MobileProfile section={section} />;
  return (
    <>
      <PageHeader title={t('profile.title')} desc={t('profile.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('profile.title') }]} />
      <div className="split">
        <div className="stack" style={{ ['--gap' as string]: '20px' }}>
          {user?.producer_id ? <Identity id={user.producer_id} /> : <Alert tone="warn">{t('profile.noProducer')}</Alert>}
          {user && (
            <Card title={t('profile.phoneTitle')}>
              <p>{t('profile.phoneNow')} <b className="num">{maskPhone(user.phone)}</b></p>
              <p className="hint mt-2">{t('profile.phoneHelp')}</p>
            </Card>
          )}
          <LanguageCard />
        </div>
        <div className="stack" style={{ ['--gap' as string]: '20px' }}>
          <OfflineCard />
          <Card title={t('profile.delTitle')}>
            <p className="small">{t('profile.delText')}</p>
            <Link className={`${buttonCls({ variant: 'secondary' })} mt-3`} to="/consentements"><Icon name="shield-check" />{t('profile.delLink')}</Link>
          </Card>
        </div>
      </div>
    </>
  );
}

function Identity({ id }: { id: string }) {
  const { t } = useTranslation();
  const q = useProducer(id);
  const place = usePlaceName();
  return (
    <QueryState q={q}>
      {(p) => {
        const name = `${p.first_name} ${p.last_name}`;
        return (
          <section className="card" aria-labelledby="prof-id">
            <div className="card-head">
              <div className="cluster" style={{ alignItems: 'center' }}>
                <Avatar name={name} size="lg" dark />
                <div><h2 className="card-title" id="prof-id">{name}</h2><p className="card-sub num">{t('profile.idSub', { code: p.code })}</p></div>
              </div>
              <StatusBadge s={p.status} />
            </div>
            <dl className="dl">
              <dt>{t('producers.npi')}</dt><dd className="num">{p.npi ? `•••• ${p.npi.slice(-4)}` : '—'} <Badge tone="sim">{t('profile.anip')}</Badge></dd>
              <dt>{t('producers.birth')}</dt><dd className="num">{fmtDate(p.birth_date)}</dd>
              <dt>{t('register.sex')}</dt><dd>{p.sex === 'F' ? t('register.female') : t('register.male')}</dd>
              <dt>{t('common.commune')}</dt><dd>{place(p.commune)} ({place(p.department)})</dd>
            </dl>
            <p className="hint mt-3">{t('profile.idHint')}</p>
          </section>
        );
      }}
    </QueryState>
  );
}

function LanguageCard() {
  const { t, i18n } = useTranslation();
  return (
    <Card title={t('profile.langTitle')}>
      <fieldset className="fieldset">
        <legend className="label">{t('profile.langLegend')}</legend>
        {LANGS.map((l) => (
          <Radio key={l} name="lang" checked={i18n.language === l} onChange={() => void i18n.changeLanguage(l)}
            label={<>{t(`ag.lang.${l}`)}{l !== 'fr' && <> <Badge tone="demo">{t('lang.toValidate')}</Badge></>}</>} />
        ))}
      </fieldset>
      <p className="hint mt-2">{t('profile.langHint')}</p>
    </Card>
  );
}

function OfflineCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { online, pending } = useOfflineStatus();
  return (
    <Card title={t('profile.offTitle')}>
      {!online && <Alert tone="warn" icon="wifi-off">{t('profile.offOffline')}</Alert>}
      {pending.length === 0
        ? <p className="small muted">{t('profile.offNone')}</p>
        : (
          <>
            <p><b className="num">{t('profile.offPending', { count: pending.length })}</b></p>
            <ul className="list">
              {pending.map((w) => <li key={w.id} className="list-item"><span className="li-icon"><Icon name={w.conflict || w.error ? 'alert' : 'cloud-upload'} /></span><span className="li-main"><span className="li-title">{w.label}</span><span className="li-meta num">{new Date(w.created_at).toLocaleString('fr-FR')}</span></span></li>)}
            </ul>
            <Button variant="secondary" className="mt-3" disabled={!online} onClick={() => { void syncQueue(qc).then(() => toast(t('profile.offSent'))); }}>{t('profile.offSend')}</Button>
          </>
        )}
      <p className="hint mt-3">{t('profile.offHint')}</p>
    </Card>
  );
}

/* ---------- Téléphone (maquettes/mobile : profil, reglage-langue, donnees-hors-ligne, file-envoi, aide) ---------- */
const SECTIONS = ['langue', 'donnees', 'envoi', 'aide'];
const mb = (n: number) => fmtNum(n / 1_048_576, n < 10_485_760 ? 1 : 0);

function MobileProfile({ section }: { section?: string }) {
  const { t } = useTranslation();
  const back = [{ label: t('profile.title'), to: '/profil' }];
  if (section === 'langue') return <><PageHeader title={t('mobile.prof.lang')} crumbs={back} /><MobileLanguage /></>;
  if (section === 'donnees') return <><PageHeader title={t('profile.offTitle')} crumbs={back} /><MobileStorage /></>;
  if (section === 'envoi') return <MobileQueue />;
  if (section === 'aide') return <><PageHeader title={t('mobile.prof.help')} crumbs={back} /><MobileHelp /></>;
  return <MobileMenu unknown={!!section && !SECTIONS.includes(section)} />;
}

function MRow({ to, icon, title, sub }: { to: string; icon: IconName; title: string; sub?: string }) {
  return (
    <li>
      <Link className="list-item" to={to}>
        <span className="li-icon"><Icon name={icon} /></span>
        <span className="li-main"><span className="li-title">{title}</span>{sub && <span className="li-meta">{sub}</span>}</span>
        <Icon name="chevron-right" />
      </Link>
    </li>
  );
}

function MobileMenu({ unknown }: { unknown: boolean }) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { pending } = useOfflineStatus();
  const used = useStorageUse();
  return (
    <>
      <PageHeader title={t('profile.title')} />
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        {unknown && <Alert tone="warn">{t('mobile.prof.unknown')}</Alert>}
        {user?.producer_id ? <MobileIdentity id={user.producer_id} /> : <Alert tone="warn">{t('profile.noProducer')}</Alert>}
        <ul className="list card">
          <MRow to="/ma-carte" icon="id-card" title={t('nav.card')} />
          <MRow to="/mes-cooperatives" icon="users" title={t('nav.myCoops')} />
          <MRow to="/profil/langue" icon="globe" title={t('mobile.prof.lang')} sub={LANG_NAMES.find(([c]) => c === i18n.language)?.[1]} />
          <MRow to="/consentements" icon="shield-check" title={t('nav.consents')} />
          <MRow to="/profil/donnees" icon="download" title={t('profile.offTitle')} sub={used ? t('mobile.prof.used', { mb: mb(used.usage) }) : undefined} />
          <MRow to="/profil/envoi" icon="cloud-upload" title={t('mobile.prof.queue')} sub={t('profile.offPending', { count: pending.length })} />
          <MRow to="/profil/aide" icon="help" title={t('mobile.prof.help')} />
        </ul>
        <Button variant="ghost" icon="logout" onClick={() => void signOut()}>{t('app.logout')}</Button>
      </div>
    </>
  );
}

function MobileIdentity({ id }: { id: string }) {
  const q = useProducer(id);
  return (
    <QueryState q={q}>
      {(p) => (
        <section className="card m-id" aria-label={`${p.first_name} ${p.last_name}`}>
          <Avatar name={`${p.first_name} ${p.last_name}`} size="lg" dark />
          <div><b>{p.first_name} {p.last_name}</b><span className="num">{p.code}</span><StatusBadge s={p.status} /></div>
        </section>
      )}
    </QueryState>
  );
}

function MobileLanguage() {
  const { t, i18n } = useTranslation();
  return (
    <div className="stack" style={{ ['--gap' as string]: '12px' }}>
      <fieldset className="list card m-langs">
        <legend className="sr-only">{t('profile.langLegend')}</legend>
        {LANG_NAMES.map(([code, name]) => (
          <div key={code} className="list-item">
            <Radio name="m-lang" checked={i18n.language === code} onChange={() => void i18n.changeLanguage(code)}
              label={name} hint={code === 'fr' ? t('mobile.fl.langSub.fr') : t('mobile.prof.toValidate')} />
            <button type="button" className="fl-say" aria-label={t('mobile.fl.listenLang', { name })} onClick={() => speak(name)}><Icon name="megaphone" /></button>
          </div>
        ))}
      </fieldset>
      <p className="hint">{t('profile.langHint')}</p>
    </div>
  );
}

/** Place occupée par l'application sur le téléphone, si le navigateur la donne. */
function useStorageUse() {
  const [v, setV] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => { if (e.usage !== undefined && e.quota) setV({ usage: e.usage, quota: e.quota }); }).catch(() => undefined);
  }, []);
  return v;
}

function MobileStorage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const used = useStorageUse();
  const { online } = useOfflineStatus();
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try { await qc.refetchQueries({ type: 'active' }); toast(t('mobile.prof.updated')); } finally { setBusy(false); }
  };
  const pct = used ? Math.round((used.usage / used.quota) * 100) : 0;
  return (
    <div className="stack" style={{ ['--gap' as string]: '12px' }}>
      <Card>
        {used ? (
          <>
            <div className="between"><b className="num">{t('mobile.prof.used', { mb: mb(used.usage) })}</b><span className="small muted num">{t('mobile.prof.free', { mb: mb(used.quota - used.usage) })}</span></div>
            <span className="m-meter" role="img" aria-label={t('mobile.prof.usedPct', { pct })}><i style={{ width: `${Math.max(2, pct)}%` }} /></span>
          </>
        ) : <p className="small muted">{t('mobile.prof.noEstimate')}</p>}
      </Card>
      <ul className="list card">
        <li className="list-item"><span className="li-icon"><Icon name="download" /></span><span className="li-main"><span className="li-title">{t('mobile.prof.keptPages')}</span><span className="li-meta">{t('mobile.prof.keptPagesSub')}</span></span></li>
        <li className="list-item"><span className="li-icon"><Icon name="cloud-upload" /></span><span className="li-main"><span className="li-title">{t('mobile.prof.keptWrites')}</span><span className="li-meta">{t('mobile.prof.keptWritesSub')}</span></span></li>
      </ul>
      {!online && <Alert tone="warn" icon="wifi-off">{t('profile.offOffline')}</Alert>}
      <div className="m-cta"><Button variant="secondary" icon="sync" busy={busy} disabled={!online} onClick={() => void refresh()}>{t('mobile.prof.updateNow')}</Button></div>
    </div>
  );
}

function MobileQueue() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { online, pending, discard } = useOfflineStatus();
  const [busy, setBusy] = useState(false);
  const waiting = pending.filter((w) => !w.error && !w.conflict);
  const blocked = pending.filter((w) => w.error || w.conflict);
  const send = async () => { setBusy(true); try { await syncQueue(qc); toast(t('profile.offSent')); } finally { setBusy(false); } };
  return (
    <>
      <PageHeader title={t('mobile.prof.queue')} desc={t('profile.offPending', { count: pending.length })} crumbs={[{ label: t('profile.title'), to: '/profil' }]} />
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        {!online && <p className="small cluster"><Icon name="wifi-off" />{t('mobile.prof.queueOffline')}</p>}
        {pending.length === 0 && <Card><EmptyState icon="cloud-upload" title={t('profile.offNone')}>{t('profile.offHint')}</EmptyState></Card>}
        {waiting.length > 0 && (
          <section aria-labelledby="q-wait">
            <h2 className="m-sec" id="q-wait">{t('mobile.prof.queueWaiting')}</h2>
            <ul className="list card">
              {waiting.map((w) => (
                <li key={w.id} className="list-item">
                  <span className="li-icon"><Icon name="cloud-upload" /></span>
                  <span className="li-main"><span className="li-title">{w.label}</span><span className="li-meta num">{new Date(w.created_at).toLocaleString('fr-FR')}</span></span>
                  <Badge tone="wait">{t('mobile.home.waiting')}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
        {blocked.length > 0 && (
          <section aria-labelledby="q-bad" className="stack" style={{ ['--gap' as string]: '10px' }}>
            <h2 className="m-sec" id="q-bad">{t('mobile.prof.queueFix')}</h2>
            {blocked.map((w) => (
              <Card key={w.id}>
                <p><b>{w.label}</b></p>
                {w.conflict
                  ? <p className="small muted mt-1">{t('mobile.prof.queueConflict')}</p>
                  : <p className="error-msg mt-1"><Icon name="alert" />{t('app.rejected', { error: w.error })}</p>}
                {!w.conflict && <div className="cluster mt-3"><Button variant="danger" size="sm" icon="trash" onClick={() => void discard(w.id!)}>{t('app.discard')}</Button></div>}
              </Card>
            ))}
          </section>
        )}
        {waiting.length > 0 && <div className="m-cta"><Button icon="sync" busy={busy} disabled={!online} onClick={() => void send()}>{t('profile.offSend')}</Button></div>}
      </div>
    </>
  );
}

function MobileHelp() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  return (
    <div className="stack" style={{ ['--gap' as string]: '12px' }}>
      <Card>
        <div className="m-row">
          <span className="m-ico m-ico--sun"><Icon name="user" /></span>
          <span className="m-grow"><b>{t('mobile.prof.agentTitle')}</b><small>{t('mobile.prof.agentSub', { place: place(user?.commune) || t('common.notAvailable') })}</small></span>
        </div>
        <p className="small mt-3">{t('mobile.prof.agentText')}</p>
      </Card>
      <ul className="list card">
        {'speechSynthesis' in window && (
          <li>
            <button type="button" className="list-item m-btn-row" onClick={() => speak(t('mobile.prof.guide'))}>
              <span className="li-icon"><Icon name="megaphone" /></span>
              <span className="li-main"><span className="li-title">{t('mobile.prof.guideTitle')}</span><span className="li-meta">{t('mobile.prof.guideSub')}</span></span>
            </button>
          </li>
        )}
        <li className="list-item"><span className="li-icon"><Icon name="phone" /></span><span className="li-main"><span className="li-title">{t('mobile.prof.ussd')}</span><span className="li-meta">{t('mobile.prof.ussdSub')}</span></span></li>
        <MRow to="/confidentialite" icon="shield-check" title={t('mobile.prof.privacy')} />
        <MRow to="/mentions-legales" icon="file-text" title={t('mobile.prof.legal')} />
      </ul>
    </div>
  );
}
