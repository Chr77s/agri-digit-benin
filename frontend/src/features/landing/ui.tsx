import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ClipboardCheck, Languages, Sprout } from 'lucide-react';
import relief from './relief.json';
import { GALLERY } from './gallery';
import './ui.css';

// espace insécable ordinaire, comme dans LandingPage
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/ /g, ' ');
const LANGS = ['fr', 'fon', 'bba'] as const;

// trois ancres, dans l'ordre de la page
const NAV = ['comment', 'confiance', 'faq'] as const;

// signature convenue avec LandingPage ; le réglage du mouvement est désormais dans le pied de page
export function SiteHeader() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] ?? 'fr';
  return (
    <header className="lp-header">
      <a className="lp-brand" href="#top">
        <img src="/icon.svg" width={32} height={32} alt="" />
        {t('app.name')}
      </a>
      <nav className="lp-nav" aria-label={t('landing.nav.label')}>
        {NAV.map((id) => <a key={id} href={`#${id}`}>{t(`landing.nav.${id}`)}</a>)}
      </nav>
      <div className="lp-tools">
        {/* select natif posé en transparent sur la pastille : menu accessible sans code de liste */}
        <label className="lp-icon lp-lang">
          <Languages aria-hidden size={20} />
          <span className="lp-lang-code" aria-hidden="true">{lang.toUpperCase()}</span>
          <select value={lang} aria-label={t('landing.lang.label')} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l} value={l}>{t(`landing.lang.${l}`)}{l === 'fr' ? '' : ` (${t('lang.toValidate')})`}</option>
            ))}
          </select>
        </label>
        <Link className="lp-head-login" to="/connexion">{t('landing.login')}</Link>
        <Link className="lp-btn lp-btn--primary lp-btn--head" to="/inscription">{t('landing.registerShort')}</Link>
      </div>
    </header>
  );
}

export function OfficialBadge() {
  const { t } = useTranslation();
  return <p className="lp-official"><span className="lp-flag" aria-hidden="true" />{t('landing.badge')}</p>;
}

export function StatTiles() {
  const { t } = useTranslation();
  const stats = [['farms', relief.total], ['departments', 12], ['communes', 77], ['sectors', 13]] as const;
  return (
    <div className="lp-stats-wrap">
      <dl className="lp-stats">
        {stats.map(([k, n]) => (
          <div key={k} className="lp-stat">
            <dt>{t(`landing.stats.${k}`)}</dt>
            <dd>{fmt(n)}</dd>
          </div>
        ))}
      </dl>
      <p className="lp-note">{t('landing.stats.note')}</p>
    </div>
  );
}

const PORTALS = [
  { key: 'producer', Icon: Sprout, to: '/inscription' },
  { key: 'agent', Icon: ClipboardCheck, to: '/connexion' },
] as const;

/** Dernier appel avant le pied de page : deux espaces côte à côte, sobres comme le reste. */
export function PortalsSection() {
  const { t } = useTranslation();
  return (
    <section id="espaces" className="lp-sec" aria-labelledby="lp-portals-title">
      <h2 id="lp-portals-title" className="lp-h2">{t('landing.portals.title')}</h2>
      <p className="lp-final-lead">{t('landing.portals.lead')}</p>
      <div className="lp-portals">
        {PORTALS.map(({ key, Icon, to }) => (
          <article key={key} className="lp-portal">
            <Icon aria-hidden size={28} />
            <h3>{t(`landing.portals.${key}.title`)}</h3>
            <ul>
              {(['b1', 'b2', 'b3'] as const).map((b) => <li key={b}>{t(`landing.portals.${key}.${b}`)}</li>)}
            </ul>
            <Link className={`lp-btn ${key === 'producer' ? 'lp-btn--primary' : 'lp-btn--ghost'}`} to={to}>{t(`landing.portals.${key}.cta`)}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Carrousel à défilement natif (glisser au doigt, flèches au clavier) ; pas de défilement automatique. */
export function GallerySection() {
  const { t } = useTranslation();
  const track = useRef<HTMLDivElement>(null);
  if (!GALLERY.length) return null;
  const go = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: still ? 'auto' : 'smooth' });
  };
  return (
    <section id="galerie" className="lp-sec" aria-labelledby="lp-gallery-title" aria-roledescription={t('landing.gallery.carousel')}>
      <div className="lp-gallery-head">
        <h2 id="lp-gallery-title" className="lp-h2">{t('landing.gallery.title')}</h2>
        <div className="lp-gallery-nav">
          <button type="button" className="lp-icon" aria-label={t('landing.gallery.prev')} onClick={() => go(-1)}><ChevronLeft aria-hidden size={22} /></button>
          <button type="button" className="lp-icon" aria-label={t('landing.gallery.next')} onClick={() => go(1)}><ChevronRight aria-hidden size={22} /></button>
        </div>
      </div>
      {/* tabIndex : la piste défile aux flèches du clavier */}
      <div className="lp-gallery" ref={track} tabIndex={0} aria-label={t('landing.gallery.title')}>
        {GALLERY.map((p, i) => (
          <figure key={p.src} className="lp-photo glass" aria-label={`${i + 1} / ${GALLERY.length}`}>
            <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
            <figcaption>
              {p.author}, {p.license} · <a href={p.source} target="_blank" rel="noopener noreferrer">{t('landing.gallery.source')}</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
