import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, ThemeToggle, Toaster, spriteHref } from '../../shared/ui';
import { LangButton } from '../../app/LangButton';
import { HeroScene, StepAgent, StepHarvest, StepSignup } from './illustrations';
import { SiteFooter } from './SiteFooter';
import './home.css';

// Page d'accueil au style du tableau de bord : l'essentiel seulement (promesse, trois étapes, inscription).
// L'ancienne version, en 3D, reste dans features/landing (route /accueil-3d).
const STEPS = [['s1', StepSignup], ['s2', StepAgent], ['s3', StepHarvest]] as const;

export function HomePage() {
  const { t } = useTranslation();
  useEffect(() => { document.title = `${t('app.name')} · ${t('landing.badge')}`; }, [t]);

  return (
    <div className="hm">
      <a href="#hm-main" className="skip-link">{t('landing.skip')}</a>

      <header className="hm-head">
        <div className="hm-head-in">
          <Link to="/" className="hm-brand"><svg aria-hidden><use href={spriteHref('logo')} /></svg><span>{t('app.name')}</span></Link>
          <span className="hm-spacer" />
          <LangButton className="btn btn-icon hm-lang" />
          <ThemeToggle />
          <Link className="btn btn-ghost hm-login" to="/connexion">{t('landing.login')}</Link>
          <Link className="btn btn-primary" to="/inscription">{t('landing.registerShort')}</Link>
        </div>
      </header>

      <main id="hm-main" tabIndex={-1}>
        <section className="hm-hero hm-in" aria-labelledby="hm-h1">
          <div className="hm-hero-copy">
            <p className="hm-badge"><span className="hm-flag" aria-hidden="true" />{t('landing.badge')}</p>
            <h1 id="hm-h1">{t('landing.hero.title')}</h1>
            <p className="hm-lead">{t('vitrine.hero.lead')}</p>
            <div className="hm-cta">
              <Link className="btn btn-primary btn-lg" to="/inscription">{t('landing.register')}<Icon name="arrow-right" /></Link>
              <Link className="btn btn-secondary btn-lg" to="/connexion">{t('landing.login')}</Link>
            </div>
          </div>
          <figure className="hm-scene">
            <HeroScene />
            <div className="hm-chip hm-chip--mint"><Icon name="parcel" /><span><small>{t('vitrine.hero.cardArea')}</small><strong>{t('vitrine.hero.cardAreaValue')}</strong></span></div>
            <div className="hm-chip hm-chip--peach"><Icon name="cloud-sun" /><span><small>{t('vitrine.hero.cardAlertPlace')}</small><strong>{t('vitrine.hero.cardAlert')}</strong></span></div>
            <div className="hm-chip hm-chip--butter"><Icon name="sprout" /><span><small>{t('vitrine.hero.cardStageDay')}</small><strong>{t('vitrine.hero.cardStage')}</strong></span></div>
          </figure>
        </section>

        <section className="hm-steps-wrap hm-in" aria-labelledby="hm-how">
          <h2 id="hm-how">{t('landing.how.title')}</h2>
          <ol className="hm-steps">
            {STEPS.map(([k, Ill], i) => (
              <li key={k} className="card hm-step" style={{ '--i': i } as React.CSSProperties}>
                <Ill />
                <span className="hm-num" aria-hidden="true">{i + 1}</span>
                <h3>{t(`landing.how.${k}.title`)}</h3>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
      <Toaster />
    </div>
  );
}
