import * as RD from '@radix-ui/react-dialog';
import * as DM from '@radix-ui/react-dropdown-menu';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { LEGAL_DOCS } from '../features/legal/LegalPage';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';
import { syncQueue, useOfflineStatus } from '../features/outbox/offlineQueue';
import { ConflictsPanel } from '../features/outbox/ConflictsPanel';
import { MARKETS_NAV } from '../features/markets/nav';
import { useNotifications } from '../features/alerts/api';
import { Avatar, Button, Icon, TabBar, ThemeToggle, Toaster, spriteHref, toast, type IconName } from '../shared/ui';
import { useTheme } from '../shared/theme/useTheme';
import type { Role, User } from '../shared/api/types';
import i18n from '../i18n';

/** Entrée de navigation ; `group` = clé navGroup.* de la rubrique (rubriques reprises de maquettes/web/kit.js). */
export interface NavItem { to: string; key: string; icon: IconName; group?: string }
const g = (group: string | undefined, items: [string, string, IconName][]): NavItem[] => items.map(([to, key, icon]) => ({ to, key, icon, group }));

// La 1re entrée de chaque rôle est sa page d'arrivée (App.tsx).
export const NAV: Record<Role, NavItem[]> = {
  producteur: [
    ...g('farm', [['/', 'home', 'home'], ['/parcelles', 'parcels', 'parcel'], ['/campagnes', 'campaigns', 'calendar'], ['/sols', 'lands', 'wheat'], ['/amenagements', 'schemes', 'drop']]),
    ...g('advice', [['/assistant', 'assistant', 'chat'], ['/diagnostic', 'diagnosis', 'leaf-scan'], ['/meteo-prix', 'weatherPrices', 'cloud-sun'], ['/risques-climatiques', 'climate', 'sun'], ['/satellite', 'satellite', 'satellite']]),
    ...g('sell', [['/marche', 'market', 'market'], ['/appuis', 'mySupports', 'gift'], ['/remboursements', 'repayments', 'coins'], ['/revenu', 'revenue', 'trend'], ['/materiels', 'equipment', 'truck'], ['/mecanisation', 'mechanization', 'truck'], ['/pmea', 'pmea', 'building'], ['/programmes', 'programs', 'clipboard'], ['/mes-cooperatives', 'myCoops', 'users'], ['/tracabilite', 'trace', 'layers'], ['/services', 'services', 'sprout']]),
    ...g('rights', [['/ma-carte', 'card', 'id-card'], ['/messages', 'notifications', 'mail'], ['/contestations', 'contests', 'scale'], ['/consentements', 'consents', 'shield-check']]),
  ],
  agent_atda: [
    ...g('field', [['/', 'home', 'home'], ['/producteurs', 'producers', 'users'], ['/alertes', 'alerts', 'megaphone'], ['/boite-envoi', 'outbox', 'send'], ['/meteo-prix', 'weatherPrices', 'cloud-sun']]),
    ...g('programs', [['/candidatures', 'applications', 'file-text'], ['/selection', 'selection', 'list-check'], ['/appuis', 'supports', 'gift'], ['/semences', 'seeds', 'sprout'], ['/recouvrement', 'recovery', 'coins'], ['/contestations', 'contestsReview', 'scale']]),
    ...g('chains', [['/cooperatives', 'cooperatives', 'building'], ['/organisations', 'organisations', 'network'], ['/recoltes-signalees', 'flaggedHarvests', 'flag'], ['/tracabilite', 'trace', 'layers'], ['/satellite', 'satellite', 'satellite'], ['/amenagements', 'schemes', 'drop'], ['/sols', 'lands', 'wheat'], ['/risques-climatiques', 'climate', 'sun'], ['/materiels', 'equipmentStaff', 'truck'], ['/pmea', 'pmea', 'building']]),
    ...g('followUp', [['/tableau-de-bord', 'dashboard', 'dashboard'], ['/suivi-evaluation', 'sea', 'chart-bar'], ['/couverture', 'coverage', 'globe'], ['/carte-acteurs', 'actorsMap', 'map-pin'], ['/services', 'services', 'sprout']]),
  ],
  agronome_inrab: g(undefined, [['/fiches', 'knowledge', 'book'], ['/diagnostic', 'diagnosisQueue', 'microscope'], ['/qualite-modeles', 'modelQuality', 'target'], ['/services', 'services', 'sprout']]),
  responsable_programme: [
    ...g(undefined, [['/programmes', 'programs', 'clipboard'], ['/selection', 'selection', 'list-check'], ['/candidatures', 'applications', 'file-text'], ['/recouvrement', 'recovery', 'coins']]),
    ...g('followUp', [['/tableau-de-bord', 'dashboard', 'dashboard'], ['/suivi-evaluation', 'sea', 'chart-bar'], ['/previsions', 'forecasts', 'trend'], ['/couverture', 'coverage', 'globe'], ['/carte-acteurs', 'actorsMap', 'map-pin'], ['/qualite-modeles', 'modelQuality', 'target'], ['/satellite', 'satellite', 'satellite'], ['/amenagements', 'schemes', 'drop'], ['/sols', 'lands', 'wheat'], ['/risques-climatiques', 'climate', 'sun'], ['/semences', 'seeds', 'sprout'], ['/materiels', 'equipmentStaff', 'truck'], ['/pmea', 'pmea', 'building'], ['/organisations', 'organisations', 'network'], ['/services', 'services', 'sprout']]),
  ],
  admin_maep: [
    ...g('steering', [['/tableau-de-bord', 'dashboard', 'dashboard'], ['/suivi-evaluation', 'sea', 'chart-bar'], ['/previsions', 'forecasts', 'trend'], ['/couverture', 'coverage', 'globe'], ['/carte-acteurs', 'actorsMap', 'map-pin'], ['/qualite-modeles', 'modelQuality', 'target'], ['/exports', 'exports', 'download'], ['/interoperabilite', 'interop', 'network']]),
    ...g('registry', [['/producteurs', 'producers', 'users'], ['/cooperatives', 'cooperatives', 'building'], ['/organisations', 'organisations', 'network'], ['/appuis', 'supports', 'gift'], ['/recouvrement', 'recovery', 'coins'], ['/recoltes-signalees', 'flaggedHarvests', 'flag'], ['/tracabilite', 'trace', 'layers'], ['/marche', 'market', 'market'], ['/satellite', 'satellite', 'satellite'], ['/amenagements', 'schemes', 'drop'], ['/sols', 'lands', 'wheat'], ['/risques-climatiques', 'climate', 'sun'], ['/semences', 'seeds', 'sprout'], ['/materiels', 'equipmentStaff', 'truck'], ['/pmea', 'pmea', 'building']]),
    ...g('communication', [['/alertes', 'alerts', 'megaphone'], ['/boite-envoi', 'outbox', 'send'], ['/langues', 'translations', 'languages'], ['/services', 'services', 'sprout']]),
    ...g('governance', [['/selection', 'selection', 'list-check'], ['/contestations', 'contestsReview', 'scale'], ['/comptes', 'admin', 'user-cog'], ['/journal', 'audit', 'scroll']]),
  ],
  auditeur_copil: g(undefined, [['/journal', 'audit', 'scroll'], ['/couverture', 'coverage', 'globe'], ['/carte-acteurs', 'actorsMap', 'map-pin'], ['/qualite-modeles', 'modelQuality', 'target'], ['/recouvrement', 'recovery', 'coins'], ['/amenagements', 'schemes', 'drop'], ['/sols', 'lands', 'wheat'], ['/risques-climatiques', 'climate', 'sun'], ['/semences', 'seeds', 'sprout'], ['/materiels', 'equipmentStaff', 'truck'], ['/pmea', 'pmea', 'building'], ['/organisations', 'organisations', 'network'], ['/services', 'services', 'sprout']]),
  agent_financier: g(undefined, [['/credit', 'credit', 'coins'], ['/recouvrement', 'recovery', 'wallet'], ['/services', 'services', 'sprout']]),
  gestionnaire_cooperative: g(undefined, [['/cooperatives', 'myCoop', 'building'], ['/marche', 'market', 'market'], ['/materiels', 'equipment', 'truck'], ['/mecanisation', 'mechanization', 'truck'], ['/pmea', 'pmea', 'building'], ['/collecte', 'collection', 'truck'], ['/tracabilite', 'trace', 'layers'], ['/organisations', 'organisations', 'network'], ['/services', 'services', 'sprout']]),
  transformateur: g(undefined, [['/marche', 'market', 'market'], ['/offres', 'offers', 'tag'], ['/remboursements', 'repayments', 'coins'], ['/pmea', 'pmea', 'building'], ['/collecte', 'collection', 'truck'], ['/tracabilite', 'trace', 'layers'], ['/services', 'services', 'sprout']]),
  distributeur: g(undefined, [['/marche', 'market', 'market'], ['/offres', 'offers', 'warehouse'], ['/pmea', 'pmea', 'building'], ['/collecte', 'collection', 'truck'], ['/tracabilite', 'trace', 'layers'], ['/services', 'services', 'sprout']]),
  repr_mtdi: g(undefined, [['/langues', 'translations', 'languages'], ['/suivi-evaluation', 'sea', 'chart-bar'], ['/satellite', 'satellite', 'satellite']]),
};

