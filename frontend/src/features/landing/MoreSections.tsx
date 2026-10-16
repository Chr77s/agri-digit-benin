import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages, ScrollText, ShieldCheck, WifiOff } from 'lucide-react';
import './landing-sections.css';

const STEPS = ['s1', 's2', 's3'] as const;
const TRUST = [
  { key: 'offline', Icon: WifiOff },
  { key: 'langs', Icon: Languages },
  { key: 'consent', Icon: ShieldCheck },
  { key: 'audit', Icon: ScrollText },
] as const;
const FAQ = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

/** Trois étapes numérotées : lève la question « c'est compliqué ? » juste après les fonctionnalités. */
export function HowSection() {
  const { t } = useTranslation();
  return (
    <section id="comment" className="lps-section" aria-labelledby="lps-how-title">
      <div className="lps-inner">
        <h2 id="lps-how-title" className="lps-title">{t('landing.how.title')}</h2>
        <ol className="lps-steps">
          {STEPS.map((s, i) => (
            <li key={s} className="lps-step glass">
              <span className="lps-step-n" aria-hidden="true">{i + 1}</span>
              <h3>{t(`landing.how.${s}.title`)}</h3>
              <p>{t(`landing.how.${s}.body`)}</p>
            </li>
          ))}
        </ol>
        <Link className="lp-btn lp-btn--primary" to="/inscription">{t('landing.how.cta')}</Link>
      </div>
    </section>
  );
}

/** Les objections du terrain (réseau, langue) et de la confiance (données, contrôle). */
export function TrustSection() {
  const { t } = useTranslation();
  return (
    <section id="confiance" className="lps-section lps-alt" aria-labelledby="lps-trust-title">
      <div className="lps-inner">
        <h2 id="lps-trust-title" className="lps-title">{t('landing.trust.title')}</h2>
        <ul className="lps-trust">
          {TRUST.map(({ key, Icon }) => (
            <li key={key}>
              <Icon aria-hidden size={28} />
              <h3>{t(`landing.trust.${key}.title`)}</h3>
              <p>{t(`landing.trust.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Questions fréquentes : <details> natif, accessible au clavier sans script. */
export function FaqSection() {
  const { t } = useTranslation();
  return (
    <section id="faq" className="lps-section" aria-labelledby="lps-faq-title">
      <div className="lps-inner">
        <h2 id="lps-faq-title" className="lps-title">{t('landing.faq.title')}</h2>
        <div className="lps-faq">
          {FAQ.map((q) => (
            <details key={q}>
              <summary>{t(`landing.faq.${q}.q`)}</summary>
              <p>{t(`landing.faq.${q}.a`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
