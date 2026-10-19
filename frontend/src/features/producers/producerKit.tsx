// Petits composants de l'espace producteur absents du kit (candidats au kit). Styles : ./producteur.css.
import { useTranslation } from 'react-i18next';
import type { Stage } from '../../shared/api/types';
import { Button, speak } from '../../shared/ui';
import './producteur.css';

export const STAGES: Stage[] = ['semis', 'croissance', 'floraison', 'recolte'];

/** Rail des 4 stades : faits, courant, à venir. Le libellé ARIA dit le stade en clair. */
export function StageBar({ stage }: { stage: Stage }) {
  const { t } = useTranslation();
  const cur = STAGES.indexOf(stage);
  return (
    <ol className="stagebar" aria-label={t('pr.stageOf', { n: cur + 1, total: STAGES.length, stage: t(`stage.${stage}`) })}>
      {STAGES.map((s, i) => (
        <li key={s} className={i < cur ? 'is-done' : i === cur ? 'is-now' : undefined} aria-current={i === cur ? 'step' : undefined}>
          <span>{t(`stage.${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Bouton discret « Écouter » de l'en-tête (synthèse vocale du navigateur ; absent si elle n'existe pas). */
export function ListenGhost({ text, label }: { text: string; label?: string }) {
  const { t } = useTranslation();
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return <Button variant="ghost" icon="megaphone" className="listen-btn" onClick={() => speak(text)}>{label ?? t('common.listen')}</Button>;
}

/** Jauge de confiance (0 à 1) ; sous 0,6 la barre passe en latérite. */
export function Confidence({ value }: { value: number }) {
  const { t } = useTranslation();
  const pct = Math.round(value * 100);
  return (
    <div className={`conf${value < 0.6 ? ' conf--low' : ''}`}>
      <span className="progress" role="img" aria-label={t('diagnosis.confidence', { pct })}><span style={{ ['--v' as string]: `${pct}%` }} /></span>
      <b className="num">{t('diagnosis.confidence', { pct })}</b>
    </div>
  );
}
