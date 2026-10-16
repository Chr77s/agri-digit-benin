import * as RD from '@radix-ui/react-dialog';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu, WifiOff, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { syncQueue, useOfflineStatus } from '../features/outbox/offlineQueue';
import { ConflictsPanel } from '../features/outbox/ConflictsPanel';
import { Button, ThemeToggle } from '../shared/ui';
import type { Role } from '../shared/api/types';
import i18n from '../i18n';

export const NAV: Record<Role, { to: string; key: string }[]> = {
  producteur: [
    { to: '/', key: 'home' }, { to: '/parcelles', key: 'parcels' }, { to: '/campagnes', key: 'campaigns' }, { to: '/assistant', key: 'assistant' },
    { to: '/diagnostic', key: 'diagnosis' }, { to: '/marche', key: 'market' }, { to: '/appuis', key: 'mySupports' }, { to: '/mes-cooperatives', key: 'myCoops' },
    { to: '/ma-carte', key: 'card' }, { to: '/satellite', key: 'satellite' }, { to: '/contestations', key: 'contests' },
    { to: '/messages', key: 'notifications' }, { to: '/programmes', key: 'programs' }, { to: '/consentements', key: 'consents' },
  ],
  agent_atda: [
    { to: '/producteurs', key: 'producers' }, { to: '/alertes', key: 'alerts' }, { to: '/boite-envoi', key: 'outbox' },
    { to: '/candidatures', key: 'applications' }, { to: '/selection', key: 'selection' }, { to: '/contestations', key: 'contestsReview' },
    { to: '/cooperatives', key: 'cooperatives' }, { to: '/appuis', key: 'supports' }, { to: '/recoltes-signalees', key: 'flaggedHarvests' },
    { to: '/satellite', key: 'satellite' }, { to: '/tableau-de-bord', key: 'dashboard' }, { to: '/suivi-evaluation', key: 'sea' },
  ],
  agronome_inrab: [{ to: '/fiches', key: 'knowledge' }, { to: '/diagnostic', key: 'diagnosisQueue' }],
  responsable_programme: [
    { to: '/programmes', key: 'programs' }, { to: '/selection', key: 'selection' }, { to: '/candidatures', key: 'applications' },
    { to: '/tableau-de-bord', key: 'dashboard' }, { to: '/suivi-evaluation', key: 'sea' }, { to: '/satellite', key: 'satellite' },
  ],
  admin_maep: [
    { to: '/tableau-de-bord', key: 'dashboard' }, { to: '/suivi-evaluation', key: 'sea' }, { to: '/comptes', key: 'admin' }, { to: '/exports', key: 'exports' },
    { to: '/producteurs', key: 'producers' }, { to: '/cooperatives', key: 'cooperatives' }, { to: '/appuis', key: 'supports' },
    { to: '/recoltes-signalees', key: 'flaggedHarvests' }, { to: '/marche', key: 'market' }, { to: '/langues', key: 'translations' },
    { to: '/satellite', key: 'satellite' }, { to: '/alertes', key: 'alerts' }, { to: '/boite-envoi', key: 'outbox' },
    { to: '/selection', key: 'selection' }, { to: '/contestations', key: 'contestsReview' }, { to: '/journal', key: 'audit' },
  ],
  auditeur_copil: [{ to: '/journal', key: 'audit' }],
  agent_financier: [{ to: '/credit', key: 'credit' }],
  gestionnaire_cooperative: [{ to: '/cooperatives', key: 'myCoop' }, { to: '/marche', key: 'market' }],
  transformateur: [{ to: '/marche', key: 'market' }],
  distributeur: [{ to: '/marche', key: 'market' }],
  repr_mtdi: [{ to: '/langues', key: 'translations' }, { to: '/suivi-evaluation', key: 'sea' }, { to: '/satellite', key: 'satellite' }],
};

function OfflineBar() {
  const { t } = useTranslation();
  const { online, pending, discard } = useOfflineStatus();
  const qc = useQueryClient();
  useEffect(() => { if (online) void syncQueue(qc); }, [online, qc]);
  if (online && pending.length === 0) return null;
  return (
    <div role="status" aria-live="polite" className="border-b border-warn bg-warn-bg px-4 py-2 text-warn">
      {!online && <p className="flex items-center gap-2 font-semibold"><WifiOff aria-hidden size={18} /> {t('app.offline')}</p>}
      {pending.length > 0 && (
        <details>
          <summary className="min-h-touch cursor-pointer py-2">{t('app.pending', { count: pending.length })}</summary>
          <ul className="flex flex-col gap-1 pb-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <span>{p.label}</span>
                {p.error && <span className="text-error">{t('app.rejected', { error: p.error })}</span>}
                {p.error && <Button variant="ghost" onClick={() => discard(p.id!)}>{t('app.discard')}</Button>}
              </li>
            ))}
          </ul>
          {online && <Button variant="secondary" onClick={() => syncQueue(qc)}>{t('app.sendNow')}</Button>}
        </details>
      )}
    </div>
  );
}

