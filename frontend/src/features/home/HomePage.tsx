import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Emblem, Icon, ThemeToggle, Toaster, fmtNum, type IconName } from '../../shared/ui';
import { LangButton } from '../../app/LangButton';
import relief from '../landing/relief.json';
import { GALLERY } from '../landing/gallery';
import { HeroScene, PartnerMark, StageIllustration, StepAgent, StepHarvest, StepSignup } from './illustrations';
import { SiteFooter } from './SiteFooter';
import './home.css';

// Page d'accueil au style du tableau de bord : toutes les rubriques, chacune réduite à un titre et une ligne.
// L'ancienne version, en 3D, reste dans features/landing (route /accueil-3d).
const NAV = ['comment', 'qui', 'confiance', 'faq'] as const;
const STATS: [string, IconName, string, number][] = [
  ['farms', 'wheat', 'mint', relief.total], ['departments', 'map-pin', 'peach', 12], ['communes', 'building', 'butter', 77], ['sectors', 'layers', 'sky', 13],
];
const STEPS = [['s1', StepSignup], ['s2', StepAgent], ['s3', StepHarvest]] as const;
const STAGES = ['semis', 'croissance', 'floraison', 'recolte'] as const;
const WHO: [string, IconName, string][] = [['producer', 'sprout', 'mint'], ['agent', 'clipboard', 'peach'], ['coop', 'users', 'butter'], ['institution', 'building', 'sky']];
const TRUST: [string, IconName][] = [['offline', 'wifi-off'], ['langs', 'languages'], ['consent', 'shield-check'], ['audit', 'scroll']];
const PARTNERS = ['maep', 'mtdi', 'atda', 'inrab', 'sonama', 'fnda'] as const;
const FAQ = ['q1', 'q3', 'q4'] as const;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Fait apparaître chaque bloc `data-reveal` quand il entre à l'écran ; sans observateur ou en mouvement réduit, tout reste visible. */
function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return;
    el.classList.add('hm-js');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}

const idx = (i: number) => ({ '--i': i }) as React.CSSProperties;

