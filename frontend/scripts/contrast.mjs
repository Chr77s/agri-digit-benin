// Vérifie les ratios de contraste WCAG des couples texte/fond des jetons (node scripts/contrast.mjs).
const pairs = [
  ['texte/fond', '#1B1F1A', '#F7F5F0', 4.5], ['secondaire/fond', '#4A5148', '#F7F5F0', 4.5], ['secondaire/surface', '#4A5148', '#FFFFFF', 4.5],
  ['blanc/marque', '#FFFFFF', '#1F5B3A', 4.5], ['blanc/survol', '#FFFFFF', '#17472D', 4.5], ['marque/fond', '#1F5B3A', '#F7F5F0', 4.5],
  ['succès', '#1F5B3A', '#E6F2EA', 4.5], ['avertissement', '#8A5A00', '#FFF3D6', 4.5], ['erreur', '#B3261E', '#FDECEA', 4.5],
  ['bordure champ (muted)/surface', '#4A5148', '#FFFFFF', 3],
];
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
