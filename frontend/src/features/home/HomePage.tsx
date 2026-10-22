import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, ThemeToggle, Toaster, fmtNum, spriteHref, type IconName } from '../../shared/ui';
import { LangButton } from '../../app/LangButton';
import relief from '../landing/relief.json';
import { GALLERY } from '../landing/gallery';
import { HeroScene, StageIllustration, StepAgent, StepHarvest, StepSignup } from './illustrations';
import { SiteFooter } from './SiteFooter';
import './home.css';

// Nouvelle page d'accueil, au style du tableau de bord (« Argile et verre »). L'ancienne, en 3D, reste dans features/landing (route /accueil-3d).
const NAV = ['comment', 'qui', 'confiance', 'faq'] as const;
const STATS: [string, IconName, string, number][] = [
  ['farms', 'wheat', 'mint', relief.total], ['departments', 'map-pin', 'peach', 12], ['communes', 'building', 'butter', 77], ['sectors', 'layers', 'sky', 13],
];
const STAGES = ['semis', 'croissance', 'floraison', 'recolte'] as const;
const STEPS = [['s1', StepSignup], ['s2', StepAgent], ['s3', StepHarvest]] as const;
const WHO: [string, IconName, string][] = [['producer', 'sprout', 'mint'], ['agent', 'clipboard', 'peach'], ['coop', 'users', 'butter'], ['institution', 'building', 'sky']];
const TRUST: [string, IconName][] = [['offline', 'wifi-off'], ['langs', 'languages'], ['consent', 'shield-check'], ['audit', 'scroll']];
const FAQ = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

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

