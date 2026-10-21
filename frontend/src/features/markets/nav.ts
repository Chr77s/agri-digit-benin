import type { Role } from '../../shared/api/types';
import type { IconName } from '../../shared/ui';

type Item = [string, string, IconName];
const PRICES: Item = ['/prix', 'priceReadings', 'coins'];
const ANALYSIS: Item = ['/analyses-marches', 'marketOutlook', 'trend'];
const STOCKS: Item = ['/stocks', 'stockOutlook', 'warehouse'];
const SURVEYS: Item = ['/enquetes', 'surveys', 'clipboard'];
const TRAININGS: Item = ['/formations', 'trainings', 'calendar'];
const SHOWCASE: Item = ['/vitrine', 'showcase', 'tag'];

/** Entrées de menu des relevés de prix, analyses, stocks, enquêtes, formations et vitrine (rubrique « navGroup.markets »), ajoutées à la
 *  fin du menu de chaque rôle par `app/Layout.tsx`. Les rôles absents (agronome, auditeur, agent financier, MTDI) n'ont aucune de ces pages. */
export const MARKETS_NAV: Partial<Record<Role, Item[]>> = {
  producteur: [TRAININGS, SHOWCASE],
  agent_atda: [PRICES, ANALYSIS, STOCKS, SURVEYS, TRAININGS, SHOWCASE],
  responsable_programme: [PRICES, ANALYSIS, STOCKS, SURVEYS, TRAININGS, SHOWCASE],
  admin_maep: [PRICES, ANALYSIS, STOCKS, SURVEYS, TRAININGS, SHOWCASE],
  gestionnaire_cooperative: [PRICES, STOCKS, TRAININGS, SHOWCASE],
  transformateur: [PRICES, ANALYSIS, STOCKS, TRAININGS, SHOWCASE],
  distributeur: [PRICES, ANALYSIS, STOCKS, TRAININGS, SHOWCASE],
};