// Relevés de prix, analyses, stocks, enquêtes, formations et vitrine : rubrique « Marchés et formation » en fin de menu (features/markets/nav.ts).
for (const [role, items] of Object.entries(MARKETS_NAV) as [Role, [string, string, IconName][]][]) NAV[role].push(...g('markets', items));

/* ---------- Présentation mobile (< 640 px, maquettes/mobile/) ---------- */
// Onglets du bas par rôle (5 au plus, maquettes/mobile/m.js) ; un rôle absent garde le tiroir seul. Le reste du menu reste dans le tiroir.
export const TABS: Partial<Record<Role, NavItem[]>> = {
  agent_atda: [
    { to: '/', key: 'home', icon: 'home' }, { to: '/producteurs', key: 'producers', icon: 'users' }, { to: '/inscription', key: 'register', icon: 'plus' },
    { to: '/appuis', key: 'supports', icon: 'gift' }, { to: '/alertes', key: 'alerts', icon: 'megaphone' },
  ],
  producteur: [
    { to: '/', key: 'home', icon: 'home' }, { to: '/assistant', key: 'advice', icon: 'chat' }, { to: '/diagnostic', key: 'photo', icon: 'leaf-scan' },
    { to: '/marche', key: 'market', icon: 'market' }, { to: '/parcelles', key: 'parcels', icon: 'parcel' },
  ],
};

