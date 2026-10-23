// shortcut: durées de cycle et tâches de DÉMONSTRATION (repères généraux, sans dosage), toujours affichées comme
// estimations ; à remplacer par les fiches INRAB de chaque variété quand elles seront publiées dans la base de connaissances.
import type { Stage } from '../../shared/api/types';

/** Jours après le semis : levée, début de croissance, floraison, récolte. */
interface Cycle { levee: number; croissance: number; floraison: number; recolte: number }
const CYCLES: Record<string, Cycle> = {
  mais: { levee: 6, croissance: 7, floraison: 55, recolte: 95 },
  soja: { levee: 5, croissance: 6, floraison: 45, recolte: 100 },
  riz: { levee: 7, croissance: 8, floraison: 75, recolte: 120 },
  coton: { levee: 7, croissance: 8, floraison: 60, recolte: 150 },
  niebe: { levee: 5, croissance: 6, floraison: 40, recolte: 70 },
  manioc: { levee: 15, croissance: 16, floraison: 180, recolte: 300 },
};
const DEFAULT: Cycle = { levee: 6, croissance: 7, floraison: 55, recolte: 100 };
export const cycleOf = (vc: string) => CYCLES[vc] ?? DEFAULT;

const DAY = 86_400_000;
const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso: string, n: number) => new Date(parse(iso).getTime() + n * DAY);
/** Jour de culture (1 = jour du semis). */
export const dayOf = (sownAt: string, today = new Date()) =>
  Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - parse(sownAt).getTime()) / DAY) + 1;

export const NEXT: Record<Stage, Stage | null> = { semis: 'croissance', croissance: 'floraison', floraison: 'recolte', recolte: null };

export interface Task { key: string; due: Date; stage: Stage }

/** Tâches estimées d'une campagne, triées par échéance ; les tâches d'un stade dépassé ne sont plus proposées. */
export function tasksFor(vc: string, stage: Stage, sownAt: string | null | undefined): Task[] {
  if (!sownAt) return [];
  const c = cycleOf(vc);
  const order: Stage[] = ['semis', 'croissance', 'floraison', 'recolte'];
  const list: Task[] = [
    { key: 'emergence', due: addDays(sownAt, c.levee), stage: 'semis' },
    { key: 'weeding1', due: addDays(sownAt, 15), stage: 'croissance' },
    { key: 'weeding2', due: addDays(sownAt, 35), stage: 'croissance' },
    ...Array.from({ length: Math.max(1, Math.floor((c.floraison + 14 - 7) / 7)) }, (_, i) => ({ key: 'scout', due: addDays(sownAt, 7 + i * 7), stage: (7 + i * 7 < c.floraison ? 'croissance' : 'floraison') as Stage })),
    { key: 'prepareHarvest', due: addDays(sownAt, c.recolte - 7), stage: 'floraison' },
    { key: 'declareHarvest', due: addDays(sownAt, c.recolte), stage: 'recolte' },
  ];
  return list.filter((t) => order.indexOf(t.stage) >= order.indexOf(stage)).sort((a, b) => a.due.getTime() - b.due.getTime());
}
