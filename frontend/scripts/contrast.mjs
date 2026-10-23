// Vérifie les ratios de contraste WCAG des couples texte/fond des jetons (node scripts/contrast.mjs).
import { tokens } from '../src/shared/ui/tokens.ts'; // Node 22.18+ lit le TypeScript sans compilation

// Jetons globaux, en clair et en sombre : [nom, texte, fond, minimum] (texte 4,5 ; composant d'interface 3).
const pairs = [];
for (const [mode, c] of [['clair', tokens.color], ['sombre', tokens.dark]]) {
  for (const [n, a, b, min] of [
    ['texte/fond', c.text, c.bg, 4.5], ['texte/surface', c.text, c.surface, 4.5], ['secondaire/fond', c.muted, c.bg, 4.5], ['secondaire/surface', c.muted, c.surface, 4.5],
    ['encre/marque (bouton)', c.brandInk, c.brand, 4.5], ['encre/survol', c.brandInk, c.brandHover, 4.5], ['surface/marque (onglet actif)', c.surface, c.brand, 4.5],
    ['marque/fond (lien)', c.brand, c.bg, 4.5], ['marque/surface', c.brand, c.surface, 4.5], ['marque/succès (survol secondaire)', c.brand, c.successBg, 4.5],
    ['succès', c.success, c.successBg, 4.5], ['avertissement', c.warn, c.warnBg, 4.5], ['erreur', c.error, c.errorBg, 4.5],
    ['erreur/surface', c.error, c.surface, 4.5], ['erreur/fond', c.error, c.bg, 4.5],
    ['bordure champ (muted)/surface', c.muted, c.surface, 3], ['focus (marque)/fond', c.brand, c.bg, 3],
    // Refonte « Argile et verre » : texte sur les cartes pastel, barre latérale, dégradé et corail d'action
    ...['mint', 'peach', 'butter', 'sky'].flatMap((p) => [[`texte/${p}`, c.text, c[p], 4.5], [`secondaire/${p}`, c.muted, c[p], 4.5], [`marque/${p}`, c.brand, c[p], 4.5]]),
    ['texte/sauge (barre latérale)', c.text, c.sage, 4.5], ['marque/sauge', c.brand, c.sage, 4.5], ['encre/sarcelle (fin du dégradé)', c.brandInk, c.teal, 4.5],
    ['encre/corail (accent)', c.coralInk, c.coral, 4.5],
  ]) pairs.push([`${mode} ${n}`, a, b, min]);
}
// Palette « Sunny Farm » : barre latérale verte (valeurs de skin.css), orange d'accent, couleur de marque sur fond blanc.
for (const [n, a, b, min] of [
  ['barre latérale texte (haut)', '#FFFFFF', '#016648', 4.5], ['barre latérale texte (bas)', '#FFFFFF', '#014D38', 4.5],
  ['barre latérale secondaire (haut)', '#C4E6D5', '#016648', 4.5], ['barre latérale icône (haut)', '#8FDDB8', '#016648', 3],
  ['barre latérale lien actif', '#016648', '#FFFFFF', 4.5], ['barre latérale sombre texte', '#FFFFFF', '#013D2C', 4.5], ['barre latérale sombre secondaire', '#C4E6D5', '#013D2C', 4.5],
  ['texte sur vert vif (#00A563)', '#08291D', '#00A563', 4.5], ['vert vif/blanc (graphique)', '#00A563', '#FFFFFF', 3], ['orange de série de données (--d3)/blanc', '#E5601A', '#FFFFFF', 3],
  ['sombre : encre sur fin du dégradé', '#06261C', '#00A563', 4.5], ['sun-ink/sun-bg', '#8A3B0C', '#FDE8DA', 4.5], ['sombre sun-ink/sun-bg', '#FFB27F', '#3A2112', 4.5],
]) pairs.push([n, a, b, min]);
// Landing animée au scroll : jetons des deux modes (texte 4,5 ; composant d'interface 3).
const landing = {
  sombre: { fond: '#0A2417', alt: '#0F3A22', texte: '#EFEBD8', att: '#B8C7B0', accent: '#12BE78', surAccent: '#0A2417', ocre: '#F8793A', focus: '#12BE78', surface: '#10301F' },
  clair: { fond: '#F2F5EE', alt: '#DDEAD6', texte: '#10261A', att: '#3F5546', accent: '#1F5B3A', surAccent: '#FFFFFF', ocre: '#8A4B12', focus: '#1F5B3A', surface: '#FFFFFF' },
};
for (const [mode, t] of Object.entries(landing)) {
  for (const [bgName, bg] of [['fond', t.fond], ['fond alt', t.alt]]) {
    pairs.push([`landing ${mode} texte/${bgName}`, t.texte, bg, 4.5], [`landing ${mode} atténué/${bgName}`, t.att, bg, 4.5],
      [`landing ${mode} accent (lien)/${bgName}`, t.accent, bg, 4.5], [`landing ${mode} ocre/${bgName}`, t.ocre, bg, 4.5]);
  }
  pairs.push([`landing ${mode} texte sur accent (bouton)`, t.surAccent, t.accent, 4.5], [`landing ${mode} focus/fond`, t.focus, t.fond, 3],
    [`landing ${mode} texte/surface`, t.texte, t.surface, 4.5]);
}
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
let fail = 0;
for (const [n, a, b, min] of pairs) {
  const [x, y] = [lum(a), lum(b)];
  const r = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  if (r < min) fail++;
  console.log(`${r >= min ? 'OK  ' : 'ECHEC'} ${n} ${r.toFixed(2)} (min ${min})`);
}
process.exit(fail ? 1 : 0);