function MobileTabs({ role }: { role: Role }) {
  const { t } = useTranslation();
  const tabs = TABS[role];
  return tabs ? <TabBar label={t('mobile.tabs')} items={tabs.map((n) => ({ to: n.to, icon: n.icon, end: n.to === '/', label: t(`mobile.tab.${n.key}`) }))} /> : null;
}

/** Notification du système sans jamais lever : Chrome Android refuse `new Notification` (« Illegal constructor ») et exige le service worker. */
export async function showSystemNotification(title: string, opts: NotificationOptions) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.active) return void (await reg.showNotification(title, opts));
    new Notification(title, opts);
  } catch { /* notification refusée par le navigateur : le message reste dans « Mes messages » */ }
}

/** Message non lu arrivé depuis le dernier passage : notification du système si la personne l'a autorisée (premier lancement). */
function SystemNotifier() {
  const q = useNotifications({ refetchInterval: 5 * 60_000, refetchIntervalInBackground: true });
  useEffect(() => {
    if (!q.data || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem('adb-notified') ?? '[]') as string[]; } catch { /* rien de mémorisé */ }
    const fresh = q.data.filter((n) => !(n.read_at || n.is_read) && !seen.includes(n.id));
    try { localStorage.setItem('adb-notified', JSON.stringify([...seen, ...fresh.map((n) => n.id)].slice(-200))); } catch { /* idem */ }
    fresh.forEach((n) => void showSystemNotification(n.title ?? 'Agri-Digit Bénin', { body: n.body ?? n.message ?? '', tag: n.id }));
  }, [q.data]);
  return null;
}

const LANGS: [string, string][] = [['fr', 'Français'], ['fon', 'Fɔngbè'], ['bba', 'Baatɔnum'], ['yo', 'Yorùbá'], ['dnd', 'Dendi']];
const SIDEBAR_KEY = 'adb-sidebar';
const readCollapsed = () => { try { return localStorage.getItem(SIDEBAR_KEY) === 'collapsed'; } catch { return false; } };
const writeCollapsed = (on: boolean) => { try { localStorage.setItem(SIDEBAR_KEY, on ? 'collapsed' : 'open'); } catch { /* stockage indisponible : le choix ne sera pas gardé */ } };
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function LangSelect({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">{t('app.language')}</label>
      <select id={id} className={`select ${className}`} value={i18n.language} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
        {LANGS.map(([v, l]) => <option key={v} value={v}>{v === 'fr' ? l : `${l} (${t('lang.toValidate')})`}</option>)}
      </select>
    </>
  );
}

