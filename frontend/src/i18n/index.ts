import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import fon from './fon.json';
import bba from './bba.json';
import yo from './yo.json';
import dnd from './dnd.json';

// Textes de la refonte, un fichier par groupe de pages (i18n/fr/*.json), fusionnés dans fr.json :
// chaque groupe écrit dans son propre fichier, sans toucher à celui des autres.
type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const merge = (into: Dict, from: Dict): Dict => {
  for (const [k, v] of Object.entries(from)) { const cur = into[k]; into[k] = isDict(v) && isDict(cur) ? merge({ ...cur }, v) : v; }
  return into;
};
const frParts = import.meta.glob<Dict>('./fr/*.json', { eager: true, import: 'default' });
const frAll = Object.values(frParts).reduce((acc, part) => merge(acc, part), merge({}, fr as unknown as Dict));

// Langue choisie au premier lancement ou dans le profil, gardée sur le téléphone.
const LANG_KEY = 'adb-lang';
const savedLang = (() => { try { return localStorage.getItem(LANG_KEY) ?? 'fr'; } catch { return 'fr'; } })();

// fon et bba : textes non validés par des locuteurs natifs (voir docs/LANGUES_A_VALIDER.md). Repli sur fr.
void i18n.use(initReactI18next).init({
  resources: { fr: { translation: frAll }, fon: { translation: fon }, bba: { translation: bba }, yo: { translation: yo }, dnd: { translation: dnd } },
  lng: savedLang,
  fallbackLng: 'fr',
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  // Les dictionnaires validés arrivent après le changement de langue : on réaffiche dès leur ajout.
  react: { bindI18nStore: 'added' },
});

type Tree = { [k: string]: string | Tree };

/** {"nav.home": "x"} -> {nav: {home: "x"}} (le serveur renvoie des clés plates, i18next lit des objets imbriqués). */
function unflatten(flat: Record<string, unknown>): Tree {
  const out: Tree = {};
  for (const [key, value] of Object.entries(flat)) {
    if (typeof value !== 'string' || value === '') continue;
    const parts = key.split('.');
    let node = out;
    let ok = true;
    for (const p of parts.slice(0, -1)) {
      let next = node[p];
      if (next === undefined) { next = {}; node[p] = next; }
      if (typeof next === 'string') { ok = false; break; }
      node = next;
    }
    if (ok && typeof node[parts[parts.length - 1]] !== 'object') node[parts[parts.length - 1]] = value;
  }
  return out;
}

const REMOTE_LANGS = ['fon', 'bba', 'yo', 'dnd'];

/** UC-15 : dictionnaire des textes validés par le MTDI. Sans réseau ou en cas d'erreur, on reste en français (repli). */
export async function loadRemoteDictionary(lng: string): Promise<void> {
  if (!REMOTE_LANGS.includes(lng)) return;
  try {
    const res = await fetch(`/api/v1/i18n/${lng}.json`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data: unknown = await res.json();
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return;
    i18n.addResourceBundle(lng, 'translation', unflatten(data as Record<string, unknown>), true, true);
  } catch {
    /* hors ligne, serveur arrêté ou réponse illisible : les textes français restent affichés */
  }
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng; // les lecteurs d'écran choisissent la voix d'après <html lang>
  void loadRemoteDictionary(lng);
  try { localStorage.setItem(LANG_KEY, lng); } catch { /* stockage indisponible : la langue revient au français au prochain lancement */ }
});
if (savedLang !== 'fr') void loadRemoteDictionary(savedLang);

export default i18n;
