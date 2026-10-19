// Carte de densité des fermes POC (relief.json, cellules 0,05°) fusionnées 2×2, 5 classes séquentielles vertes.
import { readFileSync, writeFileSync } from 'node:fs';
const r = JSON.parse(readFileSync('C:/Users/Chris Nahum/Projets/agri-digit-benin/frontend/src/features/landing/relief.json', 'utf8'));
const m = new Map(); const c = r.cells;
for (let i = 0; i < c.length; i += 3) { const k = (c[i] >> 1) + ',' + (c[i + 1] >> 1); m.set(k, (m.get(k) || 0) + c[i + 2]); }
const max = Math.max(...m.values());
const ramp = ['#DCE9D0', '#B5D29A', '#7FB04F', '#3F7F3C', '#1F5A32'];
const X0 = 14, Y1 = 250;
const by = ramp.map(() => []);
for (const [k, n] of m) { const [x, y] = k.split(',').map(Number); const t = Math.log1p(n) / Math.log1p(max); by[Math.min(4, Math.floor(t * 5))].push(`M${x * 2 - X0} ${Y1 - y * 2 - 2}h2v2h-2z`); }
const paths = by.map((d, i) => `<path fill="${ramp[i]}" d="${d.join('')}"/>`).join('');
const fmt = (n) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');
const labels = r.departments.filter((d) => !['littoral', 'mono', 'atlantique', 'oueme'].includes(d.code) || d.code === 'oueme').map((d) => {
  const x = (d.lon / 0.05 - X0).toFixed(1), y = (Y1 - d.lat / 0.05).toFixed(1); const sel = d.code === 'alibori';
  return `<g class="dep${sel ? ' dep--sel' : ''}"><title>${d.name} : ${fmt(d.farms)} fermes détectées</title><circle cx="${x}" cy="${y}" r="${sel ? 1.6 : 1.1}"/><text x="${+x + 2.2}" y="${+y + 1}">${d.name}</text></g>`;
}).join('');
const svg = `<svg viewBox="0 0 66 128" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="map-t"><title id="map-t">Densité des fermes détectées au Bénin, du sud (faible) au nord (forte) ; l'Alibori en compte ${fmt(58310)}, le Borgou ${fmt(47199)}</title>${paths}${labels}</svg>`;
writeFileSync('map.svg', svg); console.log(svg.length, max);
