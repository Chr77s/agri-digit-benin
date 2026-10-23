import { useTranslation } from 'react-i18next';
import { toast } from '../shared/ui';

const LANGS: [string, string][] = [['fr', 'Français'], ['fon', 'Fɔngbè'], ['bba', 'Baatɔnum'], ['yo', 'Yorùbá'], ['dnd', 'Dendi']];

/** Un seul bouton : le code de la langue courante ; un clic passe à la suivante (les langues nationales sont annoncées « à valider »). */
export function LangButton({ className = 'btn btn-icon tb-lang-btn' }: { className?: string }) {
  const { t, i18n: inst } = useTranslation();
  const idx = Math.max(0, LANGS.findIndex(([v]) => v === inst.language));
  const [code, name] = LANGS[idx];
  const [nextCode, nextName] = LANGS[(idx + 1) % LANGS.length];
  const next = () => {
    void inst.changeLanguage(nextCode);
    if (nextCode !== 'fr') toast({ type: 'info', text: `${nextName} (${t('lang.toValidate')})` });
  };
  return (
    <button type="button" className={className} aria-label={`${t('app.language')} : ${name}. ${nextName}`} title={`${name} → ${nextName}`} onClick={next}>
      {code.toUpperCase()}
    </button>
  );
}
