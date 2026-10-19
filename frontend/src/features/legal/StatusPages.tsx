import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/client';
import { Button, Icon, buttonCls, fmtDateTime, type IconName } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import '../auth/access.css';
import art from '../auth/img/champ-1440.jpg';
import artSm from '../auth/img/champ-390.jpg';

function Art() {
  const { t } = useTranslation();
  return (
    <figure className="st-art">
      <picture><source media="(max-width: 860px)" srcSet={artSm} /><img src={art} alt="" width={1440} height={900} /></picture>
      <figcaption>{t('access.artCredit')}</figcaption>
    </figure>
  );
}

/** Page 404 : à brancher sur la route « * » d'App.tsx. */
export function NotFoundPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const links: [string, IconName, string, string][] = [
    ['/verification', 'qr', t('access.lnkVerify'), t('access.lnkVerifySub')],
    ...(user ? [] : [['/inscription', 'user', t('access.lnkRegister'), t('access.lnkRegisterSub')] as [string, IconName, string, string]]),
    ['/mentions-legales', 'file-text', t('access.lnkLegal'), t('access.lnkLegalSub')],
  ];
  return (
    <div className="st">
      <div className="st-text">
        <span className="st-code">{t('access.code404')}</span>
        <h1 className="st-title">{t('access.title404')}</h1>
        <p className="st-lead">{t('access.lead404')}</p>
        <p className="small muted">{t('access.asked')} <code className="st-path">{pathname}</code></p>
        <div className="cluster">
          <Link className={buttonCls()} to="/"><Icon name="home" />{t('access.backHome')}</Link>
          {!user && <Link className={buttonCls({ variant: 'secondary' })} to="/connexion">{t('login.signIn')}</Link>}
        </div>
        <nav className="st-links" aria-label={t('access.usefulPages')}>
          <h2>{t('access.maybe')}</h2>
          <ul className="list">
            {links.map(([to, icon, title, sub]) => (
              <li key={to}>
                <Link className="list-item" to={to}>
                  <span className="li-icon"><Icon name={icon} /></span>
                  <span className="li-main"><span className="li-title">{title}</span><span className="li-meta">{sub}</span></span>
                  <Icon name="chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <Art />
    </div>
  );
}

/**
 * Écran d'erreur réutilisable (plantage d'écran, serveur en panne, accès refusé).
 * `onRetry` par défaut : recharger la page. Les saisies hors ligne restent dans la file d'envoi (IndexedDB).
 */
export function ErrorPage({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const [at] = useState(() => new Date().toISOString());
  const status = error instanceof ApiError ? error.status : undefined;
  const kind = status === 403 ? 'forbidden' : status === 401 ? 'session' : status && status >= 500 ? 'server' : 'screen';
  return (
    <div className="st">
      <div className="st-text">
        <span className={`st-code${kind === 'forbidden' || kind === 'session' ? '' : ' st-code--bad'}`}>{t(`access.err.${kind}.code`, { status })}</span>
        <h1 className="st-title">{t(`access.err.${kind}.title`)}</h1>
        <p className="st-lead">{t(`access.err.${kind}.lead`)}</p>
        <div className="cluster">
          {kind === 'session'
            ? <Link className={buttonCls()} to="/connexion">{t('login.signIn')}</Link>
            : kind !== 'forbidden' && <Button icon="sync" onClick={onRetry ?? (() => window.location.reload())}>{t('common.retry')}</Button>}
          <Link className={buttonCls({ variant: 'secondary' })} to="/">{t('access.backHome')}</Link>
        </div>
        <p className="small muted" role="status">
          {t('access.errAt', { date: fmtDateTime(at) })}
          {error instanceof Error && error.message ? ` · ${error.message}` : ''}
        </p>
        <section className="card stack" aria-labelledby="h-agent" style={{ ['--gap' as string]: '10px' }}>
          <h2 className="card-title" id="h-agent">{t('access.stillTitle')}</h2>
          <p className="small">{t('access.stillText')}</p>
        </section>
      </div>
      <Art />
    </div>
  );
}
