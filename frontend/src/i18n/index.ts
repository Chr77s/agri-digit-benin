import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import fon from './fon.json';
import bba from './bba.json';
import yo from './yo.json';
import dnd from './dnd.json';

// fon et bba : textes non validés par des locuteurs natifs (voir docs/LANGUES_A_VALIDER.md). Repli sur fr.
void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, fon: { translation: fon }, bba: { translation: bba }, yo: { translation: yo }, dnd: { translation: dnd } },
  lng: 'fr',
  fallbackLng: 'fr',
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export default i18n;
