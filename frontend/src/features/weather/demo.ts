// shortcut: aucune API météo ni relevé de prix côté serveur ; ces valeurs sont des données de DÉMONSTRATION,
// toujours affichées avec un badge « Prévision simulée » ou « Démonstration ». À remplacer par un service (Météo-Bénin, SIM) quand il existe.
import type { IconName } from '../../shared/ui';

export interface DayForecast { date: Date; tmax: number; tmin: number; rainMm: number; rainPct: number; icon: IconName }

/** Nombre pseudo-aléatoire stable dans [0, 1) pour une clé (même commune, même jour = même prévision). */
export function unit(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Prévision simulée sur `days` jours à partir d'aujourd'hui pour une commune. */
export function demoForecast(place: string, today = new Date(), days = 7): DayForecast[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    // date locale (AAAA-MM-JJ) : toISOString passerait en UTC, soit la veille au Bénin ; même clé que integrations/market_data.py
    const k = `${place}:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const r = unit(`${k}:rain`);
    const rainMm = r > 0.72 ? Math.round(15 + (r - 0.72) * 180) : r > 0.5 ? Math.round((r - 0.5) * 20) : 0;
    const rainPct = Math.min(95, Math.round(5 + r * 90));
    const tmax = Math.round(33 - rainMm / 10 - unit(`${k}:t`) * 3);
    return { date, tmax, tmin: tmax - 8 - Math.round(unit(`${k}:n`) * 2), rainMm, rainPct, icon: rainMm >= 10 ? 'drop' : rainPct > 30 ? 'cloud-sun' : 'sun' };
  });
}

export interface MarketPrice { market: string; department: string; price: number; change: number }

// Prix de gros indicatifs (FCFA/kg), démonstration.
const MARKETS: [string, string, number][] = [
  ['Banikoara', 'Alibori', 0.88], ['Kandi', 'Alibori', 0.92], ['Malanville', 'Alibori', 1.04],
  ['Parakou (Arzéké)', 'Borgou', 1], ['Bohicon', 'Zou', 1.13], ['Dantokpa (Cotonou)', 'Littoral', 1.22],
];
export const PRICE_CHAINS: { code: string; base: number }[] = [
  { code: 'mais', base: 215 }, { code: 'soja', base: 300 }, { code: 'riz', base: 260 },
  { code: 'niebe', base: 420 }, { code: 'manioc', base: 330 }, { code: 'anacarde', base: 400 },
];

export function demoPrices(chain: string): MarketPrice[] {
  const base = PRICE_CHAINS.find((c) => c.code === chain)?.base ?? 200;
  return MARKETS.map(([market, department, f]) => ({
    market, department, price: Math.round((base * f) / 5) * 5, change: Math.round((unit(`${chain}:${market}`) - 0.6) * 12),
  }));
}

/** 8 relevés hebdomadaires simulés (du plus ancien au plus récent), terminant au prix du premier marché. */
export function demoPriceHistory(chain: string, today = new Date()) {
  const last = demoPrices(chain)[0].price;
  return Array.from({ length: 8 }, (_, i) => ({
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (7 - i) * 7),
    price: Math.round(last * (1 + (7 - i) * 0.025 + (unit(`${chain}:h${i}`) - 0.5) * 0.03)),
  }));
}