export function HomePage() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  useEffect(() => { document.title = `${t('app.name')} · ${t('landing.badge')}`; }, [t]);
  // arrivée depuis le pied de page d'une autre page : on va à la rubrique demandée
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [hash]);
  const points = t('vitrine.hero.points', { returnObjects: true }) as unknown;

  return (
    <div className="hm" ref={root}>
      <a href="#hm-main" className="skip-link">{t('landing.skip')}</a>

      <header className="hm-head">
        <div className="hm-head-in">
          <Link to="/" className="hm-brand"><svg aria-hidden><use href={spriteHref('logo')} /></svg><span>{t('app.name')}</span></Link>
          <nav className="hm-nav" aria-label={t('vitrine.nav.label')}>
            {NAV.map((id) => <a key={id} href={`#${id}`}>{t(`landing.footer.links.${id}`)}</a>)}
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
            <p className="hm-badge"><span className="hm-flag" aria-hidden="true" />{t('landing.badge')}</p>
            <h1 id="hm-h1">{t('landing.hero.title')}</h1>
            <p className="hm-lead">{t('landing.hero.lead')}</p>
            <div className="hm-cta">
              <Link className="btn btn-primary btn-lg" to="/inscription">{t('landing.register')}<Icon name="arrow-right" /></Link>
              <Link className="btn btn-secondary btn-lg" to="/connexion">{t('landing.login')}</Link>
            </div>
            <ul className="hm-points">
              {(Array.isArray(points) ? (points as string[]) : []).map((p) => <li key={p}><Icon name="check-circle" />{p}</li>)}
            </ul>
          </div>
          <figure className="hm-scene">
            <HeroScene />
            <div className="hm-chip hm-chip--mint"><Icon name="parcel" /><span><small>{t('vitrine.hero.cardArea')}</small><strong>{t('vitrine.hero.cardAreaValue')}</strong></span></div>
            <div className="hm-chip hm-chip--peach"><Icon name="cloud-sun" /><span><small>{t('vitrine.hero.cardAlertPlace')}</small><strong>{t('vitrine.hero.cardAlert')}</strong></span></div>
            <div className="hm-chip hm-chip--butter"><Icon name="sprout" /><span><small>{t('vitrine.hero.cardStageDay')}</small><strong>{t('vitrine.hero.cardStage')}</strong></span></div>
          </figure>
        </section>

        <section className="hm-in hm-stats-wrap" aria-label={t('landing.stats.note')}>
          <dl className="hm-stats" data-reveal>
            {STATS.map(([k, icon, tone, n]) => (
              <div key={k} className={`stat stat--${tone}`}>
                <span className="stat-ic"><Icon name={icon} /></span>
                <dt className="stat-label">{t(`landing.stats.${k}`)}</dt>
                <dd className="stat-value">{fmtNum(n)}</dd>
              </div>
            ))}
          </dl>
          <p className="hm-note">{t('landing.stats.note')}</p>
        </section>

        <section id="saison" className="hm-section hm-in" aria-labelledby="hm-season">
          <header className="hm-sec-head" data-reveal>
            <h2 id="hm-season">{t('vitrine.season.title')}</h2>
            <p>{t('vitrine.season.lead')}</p>
          </header>
          <ol className="hm-stages">
            {STAGES.map((s, i) => (
              <li key={s} className="card hm-stage" data-reveal style={{ '--i': i } as React.CSSProperties}>
                <StageIllustration stage={s} />
                <h3>{t(`landing.field.${s}.title`)}</h3>
                <p>{t(`landing.field.${s}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="comment" className="hm-section hm-in" aria-labelledby="hm-how">
          <header className="hm-sec-head" data-reveal><h2 id="hm-how">{t('landing.how.title')}</h2></header>
          <ol className="hm-steps">
            {STEPS.map(([k, Ill], i) => (
              <li key={k} className="card hm-step" data-reveal style={{ '--i': i } as React.CSSProperties}>
                <Ill />
                <span className="hm-num" aria-hidden="true">{i + 1}</span>
                <h3>{t(`landing.how.${k}.title`)}</h3>
                <p>{t(`landing.how.${k}.body`)}</p>
              </li>
            ))}
          </ol>
          <p className="hm-center" data-reveal><Link className="btn btn-primary btn-lg" to="/inscription">{t('landing.how.cta')}<Icon name="arrow-right" /></Link></p>
        </section>

        <section id="qui" className="hm-section hm-in" aria-labelledby="hm-who">
          <header className="hm-sec-head" data-reveal><h2 id="hm-who">{t('landing.who.title')}</h2></header>
          <ul className="hm-who">
            {WHO.map(([k, icon, tone], i) => (
              <li key={k} className={`stat stat--${tone} hm-who-card`} data-reveal style={{ '--i': i } as React.CSSProperties}>
                <span className="stat-ic"><Icon name={icon} /></span>
                <h3>{t(`landing.who.${k}.name`)}</h3>
                <p>{t(`landing.who.${k}.text`)}</p>
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
                  <p>{t(`landing.trust.${k}.body`)}</p>
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
                <li key={p.src} data-reveal style={{ '--i': i } as React.CSSProperties}>
                  <figure>
                    <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
                    <figcaption>{t('landing.gallery.source')} : <a href={p.source} target="_blank" rel="noreferrer">{t('vitrine.gallery.credit', { author: p.author, license: p.license })}</a></figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}

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

        <section className="hm-in hm-section" aria-labelledby="hm-cta">
          <div className="hm-final" data-reveal>
            <header>
              <h2 id="hm-cta">{t('vitrine.cta.title')}</h2>
              <p>{t('vitrine.cta.lead')}</p>
            </header>
            <div className="hm-final-cards">
              {(['producer', 'agent'] as const).map((k) => (
                <article key={k} className="card">
                  <h3>{t(`landing.portals.${k}.title`)}</h3>
                  <ul>{(['b1', 'b2', 'b3'] as const).map((b) => <li key={b}><Icon name="check" />{t(`landing.portals.${k}.${b}`)}</li>)}</ul>
                  <Link className={`btn btn-lg ${k === 'producer' ? 'btn-primary' : 'btn-secondary'}`} to={k === 'producer' ? '/inscription' : '/connexion'}>{t(`landing.portals.${k}.cta`)}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter home />
      <Toaster />
    </div>
  );
}