function ProtoBand() {
  const { t } = useTranslation();
  return (
    <div className="proto-band" role="note">
      <Icon name="info" />
      <span><strong>{t('app.protoBand')}</strong> · {t('app.protoText')}</span>
    </div>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="app-foot">
      <span>{t('app.footerShort')}</span>
      <nav aria-label={t('legal.nav')}>
        {LEGAL_DOCS.map(({ doc, to }) => <Link key={doc} to={to}>{t(`legal.${doc}.title`)}</Link>)}
      </nav>
    </footer>
  );
}

function OfflineBar() {
  const { t } = useTranslation();
  const { online, pending, discard } = useOfflineStatus();
  const qc = useQueryClient();
  useEffect(() => { if (online) void syncQueue(qc); }, [online, qc]);
  if (online && pending.length === 0) return null;
  return (
    <div role="status" aria-live="polite" className={`banner ${online ? 'banner--warn' : 'banner--offline'}`}>
      {!online && <p className="flex items-center gap-2"><Icon name="wifi-off" /> {t('app.offline')}</p>}
      {pending.length > 0 && (
        <details className="w-full">
          <summary className="min-h-touch cursor-pointer py-2">{t('app.pending', { count: pending.length })}</summary>
          <ul className="flex flex-col gap-1 pb-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <span>{p.label}</span>
                {p.error && <span>{t('app.rejected', { error: p.error })}</span>}
                {p.error && <Button variant="ghost" size="sm" className="!text-current" onClick={() => discard(p.id!)}>{t('app.discard')}</Button>}
              </li>
            ))}
          </ul>
          {online && <Button variant="secondary" size="sm" onClick={() => syncQueue(qc)}>{t('app.sendNow')}</Button>}
        </details>
      )}
    </div>
  );
}

/** État de la file d'attente hors ligne dans l'en-tête ; un clic envoie ce qui attend. */
function SyncButton() {
  const { t } = useTranslation();
  const { online, pending } = useOfflineStatus();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const n = pending.length;
  const state = !online ? 'offline' : busy ? 'syncing' : n ? 'pending' : 'online';
  const text = {
    online: t('app.syncOnline'), pending: t('app.syncPending', { count: n }), syncing: t('app.syncing'),
    offline: n ? t('app.syncOfflinePending', { count: n }) : t('app.syncOffline'),
  }[state];
  const onClick = async () => {
    if (state === 'offline') return toast({ type: 'offline', title: t('app.syncOffline'), text: t('app.wentOffline') });
    if (state !== 'pending') return state === 'online' && toast(t('app.syncDone'));
    setBusy(true);
    try { await syncQueue(qc); toast(t('app.syncSent')); } finally { setBusy(false); }
  };
  return (
    <button type="button" className="sync" data-state={state} aria-label={t('app.syncState', { state: text })} onClick={() => void onClick()}>
      <span className="sync-dot" aria-hidden />
      <Icon name={state === 'offline' ? 'wifi-off' : 'sync'} />
      <span className="sync-label">{text}</span>
    </button>
  );
}

/** Recherche de page : propose les entrées du menu du rôle et ouvre la première qui correspond. « / » y place le curseur. */
function SearchBox({ nav, inputRef, onDone }: { nav: NavItem[]; inputRef: React.RefObject<HTMLInputElement>; onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const f = fold(q.trim());
    if (!f) return;
    const hit = nav.find((n) => fold(t(`nav.${n.key}`)).includes(f));
    if (!hit) return toast({ type: 'info', text: t('app.searchNone', { q: q.trim() }) });
    navigate(hit.to); setQ(''); onDone();
  };
  return (
    <form className="tb-search search" role="search" onSubmit={submit}>
      <Icon name="search" />
      <label className="sr-only" htmlFor={id}>{t('app.search')}</label>
      <input ref={inputRef} className="input" id={id} type="search" list={`${id}-l`} placeholder={t('app.searchPlaceholder')} autoComplete="off"
        value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onDone()} />
      <datalist id={`${id}-l`}>{nav.map((n) => <option key={n.to + n.key} value={t(`nav.${n.key}`)} />)}</datalist>
      <kbd aria-hidden>/</kbd>
    </form>
  );
}

