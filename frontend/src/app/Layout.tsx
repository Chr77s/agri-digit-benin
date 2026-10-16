import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, WifiOff } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { syncQueue, useOfflineStatus } from '../features/outbox/offlineQueue';
import { Button } from '../shared/ui';
import type { Role } from '../shared/api/types';
import i18n from '../i18n';

export const NAV: Record<Role, { to: string; key: string }[]> = {
  producteur: [
    { to: '/', key: 'home' }, { to: '/parcelles', key: 'parcels' }, { to: '/campagnes', key: 'campaigns' }, { to: '/assistant', key: 'assistant' },
    { to: '/messages', key: 'notifications' }, { to: '/programmes', key: 'programs' }, { to: '/consentements', key: 'consents' },
  ],
  agent_atda: [
    { to: '/producteurs', key: 'producers' }, { to: '/alertes', key: 'alerts' }, { to: '/boite-envoi', key: 'outbox' },
    { to: '/candidatures', key: 'applications' }, { to: '/selection', key: 'selection' }, { to: '/tableau-de-bord', key: 'dashboard' },
  ],
  agronome_inrab: [{ to: '/fiches', key: 'knowledge' }],
  responsable_programme: [{ to: '/programmes', key: 'programs' }, { to: '/selection', key: 'selection' }, { to: '/candidatures', key: 'applications' }, { to: '/tableau-de-bord', key: 'dashboard' }],
  admin_maep: [
    { to: '/tableau-de-bord', key: 'dashboard' }, { to: '/comptes', key: 'admin' }, { to: '/exports', key: 'exports' }, { to: '/producteurs', key: 'producers' },
    { to: '/alertes', key: 'alerts' }, { to: '/boite-envoi', key: 'outbox' }, { to: '/selection', key: 'selection' }, { to: '/journal', key: 'audit' },
  ],
  auditeur_copil: [{ to: '/journal', key: 'audit' }],
  agent_financier: [{ to: '/credit', key: 'credit' }],
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
                {p.error && <span className="text-error">Refusée : {p.error}</span>}
                {p.error && <Button variant="ghost" onClick={() => discard(p.id!)}>Supprimer cette saisie</Button>}
              </li>
            ))}
          </ul>
          {online && <Button variant="secondary" onClick={() => syncQueue(qc)}>Envoyer maintenant</Button>}
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
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:bg-surface focus:p-2">{t('app.skip')}</a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex min-h-touch items-center gap-2 text-xl font-semibold text-brand">
            <img src="/icon.svg" alt="" width={32} height={32} /> {t('app.name')}
          </Link>
          {user && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted">{user.full_name}</span>
              <label className="flex items-center gap-2 text-sm">
                {t('app.language')}
                <select className="min-h-touch rounded border border-border bg-surface px-2" value={i18n.language} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
                  <option value="fr">Français</option>
                  <option value="fon">Fon (à valider)</option>
                  <option value="bba">Bariba (à valider)</option>
                </select>
              </label>
              <Button variant="ghost" onClick={() => void signOut()}><LogOut aria-hidden size={18} /> {t('app.logout')}</Button>
            </div>
          )}
        </div>
        {nav.length > 0 && (
          <nav aria-label="Navigation principale" className="mx-auto max-w-6xl overflow-x-auto px-4">
            <ul className="flex gap-1">
              {nav.map((n) => (
                <li key={n.to}>
                  <NavLink end to={n.to} className={({ isActive }) => `flex min-h-touch items-center whitespace-nowrap border-b-4 px-3 font-semibold ${isActive ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-text'}`}>
                    {t(`nav.${n.key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <OfflineBar />
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
