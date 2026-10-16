import { useState } from 'react';

type Nav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible : la préférence ne sera pas gardée */ } };

/** Mouvement réduit : demandé par le système, économie de données, appareil à peu de mémoire, ou choix de la personne. */
function initial(): boolean {
  const saved = read('agri-calm');
  if (saved === '1' || saved === '0') return saved === '1';
  const nav = navigator as Nav;
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !!nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 2;
}

/** Une préférence n'est gardée que si la personne la choisit : ce que le système impose ne devient jamais un choix. */
export function useCalm() {
  const [calm, setCalm] = useState(initial);
  return { calm, toggle: () => { write('agri-calm', calm ? '0' : '1'); setCalm(!calm); } };
}