function SideNav({ user, nav, collapsed, onToggle, onNavigate, inDrawer }: { user: User; nav: NavItem[]; collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void; inDrawer?: boolean }) {
  const { t } = useTranslation();
  const gid = useId();
  // Rubriques consécutives : une liste par rubrique, titrée si la rubrique a un nom.
  const groups = nav.reduce<{ key?: string; items: NavItem[] }[]>((acc, n) => {
    const last = acc[acc.length - 1];
    if (last && last.key === n.group) last.items.push(n); else acc.push({ key: n.group, items: [n] });
    return acc;
  }, []);
  return (
    <>
      <div className="sb-head">
        <Link className="sb-brand" to={nav[0]?.to ?? '/'} aria-label={t('app.spaceHome')} onClick={onNavigate}>
          <svg aria-hidden><use href={spriteHref('logo')} /></svg><span>{t('app.name')}</span>
        </Link>
        {inDrawer && (
          <RD.Close asChild>
            <button type="button" className="btn btn-icon sb-close" aria-label={t('app.closeMenu')}><Icon name="x" /></button>
          </RD.Close>
        )}
      </div>
      <div className="sb-role"><b>{t(`roles.${user.role}`)}</b>{user.full_name}</div>
      <nav className="sb-nav" aria-label={t('app.mainNav')}>
        {groups.map((grp, i) => (
          <div key={i}>
            {grp.key && <p className="sb-group" id={`${gid}-${i}`}>{t(`navGroup.${grp.key}`)}</p>}
            <ul aria-labelledby={grp.key ? `${gid}-${i}` : undefined}>
              {grp.items.map((n) => {
                const label = t(`nav.${n.key}`);
                return (
                  <li key={n.to + n.key}>
                    <NavLink end to={n.to} className="sb-link" title={collapsed ? label : undefined} onClick={onNavigate}>
                      <Icon name={n.icon} /><span className="sb-label">{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        {inDrawer ? (
          <div className="flex flex-col gap-2 px-2 pb-1">
            <span className="sb-group !m-0">{t('app.language')}</span>
            <LangSelect />
          </div>
        ) : (
          <button type="button" className="sb-link sb-collapse w-full cursor-pointer border-0 bg-transparent" aria-expanded={!collapsed} aria-controls="sidebar"
            title={collapsed ? t('app.expand') : undefined} onClick={onToggle}>
            <Icon name="sidebar" /><span className="sb-label">{collapsed ? t('app.expand') : t('app.collapse')}</span>
          </button>
        )}
      </div>
    </>
  );
}

function ProfileMenu({ user }: { user: User }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const role = t(`roles.${user.role}`);
  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>
        <button type="button" className="profile-btn">
          <Avatar name={user.full_name} />
          <span className="pb-name">{user.full_name}<small>{role}</small></span>
          <Icon name="chevron-down" size="sm" />
          <span className="sr-only">{t('app.account')}</span>
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={6} className="menu is-open !static z-[1600]">
          <div className="menu-head"><b>{user.full_name}</b><span className="muted">{role}</span></div>
          {user.role === 'producteur' && (
            <>
              <DM.Item asChild><Link className="menu-item" to="/profil"><Icon name="user" />{t('profile.title')}</Link></DM.Item>
              <DM.Item asChild><Link className="menu-item" to="/consentements"><Icon name="shield-check" />{t('nav.consents')}</Link></DM.Item>
            </>
          )}
          <DM.CheckboxItem className="menu-item" checked={theme === 'dark'} onCheckedChange={toggle} onSelect={(e) => e.preventDefault()}>
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} />{t('app.darkMode')}
          </DM.CheckboxItem>
          <DM.Separator className="menu-sep" />
          <DM.Item className="menu-item menu-item--danger" onSelect={() => void signOut()}><Icon name="logout" />{t('app.logout')}</DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

function NotifLink() {
  const { t } = useTranslation();
  const q = useNotifications();
  const unread = (q.data ?? []).filter((n) => !(n.read_at || n.is_read)).length;
  return (
    <Link className="btn btn-icon tb-notif" to="/messages" aria-label={unread ? t('app.messagesUnread', { count: unread }) : t('app.messages')}>
      <Icon name="bell" />{unread > 0 && <span className="dot" aria-hidden>{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}

function Main({ children }: { children?: ReactNode }) {
  const location = useLocation();
  // isolate : les couches Leaflet (z-index 400+) restent sous l'en-tête collant.
  return <main id="main" tabIndex={-1} className="page isolate"><ErrorBoundary key={location.pathname}>{children ?? <Outlet />}</ErrorBoundary></main>;
}

function SkipLink() {
  const { t } = useTranslation();
  return <a href="#main" className="skip-link">{t('app.skip')}</a>;
}

/** Coque publique (connexion, inscription, légal, vérification) : pas de barre latérale. */
function PublicShell({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <ProtoBand />
      <header className="topbar">
        <Link to="/" className="tb-brand !inline-flex"><svg aria-hidden><use href={spriteHref('logo')} /></svg><span>{t('app.name')}</span></Link>
        <span className="tb-spacer" />
        <LangSelect className="w-auto" />
        <ThemeToggle />
      </header>
      <OfflineBar />
      <ConflictsPanel />
      <Main>{children}</Main>
      <Footer />
      <Toaster />
    </div>
  );
}

function AppShell({ user, children }: { user: User; children?: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const nav = NAV[user.role] ?? [];
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Sous 1024 px, la navigation passe dans un tiroir modal (Radix : focus piégé, Échap, voile, défilement bloqué, retour du focus).
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  // hideOthers de Radix laisse #root lisible ici (constaté au navigateur) : on le cache nous-mêmes aux lecteurs d'écran pendant l'ouverture.
  useEffect(() => {
    const root = document.getElementById('root');
    if (!open || !root) return;
    root.setAttribute('aria-hidden', 'true');
    return () => root.removeAttribute('aria-hidden');
  }, [open]);
  // « / » place le curseur dans la recherche, hors des champs de saisie.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (e.key !== '/' || e.ctrlKey || e.metaKey || el?.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el?.tagName ?? '')) return;
      e.preventDefault(); setSearching(true); requestAnimationFrame(() => searchRef.current?.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const toggleCollapsed = () => setCollapsed((c) => { writeCollapsed(!c); return !c; });
  return (
    <>
      <SkipLink />
      <ProtoBand />
      <div className={`shell${collapsed ? ' is-collapsed' : ''}${TABS[user.role] ? ' has-tabs' : ''}`}>
        <aside className="sidebar" id="sidebar" aria-label={t(`roles.${user.role}`)}>
          <SideNav user={user} nav={nav} collapsed={collapsed} onToggle={toggleCollapsed} />
        </aside>
        <div className="main">
          <header className={`topbar${searching ? ' is-searching' : ''}`}>
            <RD.Root open={open} onOpenChange={setOpen}>
              <RD.Trigger asChild>
                <button type="button" className="btn btn-icon tb-menu" aria-label={t('app.openMenu')}><Icon name="menu" /></button>
              </RD.Trigger>
              <RD.Portal>
                <RD.Overlay className="scrim z-[1500]" />
                <RD.Content aria-describedby={undefined} aria-modal="true" className="sidebar drawer-panel z-[1501]">
                  <RD.Title className="sr-only">{t('app.menu')}</RD.Title>
                  <SideNav user={user} nav={nav} inDrawer onNavigate={() => setOpen(false)} />
                </RD.Content>
              </RD.Portal>
            </RD.Root>
            <Link className="tb-brand" to={nav[0]?.to ?? '/'}><svg aria-hidden><use href={spriteHref('logo')} /></svg><span>Agri-Digit</span></Link>
            <SearchBox nav={nav} inputRef={searchRef} onDone={() => setSearching(false)} />
            <span className="tb-spacer" />
            <button type="button" className="btn btn-icon tb-search-toggle" aria-label={t('app.search')} aria-expanded={searching}
              onClick={() => { setSearching((s) => !s); requestAnimationFrame(() => searchRef.current?.focus()); }}>
              <Icon name="search" />
            </button>
            <SyncButton />
            <LangSelect className="tb-lang" />
            <NotifLink />
            <ProfileMenu user={user} />
          </header>
          <OfflineBar />
          <ConflictsPanel />
          <Main>{children}</Main>
          <Footer />
        </div>
      </div>
      <MobileTabs role={user.role} />
      {user.role === 'producteur' && <SystemNotifier />}
      <Toaster />
    </>
  );
}

export function Layout({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  return user ? <AppShell user={user}>{children}</AppShell> : <PublicShell>{children}</PublicShell>;
}
