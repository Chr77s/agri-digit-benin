// Chronologie de la landing : tout le parcours est piloté par p, la progression du défilement dans la zone épinglée (0 à 1).
// 0 → 0,48 le relief du Bénin (vol vers Banikoara, parcelle, plongée) ; 0,43 → 0,48 l'iris ouvre le champ, une fois la parcelle sortie ;
// 0,48 → 1 le champ : semis, croissance, floraison, récolte. Après la zone épinglée, le champ mûr reste en fond.
import { clamp01, smooth } from './scene';

export const RELIEF_END = 0.48;

/** Fenêtres de visibilité des textes : [début d'apparition, fin, début de sortie, fin]. */
export const ACT_WINDOWS: [number, number, number, number][] = [
  [-1, -0.5, 0.07, 0.11], // 0 : accueil
  [0.12, 0.16, 0.23, 0.27], // 1 : le pays
  [0.28, 0.32, 0.38, 0.43], // 2 : la parcelle
  [0.5, 0.53, 0.575, 0.605], // 3 : semis
  [0.62, 0.65, 0.745, 0.775], // 4 : croissance
  [0.785, 0.81, 0.865, 0.89], // 5 : floraison
  [0.9, 0.93, 1.01, 1.02], // 6 : récolte
];

/** Progression de la caméra du relief (0 à 1) : s'arrête à la fin de la plongée. */
export const reliefProgress = (p: number) => clamp01(p / RELIEF_END);

/** Ouverture de l'iris : 0 = relief seul, 1 = champ seul. */
export const irisAt = (p: number) => smooth(0.43, RELIEF_END, p);

/** Le dessin du relief n'est plus nécessaire une fois l'iris refermé sur tout l'écran. */
export const showsRelief = (p: number) => p < RELIEF_END;

export interface FieldPhase { seed: number; grow: number; light: number }
export function fieldAt(p: number): FieldPhase {
  return { seed: smooth(0.5, 0.58, p), grow: clamp01((p - 0.56) / 0.4), light: smooth(0.8, 1, p) };
}

/** Avancement du tracé de la parcelle (0 à 1). */
export const parcelAt = (p: number) => clamp01((p - 0.3) / 0.08);

/** Plant mûr, lumière dorée : l'état du fond une fois la zone épinglée terminée. */
export const FIELD_END: FieldPhase = { seed: 1, grow: 1, light: 1 };

/** Voile qui assombrit le fond derrière les sections du bas : 0 pendant le parcours, jusqu'à 0,88 ensuite. */
export const veilAt = (scrolledPastJourney: number, viewport: number) => 0.88 * smooth(0.05, 0.7, scrolledPastJourney / Math.max(1, viewport));
