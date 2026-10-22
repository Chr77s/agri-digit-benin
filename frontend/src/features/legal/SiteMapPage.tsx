import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../shared/ui';
import '../auth/access.css';

// Pages ouvertes à tous ; les pages d'un profil connecté dépendent de son menu.
const GROUPS: [string, [string, string][]][] = [
  ['access', [['/', 'home'], ['/inscription', 'register'], ['/connexion', 'login'], ['/verification', 'verify']]],
  ['help', [['/contact', 'contact'], ['/accessibilite', 'accessibility'], ['/mentions-legales', 'notice'], ['/confidentialite', 'privacy'], ['/conditions-utilisation', 'terms']]],
];

export function SiteMapPage() {
  const { t } = useTranslation();
  return (
    <div className="lg">
      <PageHeader title={t('sitemap.title')} desc={t('sitemap.lead')} />
      <div className="grid-fit" style={{ '--min': '260px', '--gap': '16px' } as React.CSSProperties}>
        {GROUPS.map(([group, links]) => (
          <nav key={group} className="card" aria-labelledby={`sm-${group}`}>
            <h2 id={`sm-${group}`} className="card-title">{t(`sitemap.${group}`)}</h2>
            <ul className="stack" style={{ '--gap': '0px', listStyle: 'none', padding: 0, margin: 0 } as React.CSSProperties}>
              {links.map(([to, key]) => <li key={to}><Link to={to} className="inline-flex items-center min-h-touch">{t(`sitemap.${key}`)}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
    </div>
  );
}
