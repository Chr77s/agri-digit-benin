import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, ThemeToggle, spriteHref } from '../../shared/ui';
import { LangButton } from '../../app/LangButton';
import './site-footer.css';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Pied de page des pages publiques : l'accueil et les pages ouvertes à tous. */
export function SiteFooter() {
  const { t } = useTranslation();
  const toTop = () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  return (
    <footer className="sf" aria-label={t('site.footer.label')}>
      <div className="sf-in">
        <div className="sf-brand">
          <Link to="/" className="sf-logo"><svg aria-hidden><use href={spriteHref('logo')} /></svg><span>{t('app.name')}</span></Link>
          <p>{t('site.footer.tagline')}</p>
          <div className="sf-prefs" role="group" aria-label={t('site.footer.prefs')}>
            <LangButton className="btn btn-icon btn-secondary" />
            <ThemeToggle />
          </div>
        </div>

        <nav className="sf-col" aria-labelledby="sf-space">
          <h2 id="sf-space">{t('site.footer.space')}</h2>
          <ul>
            <li><Link to="/inscription">{t('site.footer.register')}</Link></li>
            <li><Link to="/connexion">{t('site.footer.login')}</Link></li>
            <li><Link to="/verification">{t('site.footer.verify')}</Link></li>
          </ul>
        </nav>

        <nav className="sf-col" aria-labelledby="sf-assist">
          <h2 id="sf-assist">{t('site.footer.assist')}</h2>
          <ul>
            <li><Link to="/contact">{t('site.footer.contact')}</Link></li>
            <li><Link to="/plan-du-site">{t('site.footer.sitemap')}</Link></li>
            <li><Link to="/accessibilite">{t('site.footer.accessibility')}</Link></li>
          </ul>
        </nav>

        <nav className="sf-col" aria-labelledby="sf-legal">
          <h2 id="sf-legal">{t('site.footer.legal')}</h2>
          <ul>
            <li><Link to="/mentions-legales">{t('legal.notice.title')}</Link></li>
            <li><Link to="/confidentialite">{t('legal.privacy.title')}</Link></li>
            <li><Link to="/conditions-utilisation">{t('legal.terms.title')}</Link></li>
          </ul>
        </nav>
      </div>

      <div className="sf-bottom">
        <p><span className="sf-flag" aria-hidden="true" />{t('site.footer.copyright', { year: new Date().getFullYear() })} <span className="sf-proto">{t('site.footer.proto')}</span></p>
        <button type="button" className="sf-top" onClick={toTop}><Icon name="arrow-up" />{t('site.footer.top')}</button>
      </div>
    </footer>
  );
}
