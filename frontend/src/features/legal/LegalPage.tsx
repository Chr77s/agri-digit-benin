import { Fragment } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import '../auth/access.css';

// les trois documents légaux : même gabarit, texte dans fr.json (legal.<doc>)
export const LEGAL_DOCS = [
  { doc: 'notice', to: '/mentions-legales' },
  { doc: 'privacy', to: '/confidentialite' },
  { doc: 'terms', to: '/conditions-utilisation' },
] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number]['doc'];

interface Section { h: string; p: string[] }

// Mentions encore à fournir par le MAEP : surlignées pour qu'elles sautent aux yeux à la relecture.
const TODO = /(à compléter(?: par le MAEP)?|à désigner|à décider avec le comité de pilotage \(CoPil\))/;
const marked = (s: string) => s.split(TODO).map((part, i) => (i % 2 ? <mark key={i} className="todo">{part}</mark> : <Fragment key={i}>{part}</Fragment>));

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const raw = t(`legal.${doc}.sections`, { returnObjects: true });
  const sections = Array.isArray(raw) ? (raw as Section[]) : [];
  const sid = (i: number) => `${doc}-${i + 1}`;
  return (
    <div className="lg">
      <div className="page-head" style={{ margin: 0 }}>
        <div>
          <h1 className="page-title">{t('legal.nav')}</h1>
          <p className="page-desc">{t('legal.prototype')} {t('legal.updated')}</p>
        </div>
        <div className="page-actions"><Button variant="secondary" icon="printer" onClick={() => window.print()}>{t('legal.print')}</Button></div>
      </div>

      <nav className="lg-tabs" aria-label={t('legal.nav')}>
        <div className="tabs">
          {LEGAL_DOCS.map((d) => <NavLink key={d.doc} to={d.to} className="tab">{t(`legal.${d.doc}.tab`)}</NavLink>)}
        </div>
      </nav>

      <div className="lg-panel">
        <article className="lg-doc" aria-labelledby={`${doc}-t`}>
          <div className="stack" style={{ ['--gap' as string]: '8px' }}>
            <h2 className="page-title" id={`${doc}-t`}>{t(`legal.${doc}.title`)}</h2>
            <p className="lead">{t(`legal.${doc}.intro`)}</p>
          </div>
          {sections.map((s, i) => (
            <section key={s.h} id={sid(i)} aria-labelledby={`${sid(i)}-h`}>
              <h2 id={`${sid(i)}-h`}>{s.h}</h2>
              {s.p.map((p) => <p key={p}>{marked(p)}</p>)}
            </section>
          ))}
        </article>
        <nav className="lg-toc" aria-label={t('legal.tocOf', { doc: t(`legal.${doc}.title`) })}>
          <h2>{t('legal.toc')}</h2>
          <ol>{sections.map((s, i) => <li key={s.h}><a href={`#${sid(i)}`}>{s.h}</a></li>)}</ol>
        </nav>
      </div>

      <div className="lg-meta">
        <span>{t('legal.question')}</span>
        {user?.role === 'producteur'
          ? <Link to="/consentements">{t('legal.manageConsents')}</Link>
          : !user && <Link to="/connexion">{t('legal.loginForConsents')}</Link>}
      </div>
    </div>
  );
}