export function Layout({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const nav = user ? NAV[user.role] ?? [] : [];
  // Sous lg, navigation et compte passent dans un tiroir modal (Radix : focus piégé, Échap, voile, défilement bloqué, retour du focus).
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    const onChange = () => mq.matches && setOpen(false);
    if (!mq) return;
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
  const drawer = !!user || nav.length > 0;
  const account = user && (
    <>
      <span className="text-sm text-muted">{user.full_name}</span>
      <label className="flex items-center gap-2 text-sm">
        {t('app.language')}
        <select className="min-h-touch rounded border border-border bg-surface px-2" value={i18n.language} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
          <option value="fr">Français</option>
          <option value="fon">Fon ({t('lang.toValidate')})</option>
          <option value="bba">Bariba ({t('lang.toValidate')})</option>
        </select>
      </label>
      <Button variant="ghost" onClick={() => void signOut()}><LogOut aria-hidden size={18} /> {t('app.logout')}</Button>
    </>
  );
  const navList = (inDrawer: boolean) => nav.length > 0 && (
    <nav aria-label={t('app.mainNav')} className={inDrawer ? '' : 'mx-auto hidden max-w-6xl px-4 lg:block'}>
      <ul className={inDrawer ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1'}>
        {nav.map((n) => (
          <li key={n.to}>
            <NavLink end to={n.to} onClick={inDrawer ? () => setOpen(false) : undefined}
              className={({ isActive }) => `flex min-h-touch items-center px-3 font-semibold ${inDrawer ? 'border-l-4' : 'whitespace-nowrap border-b-4'} ${isActive ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-text'}`}>
              {t(`nav.${n.key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:bg-surface focus:p-2">{t('app.skip')}</a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex min-h-touch min-w-0 items-center gap-2 text-lg font-semibold text-brand sm:text-xl">
            <img src="/icon.svg" alt="" width={32} height={32} /> <span className="truncate">{t('app.name')}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <div className={drawer ? 'hidden lg:block' : ''}><ThemeToggle /></div>
            {account && <div className="hidden flex-wrap items-center gap-3 lg:flex">{account}</div>}
            {drawer && (
              <RD.Root open={open} onOpenChange={setOpen}>
                <RD.Trigger asChild>
                  <button type="button" aria-label={t('app.menu')}
                    className="inline-grid min-h-touch min-w-touch place-items-center rounded-full border border-border text-text hover:bg-bg lg:hidden">
                    <Menu aria-hidden size={22} />
                  </button>
                </RD.Trigger>
                <RD.Portal>
                  <RD.Overlay className="drawer-overlay fixed inset-0 z-[1500] bg-text/40 lg:hidden" />
                  <RD.Content aria-describedby={undefined} aria-modal="true"
                    className="drawer-panel fixed inset-y-0 right-0 z-[1501] flex w-[min(20rem,85vw)] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-4 text-text shadow lg:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <RD.Title className="text-xl font-semibold">{t('app.menu')}</RD.Title>
                      <RD.Close asChild>
                        <button type="button" aria-label={t('common.close')} className="inline-grid min-h-touch min-w-touch place-items-center rounded-full border border-border hover:bg-bg">
                          <X aria-hidden size={22} />
                        </button>
                      </RD.Close>
                    </div>
                    {navList(true)}
                    <div className="flex flex-col items-start gap-3 border-t border-border pt-4">
                      <ThemeToggle />
                      {account}
                    </div>
                  </RD.Content>
                </RD.Portal>
              </RD.Root>
            )}
          </div>
        </div>
        {navList(false)}
      </header>
      <OfflineBar />
      <ConflictsPanel />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6"><ErrorBoundary key={location.pathname}>{children ?? <Outlet />}</ErrorBoundary></main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-muted">
          <p>{t('app.footer')}</p>
          <Link to="/mentions-legales" className="inline-flex min-h-touch items-center font-semibold text-brand underline">{t('app.legal')}</Link>
        </div>
      </footer>
    </div>
  );
}