export function HomePage() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  useEffect(() => { document.title = t('app.name'); }, [t]);
  // arrivée depuis le pied de page d'une autre page : on va à la rubrique demandée
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [hash]);
  const label = (id: string) => (id === 'partenaires' ? t('vitrine.partners.title') : t(`landing.footer.links.${id}`));

  return (
    <div className="hm" ref={root}>
      <a href="#hm-main" className="skip-link">{t('landing.skip')}</a>

      <header className="hm-head">
        <div className="hm-head-in">
          <Link to="/" className="hm-brand" aria-label={t('app.name')}>
            <img className="hm-lockup" src="/brand/logo.png" width="205" height="54" alt={`${t('app.name')} : ${t('vitrine.partners.maep.name')}, ${t('landing.badge').split(' · ')[0]}`} />
            <span className="hm-brand-s"><Emblem size={32} /><span>{t('app.name')}</span></span>
          </Link>
          <nav className="hm-nav" aria-label={t('vitrine.nav.label')}>
            {NAV.map((id) => <a key={id} href={`#${id}`}>{label(id)}</a>)}
          </nav>
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
            <h1 id="hm-h1">{t('vitrine.hero.title')}</h1>
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

        <section className="hm-in hm-stats-wrap" aria-label={t('vitrine.hero.stats')}>
          <dl className="hm-stats" data-reveal>
            {STATS.map(([k, icon, tone, n]) => (
              <div key={k} className={`stat stat--${tone}`}>
                <span className="stat-ic"><Icon name={icon} /></span>
                <dt className="stat-label">{t(`landing.stats.${k}`)}</dt>
                <dd className="stat-value">{fmtNum(n)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="comment" className="hm-section hm-in" aria-labelledby="hm-how">
          <header className="hm-sec-head" data-reveal><h2 id="hm-how">{t('landing.how.title')}</h2></header>
          <ol className="hm-steps">
            {STEPS.map(([k, Ill], i) => (
              <li key={k} className="card hm-step" data-reveal style={idx(i)}>
                <Ill />
                <span className="hm-num" aria-hidden="true">{i + 1}</span>
                <h3>{t(`landing.how.${k}.title`)}</h3>
              </li>
            ))}
          </ol>
        </section>

        <section id="saison" className="hm-section hm-in" aria-labelledby="hm-season">
          <header className="hm-sec-head" data-reveal><h2 id="hm-season">{t('vitrine.season.title')}</h2></header>
          <ol className="hm-stages">
            {STAGES.map((s, i) => (
              <li key={s} className="card hm-stage" data-reveal style={idx(i)}>
                <StageIllustration stage={s} />
                <h3>{t(`landing.field.${s}.title`)}</h3>
              </li>
            ))}
          </ol>
        </section>

        <section id="qui" className="hm-section hm-in" aria-labelledby="hm-who">
          <header className="hm-sec-head" data-reveal><h2 id="hm-who">{t('landing.who.title')}</h2></header>
          <ul className="hm-who">
            {WHO.map(([k, icon, tone], i) => (
              <li key={k} className={`stat stat--${tone} hm-who-card`} data-reveal style={idx(i)}>
                <span className="stat-ic"><Icon name={icon} /></span>
                <h3>{t(`landing.who.${k}.name`)}</h3>
              </li>
            ))}
          </ul>
        </section>

        <section id="confiance" className="hm-in hm-trust-wrap" aria-labelledby="hm-trust">
          <div className="hm-trust" data-reveal>
            <h2 id="hm-trust">{t('landing.trust.title')}</h2>
            <ul>
              {TRUST.map(([k, icon]) => (
                <li key={k}>
                  <span className="hm-trust-ic"><Icon name={icon} /></span>
                  <h3>{t(`landing.trust.${k}.title`)}</h3>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {GALLERY.length > 0 && (
          <section id="galerie" className="hm-section hm-in" aria-labelledby="hm-gal">
            <header className="hm-sec-head" data-reveal><h2 id="hm-gal">{t('landing.gallery.title')}</h2></header>
            <ul className="hm-gallery">
              {GALLERY.map((p, i) => (
                <li key={p.src} data-reveal style={idx(i)}>
                  <figure>
                    <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
                    <figcaption><a href={p.source} target="_blank" rel="noreferrer">{t('vitrine.gallery.credit', { author: p.author, license: p.license })}</a></figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="partenaires" className="hm-section hm-in" aria-labelledby="hm-partners">
          <header className="hm-sec-head" data-reveal>
            <h2 id="hm-partners">{t('vitrine.partners.title')}</h2>
          </header>
          <ul className="hm-partners">
            {PARTNERS.map((k, i) => (
              <li key={k} className="card" data-reveal style={idx(i)}>
                <PartnerMark code={k.toUpperCase()} />
                <p className="hm-p-name">{t(`vitrine.partners.${k}.name`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="faq" className="hm-section hm-in hm-faq-wrap" aria-labelledby="hm-faq">
          <header className="hm-sec-head" data-reveal><h2 id="hm-faq">{t('landing.faq.title')}</h2></header>
          <div className="hm-faq" data-reveal>
            {FAQ.map((q) => (
              <details key={q} className="card">
                <summary>{t(`landing.faq.${q}.q`)}<Icon name="chevron-down" /></summary>
                <p>{t(`landing.faq.${q}.a`)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="hm-section hm-in" aria-labelledby="hm-cta">
          <div className="hm-final" data-reveal>
            <h2 id="hm-cta">{t('vitrine.cta.title')}</h2>
            <div className="hm-cta">
              <Link className="btn btn-primary btn-lg" to="/inscription">{t('landing.register')}<Icon name="arrow-right" /></Link>
              <Link className="btn btn-secondary btn-lg" to="/connexion">{t('landing.portals.agent.cta')}</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter home />
      <Toaster />
    </div>
  );
}
