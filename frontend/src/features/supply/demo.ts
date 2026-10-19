// Données de démonstration des pages /collecte et /offres : aucune API de collecte ni de stocks n'existe encore.
// Les pages les affichent sous l'étiquette « Données de démonstration » ; rien n'est envoyé au serveur.

export interface CollectPoint { id: string; name: string; note?: string; members: number; committed_t: number; collected_t: number; next: string | null; store?: boolean }
export const POINTS: CollectPoint[] = [
  { id: 'kandi', name: 'Magasin de Kandi', note: 'Dépôt direct', members: 22, committed_t: 38, collected_t: 34, next: 'Ouvert tous les jours', store: true },
  { id: 'sonsoro', name: 'Sonsoro', note: "Hangar de l'école", members: 18, committed_t: 36, collected_t: 24, next: 'Mar. 21/10, 7 h' },
  { id: 'angaradebou', name: 'Angaradébou', members: 15, committed_t: 40, collected_t: 26, next: 'Mar. 21/10, 9 h 30' },
  { id: 'donwari', name: 'Donwari', note: 'Piste coupée après la pluie de jeudi', members: 9, committed_t: 28, collected_t: 12, next: null },
];

export const MEMBERS = [
  { code: 'ALI-KAN-01187', name: 'Bio Gounou' },
  { code: 'ALI-KAN-00954', name: 'Fati Yarou' },
  { code: 'ALI-BNK-00412', name: 'Awa Sabi' },
];

export const PLAN: { day: string; today?: boolean; stops: { place: string; info: string | null }[] }[] = [
  { day: 'Lun. 20/10', today: true, stops: [{ place: 'Magasin de Kandi', info: 'réception' }, { place: 'Livraison Sika Transfo', info: 'préparation 20 t' }] },
  { day: 'Mar. 21/10', stops: [{ place: 'Sonsoro', info: '7 h · ~6 t' }, { place: 'Angaradébou', info: '9 h 30 · ~8 t' }, { place: 'Départ vers Parakou', info: '14 h' }] },
  { day: 'Jeu. 23/10', stops: [{ place: 'Donwari', info: null }] },
  { day: 'Ven. 24/10', stops: [{ place: 'Livraison Agri Distrib', info: '12 t' }] },
];

export interface Stock { id: string; product: string; store: 'Bohicon' | 'Abomey'; stock_t: number; daily_t: number; buy: number; sell: number | null; updated: string }
export const STOCKS: Stock[] = [
  { id: 'mais-boh', product: 'Maïs grain', store: 'Bohicon', stock_t: 18, daily_t: 3, buy: 212, sell: 240, updated: '2026-10-18T07:30:00' },
  { id: 'gari-abo', product: 'Gari', store: 'Abomey', stock_t: 4.8, daily_t: 0.4, buy: 390, sell: 450, updated: '2026-10-17T18:10:00' },
  { id: 'soja-boh', product: 'Soja', store: 'Bohicon', stock_t: 9, daily_t: 0.6, buy: 305, sell: 340, updated: '2026-10-18T07:30:00' },
  { id: 'riz-boh', product: 'Riz paddy', store: 'Bohicon', stock_t: 22.5, daily_t: 0.5, buy: 260, sell: 295, updated: '2026-10-15T12:00:00' },
  { id: 'niebe-abo', product: 'Niébé', store: 'Abomey', stock_t: 0, daily_t: 0.3, buy: 540, sell: null, updated: '2026-10-16T09:20:00' },
];

/** Jours de stock au rythme des ventes (arrondi vers le bas) ; Infinity si rien ne se vend. */
export const coverDays = (s: Pick<Stock, 'stock_t' | 'daily_t'>) => (s.daily_t > 0 ? Math.floor(s.stock_t / s.daily_t) : Infinity);

/** Ruptures à venir sous `horizon` jours, la plus proche d'abord ; les produits déjà en rupture sont dans le tableau. */
export const ruptures = (list: Stock[], horizon = 20) =>
  list.filter((s) => s.stock_t > 0 && coverDays(s) <= horizon).sort((a, b) => coverDays(a) - coverDays(b));
