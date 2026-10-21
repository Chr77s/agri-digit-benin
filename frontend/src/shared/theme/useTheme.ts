import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'agri-theme';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: Theme) => { try { localStorage.setItem(KEY, v); } catch { /* stockage indisponible : le choix ne sera pas gardé */ } };

const saved = read();
// Refonte (docs/REFONTE_FRONTEND.md D1) : clair par défaut, le mode système n'est plus suivi ; seul un choix explicite passe en sombre.
let theme: Theme = saved === 'dark' ? 'dark' : 'light';
const listeners = new Set<() => void>();
document.documentElement.dataset.theme = theme;

/** Seul un choix explicite de la personne est enregistré ; tous les composants abonnés basculent ensemble. */
export function setTheme(t: Theme) {
  theme = t;
  write(t);
  document.documentElement.dataset.theme = t;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const get = () => theme;

export function useTheme(): { theme: Theme; toggle(): void } {
  const t = useSyncExternalStore(subscribe, get, get);
  return { theme: t, toggle: () => setTheme(t === 'dark' ? 'light' : 'dark') };
}
