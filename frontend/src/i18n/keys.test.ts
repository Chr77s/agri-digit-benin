import { describe, expect, it } from 'vitest';
import i18n from './index';

// Garde-fou : toute clé de traduction écrite dans le code doit exister dans le dictionnaire français fusionné
// (les pluriels _one/_other comptent). Sans lui, un texte oublié s'affiche sous forme de clé brute.
const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.*', '!../i18n/**'], { query: '?raw', import: 'default', eager: true });
const dict = i18n.getResourceBundle('fr', 'translation') as Record<string, unknown>;

const get = (key: string): unknown => key.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), dict);
const exists = (key: string) => {
  if (get(key) !== undefined) return true;
  const parent = get(key.slice(0, Math.max(0, key.lastIndexOf('.')))) as Record<string, unknown> | undefined;
  const last = key.slice(key.lastIndexOf('.') + 1);
  return !!parent && ['_one', '_other', '_zero'].some((s) => `${last}${s}` in parent);
};
const withFallback = (after: string) => /^\s*,\s*(['"`]|\{[^}]*defaultValue)/.test(after);

describe('Clés de traduction', () => {
  it('toutes les clés écrites dans le code existent en français', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50); // le motif de glob doit bien trouver le code
    const roots = new Set(Object.keys(dict));
    const missing: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      // clés passées à t(...) ou à i18nKey, et toute chaîne « espace.clé » dont l'espace de noms est connu
      for (const m of text.matchAll(/(?:\bt\(\s*|i18nKey=\{?\s*)(['"`])([a-z][A-Za-z0-9]*(?:\.[\w]+)+)\1|(['"`])([a-z][A-Za-z0-9]*(?:\.[\w]+)+)\3/g)) {
        const key = m[2] ?? m[4];
        const direct = m[2] !== undefined;
        if (!direct && (!roots.has(key.split('.')[0]) || /\.(tsx?|css|json|svg|png|jpe?g|webp|woff2?|md|html|js)$/.test(key))) continue;
        if (!exists(key) && !withFallback(text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 140))) missing.push(`${key}  (${file.replace('../', '')})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
