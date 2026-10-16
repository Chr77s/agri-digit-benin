import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './landing-sections.css';

const WHO = ['producer', 'agent', 'coop', 'institution'] as const;
// colonnes du pied de page : ancres de la landing, puis accès aux espaces
const SECTIONS = ['comment', 'confiance', 'galerie', 'qui', 'faq'] as const;

export function WhoSection() {
  const { t } = useTranslation();
  return (
    <section id="qui" className="lps-section lps-who" aria-labelledby="lps-who-title">
      <div className="lps-inner">
        <h2 id="lps-who-title" className="lps-title">{t('landing.who.title')}</h2>
        <dl className="lps-who-list">
          {WHO.map((role) => (
            <div key={role} className="lps-who-row">
              <dt className="lps-who-name">{t(`landing.who.${role}.name`)}</dt>
              <dd className="lps-who-text">{t(`landing.who.${role}.text`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function LandingFooter({ calm, onToggleCalm }: { calm: boolean; onToggleCalm(): void }) {
  const { t } = useTranslation();
  return (
    <footer className="lps-footer">
      <div className="lps-inner">
        <div className="lps-footer-grid">
          <div className="lps-footer-about">
            <a className="lps-brand" href="#top">
              <img src="/icon.svg" width={32} height={32} alt="" />
              <span className="lps-brand-name">{t('app.name')}</span>
            </a>
            <p>{t('landing.footer.tagline')}</p>
            <p>{t('landing.footer.help')}</p>
          </div>
          <nav className="lps-footer-col" aria-labelledby="lps-f-platform">
            <h2 id="lps-f-platform">{t('landing.footer.platform')}</h2>
            <ul>
              {SECTIONS.map((id) => <li key={id}><a className="lps-footer-link" href={`#${id}`}>{t(`landing.footer.links.${id}`)}</a></li>)}
            </ul>
          </nav>
          <nav className="lps-footer-col" aria-labelledby="lps-f-spaces">
            <h2 id="lps-f-spaces">{t('landing.footer.spaces')}</h2>
            <ul>
              <li><Link className="lps-footer-link" to="/inscription">{t('landing.footer.links.register')}</Link></li>
              <li><Link className="lps-footer-link" to="/connexion">{t('landing.footer.links.login')}</Link></li>
            </ul>
          </nav>
          <div className="lps-footer-col">
            <h2>{t('landing.footer.info')}</h2>
            <ul>
              <li><Link className="lps-footer-link" to="/mentions-legales">{t('landing.footer.legal')}</Link></li>
              <li>
                <button type="button" className="lps-footer-link" aria-pressed={calm} onClick={onToggleCalm}>
                  {t(calm ? 'landing.motion.enable' : 'landing.motion.reduce')}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="lps-footer-bottom">
          <p>© {new Date().getFullYear()} {t('app.name')}</p>
          <p>{t('landing.footer.notice')}</p>
        </div>
      </div>
    </footer>
  );
}
