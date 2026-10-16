import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../shared/ui';

// les trois documents légaux : même gabarit, texte dans fr.json (legal.<doc>)
export const LEGAL_DOCS = [
  { doc: 'notice', to: '/mentions-legales' },
  { doc: 'privacy', to: '/confidentialite' },
  { doc: 'terms', to: '/conditions-utilisation' },
] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number]['doc'];

interface Section { h: string; p: string[] }

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  const raw = t(`legal.${doc}.sections`, { returnObjects: true });
  const sections = Array.isArray(raw) ? (raw as Section[]) : [];
  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t(`legal.${doc}.title`)} listen={t(`legal.${doc}.intro`)} />
      <nav aria-label={t('legal.nav')} className="flex flex-wrap gap-2">
        {LEGAL_DOCS.map((d) => (
          <NavLink key={d.doc} to={d.to}
            className={({ isActive }) => `inline-flex min-h-touch items-center rounded-full border px-4 ${isActive ? 'border-brand bg-brand text-brand-ink' : 'border-border text-text'}`}>
            {t(`legal.${d.doc}.title`)}
          </NavLink>
        ))}
      </nav>
      <p className="rounded border border-warn bg-warn-bg p-3 text-warn">{t('legal.prototype')}</p>
      <p>{t(`legal.${doc}.intro`)}</p>
      {sections.map((s) => (
        <section key={s.h} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{s.h}</h2>
          {s.p.map((p) => <p key={p}>{p}</p>)}
        </section>
      ))}
      <p className="text-muted">{t('legal.updated')}</p>
    </article>
  );
}
