// Champ de maïs de la landing en WebGL (three.js) : remplace field.ts sur les appareils capables, field.ts reste le repli.
// Monde en mètres : x à droite, y vers le haut, z vers la caméra. Le plant principal est à l'origine, au bord avant du champ ;
// les rangs filent vers l'horizon (z négatif), 0,8 m entre rangs, 0,25 m sur le rang, sur des billons de terre latéritique.
// Devant le champ, une tournière : au début elle est creusée et montre la coupe du sol, le grain et ses racines contre la paroi.
// Géométries écrites dans des tampons préalloués ; le plant principal n'est reconstruit qu'à chaque pas de croissance de 1/200.
import * as THREE from 'three';
import { stageAt, type FieldFrame } from './field';
import { clamp01, smooth } from './scene';

const RAD = Math.PI / 180, TAU = Math.PI * 2;
const ROW = 0.8, STEP = 0.25; // écartements réels
const RIDGE = 0.07; // hauteur des billons
const CUT = 0.6; // profondeur de la coupe
const EXAG = 1.5; // grain grossi pour rester lisible à l'écran
const KZ = 0.0065; // organes souterrains plaqués contre la paroi (z = 0)
const KY = -0.05; // profondeur de semis

const hash = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Hauteur du sol : billons sous le champ (0 au sommet des rangs, -RIDGE au fond des sillons), tournière plate devant. */
export const ridgeY = (x: number, z = -9) => -RIDGE * 0.5 * (1 - Math.cos((TAU * x) / ROW)) * smooth(-1.4, -2.3, z);

function vnoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ---------- couleurs (linéaires) ----------

type RGB = [number, number, number];
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const C = (h: number): RGB => [toLin(((h >> 16) & 255) / 255), toLin(((h >> 8) & 255) / 255), toLin((h & 255) / 255)];
const LEAF_BASE = C(0xa7bd62), LEAF_MID = C(0x4a7c2a), LEAF_TIP = C(0x6a9638);
const YELLOW = C(0xcdb553), TAN = C(0xbb9a62), BROWN = C(0x8a7050);
const STEM = C(0x6e9a40), NODE = C(0xc6cc8a), STEM_BASE = C(0x8a5a48);
const TASSEL_G = C(0xaab874), TASSEL = C(0xdccf96), ANTHER = C(0xe9cf5c);
const HUSK = C(0x95bb62), STRAW = C(0xdcc893), COB = C(0xfff4d8);
const SILK_FRESH = C(0xe0e3a6), SILK_PINK = C(0xe6aa98), SILK_BROWN = C(0x9a4a2a), SILK_DRY = C(0x5a3420);
const ROOT = C(0xf0e8cf), ROOT_TIP = C(0xfffbf0), BRACE = C(0xa8a86a), BRACE_RED = C(0xa86050);
const SHOOT = C(0xeef0cf), SHOOT_G = C(0xb4c870), KERNEL = C(0xe8a52a), KERNEL_CAP = C(0xe6d6a8), KERNEL_TOP = C(0xf3c552);
const GRASS_G = C(0x6c8f38), GRASS_DRY = C(0xc9b47a);

const OUT: RGB = [0, 0, 0];
function setC(c: RGB) { OUT[0] = c[0]; OUT[1] = c[1]; OUT[2] = c[2]; }
function toward(c: RGB, t: number) {
  if (!(t > 0)) return;
  const k = Math.min(1, t);
  OUT[0] += (c[0] - OUT[0]) * k; OUT[1] += (c[1] - OUT[1]) * k; OUT[2] += (c[2] - OUT[2]) * k;
}
/** Couleur d'une feuille à l'abscisse s (0 base, 1 pointe) : vert, puis jaune, paille et brun en séchant par la pointe. */
function leafCol(s: number, sen: number, tint: number) {
  setC(LEAF_BASE);
  toward(LEAF_MID, smooth(0, 0.28, s));
  toward(LEAF_TIP, smooth(0.6, 1, s) * 0.45);
  const d = clamp01((sen - (1 - s) * 0.5) * 2);
  toward(YELLOW, smooth(0, 0.45, d));
  toward(TAN, smooth(0.4, 0.75, d));
  toward(BROWN, smooth(0.75, 1, d) * 0.7);
  OUT[0] *= 1 - 0.05 * tint; OUT[1] *= 1 + 0.04 * tint;
}

// ---------- géométrie : tampons préalloués ----------

export class Geo {
  readonly pos: Float32Array; readonly nor: Float32Array; readonly uv: Float32Array;
  readonly col: Float32Array; readonly wnd: Float32Array; readonly idx: Uint32Array;
  nv = 0; ni = 0;
  constructor(readonly maxV: number, readonly maxI: number) {
    this.pos = new Float32Array(maxV * 3); this.nor = new Float32Array(maxV * 3); this.uv = new Float32Array(maxV * 2);
    this.col = new Float32Array(maxV * 3); this.wnd = new Float32Array(maxV * 3); this.idx = new Uint32Array(maxI);
  }
  reset() { this.nv = 0; this.ni = 0; }
  fits(v: number, i: number) { return this.nv + v <= this.maxV && this.ni + i <= this.maxI; }
  /** Sommet : position, uv, couleur, vent (balancement, frémissement, translucidité). */
  vert(x: number, y: number, z: number, u: number, v: number, r: number, g: number, b: number, sw: number, fl: number, tr: number) {
    const k = this.nv++, k3 = k * 3;
    this.pos[k3] = x; this.pos[k3 + 1] = y; this.pos[k3 + 2] = z;
    this.uv[k * 2] = u; this.uv[k * 2 + 1] = v;
    this.col[k3] = r; this.col[k3 + 1] = g; this.col[k3 + 2] = b;
    this.wnd[k3] = sw; this.wnd[k3 + 1] = fl; this.wnd[k3 + 2] = tr;
    return k;
  }
  tri(a: number, b: number, c: number) { const i = this.ni; this.idx[i] = a; this.idx[i + 1] = b; this.idx[i + 2] = c; this.ni += 3; }
  setN(k: number, x: number, y: number, z: number) { const k3 = k * 3; this.nor[k3] = x; this.nor[k3 + 1] = y; this.nor[k3 + 2] = z; }
  /** Normales lissées des sommets ajoutés depuis v0, d'après les triangles ajoutés depuis i0. */
  smooth(v0: number, i0: number) {
    const { pos: p, nor: n, idx } = this;
    n.fill(0, v0 * 3, this.nv * 3);
    for (let i = i0; i < this.ni; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
      n[a] += x; n[a + 1] += y; n[a + 2] += z; n[b] += x; n[b + 1] += y; n[b + 2] += z; n[c] += x; n[c + 1] += y; n[c + 2] += z;
    }
    for (let k = v0 * 3; k < this.nv * 3; k += 3) {
      const l = Math.hypot(n[k], n[k + 1], n[k + 2]);
      if (l < 1e-20) { n[k] = 0; n[k + 1] = 1; n[k + 2] = 0; } else { n[k] /= l; n[k + 1] /= l; n[k + 2] /= l; }
    }
  }
}

function grid(g: Geo, v0: number, rows: number, cols: number) {
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = v0 + r * cols + c, b = a + 1, d = a + cols, e = d + 1;
    g.tri(a, d, b); g.tri(b, d, e);
  }
}

// chemin courant des tubes et lanières : points, rayons, abscisse de texture, couleur, vent
const MAXP = 128;
const PX = new Float64Array(MAXP), PY = new Float64Array(MAXP), PZ = new Float64Array(MAXP), PR = new Float64Array(MAXP), PV = new Float64Array(MAXP);
const PC = new Float32Array(MAXP * 3), PW = new Float32Array(MAXP * 2);
let pn = 0;
function pt(x: number, y: number, z: number, r: number, v: number, sw: number, fl: number) {
  if (pn >= MAXP) return;
  PX[pn] = x; PY[pn] = y; PZ[pn] = z; PR[pn] = r; PV[pn] = v;
  PC[pn * 3] = OUT[0]; PC[pn * 3 + 1] = OUT[1]; PC[pn * 3 + 2] = OUT[2];
  PW[pn * 2] = sw; PW[pn * 2 + 1] = fl;
  pn++;
}

/** Tube le long du chemin courant (repère transporté parallèlement, normales analytiques). */
function tube(g: Geo, sides: number, u0: number, u1: number, tr: number) {
  const n = pn;
  pn = 0;
  if (n < 2 || !g.fits(n * (sides + 1), (n - 1) * sides * 6)) return;
  const base = g.nv;
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < n; i++) {
    const i0 = i > 0 ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1;
    let tx = PX[i1] - PX[i0], ty = PY[i1] - PY[i0], tz = PZ[i1] - PZ[i0];
    const tl = Math.hypot(tx, ty, tz);
    if (tl < 1e-12) { tx = 0; ty = 1; tz = 0; } else { tx /= tl; ty /= tl; tz /= tl; }
    if (i === 0) {
      const rx = Math.abs(ty) < 0.9 ? 0 : 1, ry = 1 - rx; // t × réf
      nx = -tz * ry; ny = tz * rx; nz = tx * ry - ty * rx;
    } else {
      const d = nx * tx + ny * ty + nz * tz;
      nx -= tx * d; ny -= ty * d; nz -= tz * d;
    }
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * TAU, c = Math.cos(a), s = Math.sin(a);
      const ox = c * nx + s * bx, oy = c * ny + s * by, oz = c * nz + s * bz;
      const k = g.vert(PX[i] + ox * PR[i], PY[i] + oy * PR[i], PZ[i] + oz * PR[i], u0 + ((u1 - u0) * j) / sides, PV[i],
        PC[i * 3], PC[i * 3 + 1], PC[i * 3 + 2], PW[i * 2], PW[i * 2 + 1], tr);
      g.setN(k, ox, oy, oz);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) {
    const a = base + i * (sides + 1) + j, b = a + 1, c = a + sides + 1, d = c + 1;
    g.tri(a, c, b); g.tri(b, c, d);
  }
}

/** Lanière fine (soies, herbes) le long du chemin courant, largeur w0 → w1. */
function strip(g: Geo, w0: number, w1: number, tr: number) {
  const n = pn;
  pn = 0;
  if (n < 2 || !g.fits(n * 2, (n - 1) * 6)) return;
  const v0 = g.nv, i0 = g.ni;
  for (let i = 0; i < n; i++) {
    const i0p = i > 0 ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1;
    const tx = PX[i1] - PX[i0p], tz = PZ[i1] - PZ[i0p];
    let sx = -tz, sz = tx;
    const sl = Math.hypot(sx, sz);
    if (sl < 1e-9) { sx = 1; sz = 0; } else { sx /= sl; sz /= sl; }
    const w = lerp(w0, w1, i / (n - 1)) * 0.5;
    for (let j = -1; j <= 1; j += 2) {
      g.vert(PX[i] + sx * w * j, PY[i], PZ[i] + sz * w * j, 0.015, PV[i], PC[i * 3], PC[i * 3 + 1], PC[i * 3 + 2], PW[i * 2], PW[i * 2 + 1], tr);
    }
  }
  grid(g, v0, n, 2);
  g.smooth(v0, i0);
}

/** Petit fuseau à 6 sommets (épillets, anthères) centré en c, d'axe d (unitaire). */
function octa(g: Geo, cx: number, cy: number, cz: number, dx: number, dy: number, dz: number, len: number, wid: number, sw: number, fl: number) {
  if (!g.fits(6, 24)) return;
  let ux = -dz, uz = dx;
  const ul = Math.hypot(ux, uz);
  if (ul < 1e-6) { ux = 1; uz = 0; } else { ux /= ul; uz /= ul; }
  const wx = dy * uz, wy = dz * ux - dx * uz, wz = -dy * ux;
  const h = len / 2, r = wid / 2, v0 = g.nv;
  const P = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    const k = g.vert(cx + x, cy + y, cz + z, 0.015, 0.5, OUT[0], OUT[1], OUT[2], sw, fl, 0.5);
    g.setN(k, nx, ny, nz);
  };
  P(dx * h, dy * h, dz * h, dx, dy, dz);
  P(-dx * h, -dy * h, -dz * h, -dx, -dy, -dz);
  P(ux * r, 0, uz * r, ux, 0, uz);
  P(wx * r, wy * r, wz * r, wx, wy, wz);
  P(-ux * r, 0, -uz * r, -ux, 0, -uz);
  P(-wx * r, -wy * r, -wz * r, -wx, -wy, -wz);
  const T = [0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 2, 1, 3, 2, 1, 4, 3, 1, 5, 4, 1, 2, 5];
  for (let i = 0; i < 24; i += 3) g.tri(v0 + T[i], v0 + T[i + 1], v0 + T[i + 2]);
}

// ---------- feuille ----------

export interface LeafArgs {
  x: number; y: number; z: number; // col (ligule), au bord de la gaine
  phi: number; len: number; w: number; // azimut, longueur, largeur maximale
  a0: number; a1: number; // angle à la verticale : à la base, à la pointe
  twist: number; lat: number; // torsion du limbe, courbure latérale
  sen: number; tint: number; sway: number;
  segs: number; across: number; wave: number; round: boolean; roll: number; seed: number;
}
const LS: LeafArgs = { x: 0, y: 0, z: 0, phi: 0, len: 0.5, w: 0.08, a0: 0.5, a1: 2, twist: 0, lat: 0, sen: 0, tint: 0, sway: 0, segs: 16, across: 3, wave: 0, round: false, roll: 0, seed: 0 };

/** Limbe en ruban : monte puis s'arque et retombe, pli en V le long de la nervure, bord ondulé. Renvoie le nombre de sommets ajoutés. */
export function leaf(g: Geo, a: LeafArgs): number {
  const n = a.segs, A = a.across;
  if (!(a.len > 0.002) || !g.fits((n + 1) * A, n * (A - 1) * 6)) return 0;
  const v0 = g.nv, i0 = g.ni, ds = a.len / n;
  let x = a.x, y = a.y, z = a.z;
  for (let k = 0; k <= n; k++) {
    const s = k / n;
    const al = a.a0 + (a.a1 - a.a0) * s ** 1.25, ph = a.phi + a.lat * s * s;
    const sa = Math.sin(al), ca = Math.cos(al), cp = Math.cos(ph), sp = Math.sin(ph);
    const tx = sa * cp, ty = ca, tz = sa * sp;
    // côté horizontal s0 = (-sin φ, 0, cos φ), normale n0 = s0 × t, puis torsion autour de t
    const s0x = -sp, s0z = cp;
    const n0x = -s0z * ty, n0y = s0z * tx - s0x * tz, n0z = s0x * ty;
    const tw = a.twist * smooth(0.1, 0.9, s), ct = Math.cos(tw), st = Math.sin(tw);
    const sx = s0x * ct + n0x * st, sy = n0y * st, sz = s0z * ct + n0z * st;
    const nx = n0x * ct - s0x * st, ny = n0y * ct, nz = n0z * ct - s0z * st;
    let w = s < 0.4 ? 0.36 + 0.64 * Math.sin((s / 0.4) * Math.PI * 0.5) : Math.cos(((s - 0.4) / 0.6) * Math.PI * 0.5) ** (a.round ? 0.3 : 0.85);
    w *= a.w * 0.5 * (1 - a.roll * 0.8);
    const fold = (0.22 + a.roll * 1.1) * (1 - 0.5 * s);
    leafCol(s, a.sen, a.tint);
    const fl = s ** 1.5 * Math.min(1, a.len / 0.5);
    for (let j = 0; j < A; j++) {
      const c = A === 2 ? j * 2 - 1 : (j / (A - 1)) * 2 - 1, ac = Math.abs(c);
      let o = fold * w * ac ** 1.2;
      if (a.wave && ac > 0.99) o += a.wave * Math.sin(s * a.len * 140 + a.seed + c * 1.3) * Math.sqrt(1 - s) * smooth(0, 0.12, s);
      g.vert(x + sx * c * w + nx * o, y + sy * c * w + ny * o, z + sz * c * w + nz * o, 0.04 + 0.48 * (c + 1), s,
        OUT[0], OUT[1], OUT[2], a.sway, fl, 1);
    }
    x += tx * ds; y += ty * ds; z += tz * ds;
  }
  grid(g, v0, n + 1, A);
  g.smooth(v0, i0);
  return g.nv - v0;
}

// ---------- plant ----------

export interface PlantSpec { seed: number; lod: 0 | 1 | 2; leaves: number; height: number; phi0: number; tint: number; lean: number }
const LODS = [
  { segs: 64, across: 5, sides: 12, wave: 0.0035 },
  { segs: 9, across: 3, sides: 6, wave: 0 },
  { segs: 3, across: 2, sides: 4, wave: 0 },
];
const NZ = new Float64Array(32), NY = new Float64Array(32), CY = new Float64Array(32), LG = new Float64Array(32), PH = new Float64Array(32);

function cobProf(s: number) {
  if (s < 0.08) return 0.55 + 0.45 * Math.sin((s / 0.08) * Math.PI * 0.5);
  if (s > 0.72) return (1 - 0.12 * s) * Math.cos(((s - 0.72) / 0.28) * Math.PI * 0.5) ** 0.55;
  return 1 - 0.12 * s;
}
function huskProf(s: number) {
  if (s < 0.08) return 0.6 + 0.4 * Math.sin((s / 0.08) * Math.PI * 0.5);
  if (s > 0.68) return (1 - 0.08 * s) * Math.cos(((s - 0.68) / 0.32) * Math.PI * 0.5) ** 0.8 + 0.06;
  return 1 - 0.08 * s;
}

/**
 * Plant de maïs au stade `grow` (même chronologie que field.ts) : tige à nœuds, gaines, feuilles distiques, panicule,
 * épi enveloppé de spathes avec soies, racines d'appui. L'épi nu (grains) va dans `cob` pour le plant détaillé.
 * Renvoie la hauteur atteinte (0 tant que le plant n'est pas levé).
 */
export function buildPlant(g: Geo, cob: Geo | null, grow: number, sp: PlantSpec): number {
  const v = clamp01((grow - 0.11) / 0.5);
  if (!(v > 0)) return 0;
  const v0 = g.nv;
  const top = plantBody(g, cob, grow, sp, v);
  // dans le champ, la canopée s'ombre elle-même : plus sombre vers le bas (le plant principal, isolé, reste en plein soleil)
  if (sp.lod > 0 && top > 0) for (let k = v0; k < g.nv; k++) {
    const f = 1 - (0.58 - 0.58 * smooth(-0.05, top * 0.95, g.pos[k * 3 + 1])) * smooth(0.4, 1.4, top); // pas d'ombre propre chez les jeunes plants
    g.col[k * 3] *= f; g.col[k * 3 + 1] *= f; g.col[k * 3 + 2] *= f;
  }
  return top;
}

function plantBody(g: Geo, cob: Geo | null, grow: number, sp: PlantSpec, v: number): number {
  const { lod, seed } = sp, N = Math.max(5, Math.min(30, sp.leaves)), D = LODS[lod], size = sp.height / 1.72;
  const E = smooth(0.1, 1, v) ** 1.3; // élongation des entre-nœuds
  const ripe = smooth(0.8, 0.97, grow);
  const prog = v * 1.18 * N; // feuilles sorties du cornet
  const thick = 0.3 + 0.7 * smooth(0, 0.75, v);
  const lcx = sp.lean * Math.cos(seed * 7), lcz = sp.lean * Math.sin(seed * 7);
  const sx = (y: number) => lcx * y * y, sz = (y: number) => lcz * y * y;
  const rad = (y: number) => thick * size * (0.0135 - 0.0068 * clamp01(y / (2 * size)));
  const sway = (y: number) => Math.min(1.3, (Math.max(0, y) / 2.3) ** 2);
  const senOf = (k: number) => clamp01(ripe * (1.6 - (1.1 * k) / (N - 1)) + (1 - clamp01(k / 3)) * smooth(0.8, 1, v) * 0.7);

  // nœuds : entre-nœuds courts en bas, longs au milieu
  let cum = 0;
  for (let k = 0; k < N; k++) { NZ[k] = cum; const t = k / N; cum += 0.03 + smooth(0, 0.4, t) * (1 - 0.3 * smooth(0.65, 1, t)); }
  const norm = sp.height / NZ[N - 1];
  let kTop = -1;
  for (let k = 0; k < N; k++) {
    const zf = NZ[k] * norm, inter = (k < N - 1 ? NZ[k + 1] * norm : zf + 0.1 * size) - zf;
    NY[k] = zf * E;
    LG[k] = clamp01((prog - k) / 2.5);
    const sh = lerp((0.018 + 0.02 * k) * size, Math.min(0.19 * size, Math.max(0.08 * size, 0.95 * inter)), E);
    CY[k] = Math.max(NY[k] + sh * Math.min(1, 0.35 + LG[k]), k ? CY[k - 1] + 0.006 : 0.01);
    PH[k] = sp.phi0 + k * Math.PI + (hash(seed, k) - 0.5) * 0.35 + k * 0.03;
    if (LG[k] > 0) kTop = k;
  }
  if (kTop < 0) return 0;
  const fl = kTop === N - 1 ? smooth(0.55, 0.68, grow) : 0;
  const pedTop = CY[N - 1] + 0.13 * size * fl;
  const stemTop = fl > 0 ? pedTop : NY[kTop] + 0.01;

  // tige : renflement et anneau clair à chaque nœud
  const stemCol = (y: number, node: boolean) => {
    setC(node ? NODE : STEM);
    toward(STEM_BASE, (1 - smooth(0, 0.35 * size, y)) * 0.5);
    toward(TAN, ripe * (0.85 - (0.3 * y) / 2.3));
  };
  const sf = lod === 0 ? 1 : 1.12; // sans gaines modélisées, la tige les inclut
  const add = (y: number, f: number, node: boolean) => {
    if (pn > 0 && y <= PY[pn - 1] + 0.002) return;
    stemCol(y, node);
    pt(sx(y), y, sz(y), rad(y) * f, y * 4, sway(y), 0);
  };
  add(-0.03, sf, false);
  if (lod < 2) {
    for (let k = 0; k <= kTop; k++) {
      const y = NY[k];
      if (lod === 0) { add(y - 0.005, 1, false); add(y, 1.1, true); add(y + 0.005, 1, false); } else add(y, sf, false);
      const yn = k < kTop ? NY[k + 1] : stemTop;
      if (lod === 0 && yn - y > 0.04) add((y + yn) / 2, 0.97, false);
    }
  } else add(stemTop * 0.5, sf, false);
  add(stemTop, sf * 0.8, false);
  tube(g, D.sides, 0.05, 0.35, 0.15);

  // gaines foliaires : enveloppent la tige du nœud jusqu'au col, en s'évasant
  if (lod === 0) for (let k = 0; k <= kTop; k++) {
    const y0 = NY[k], y1 = CY[k];
    if (y1 - y0 < 0.004) continue;
    const sen = senOf(k);
    for (let j = 0; j <= 5; j++) {
      const t = j / 5, y = lerp(y0, y1, t);
      leafCol(0.04, sen * 0.9, sp.tint);
      toward(NODE, 0.15 + 0.2 * (1 - t));
      pt(sx(y), y, sz(y), rad(y) * (1.1 + 0.14 * t) + 0.0006, t * 0.6, sway(y), 0);
    }
    tube(g, 10, 0.05, 0.4, 0.5);
  }

  // feuilles alternes à 180°, les plus longues au milieu
  for (let k = lod === 2 ? 2 : 0; k <= kTop; k++) {
    const lg = LG[k];
    if (lg <= 0) continue;
    const t = k / (N - 1), sen = senOf(k);
    const Lf = size * 1.22 * (0.07 + 0.93 * Math.sin(Math.PI * clamp01((k + 0.6) / (N * 1.06))) ** 1.2);
    const Wf = size * 0.108 * (0.3 + 0.7 * Math.sin(Math.PI * clamp01((k + 0.8) / (N * 1.1))) ** 0.8);
    const h1 = hash(seed, k + 40), h2 = hash(seed, k + 80);
    const unroll = smooth(0.15, 0.7, lg);
    const a0 = lerp(0.04, lerp(1.0, 0.42, t) + (h1 - 0.5) * 0.25, unroll);
    const droop = lerp(2.3, 1.15, t) * (0.45 + (0.45 * Lf) / size) * (0.25 + 0.75 * lg ** 1.5) + sen * 0.45 + (h2 - 0.5) * 0.4;
    const y = CY[k], r = rad(y) * 1.2, ph = PH[k];
    const len = Lf * lg ** 0.85;
    LS.x = sx(y) + Math.cos(ph) * r; LS.y = y; LS.z = sz(y) + Math.sin(ph) * r;
    LS.phi = ph; LS.len = len; LS.w = Wf * (0.3 + 0.7 * unroll); LS.a0 = a0; LS.a1 = a0 + droop * unroll;
    LS.twist = (k % 2 ? 1 : -1) * (0.9 + 0.9 * h1) * unroll; // le limbe pivote en retombant
    LS.lat = (h1 - 0.5) * 0.5; LS.sen = sen; LS.tint = sp.tint; LS.sway = sway(y);
    LS.segs = lod === 0 ? Math.max(8, Math.min(D.segs, Math.round(D.segs * len))) : D.segs;
    LS.across = D.across; LS.wave = D.wave * size; LS.round = k === 0; LS.roll = 1 - unroll; LS.seed = seed * 13 + k;
    leaf(g, LS);
  }

  let top = CY[kTop] + 0.05;

  // panicule : axe central, branches qui s'écartent puis retombent, épillets et anthères à la floraison
  if (fl > 0) {
    const open = smooth(0.6, 0.72, grow), y0 = pedTop, L = 0.36 * size * fl;
    const tcol = () => { setC(TASSEL_G); toward(TASSEL, smooth(0.6, 0.75, grow)); toward(TAN, ripe * 0.8); };
    const bend = 0.03 * size * fl, bx = Math.cos(seed * 3), bz = Math.sin(seed * 3);
    const nA = lod === 0 ? 10 : 3;
    for (let j = 0; j <= nA; j++) {
      const s = j / nA, y = y0 + L * s;
      tcol();
      pt(sx(y) + bx * bend * s * s, y, sz(y) + bz * bend * s * s, 0.0032 * size * (1 - 0.75 * s), s, sway(y), 0.5 * s);
    }
    const nAx = pn;
    tube(g, lod === 0 ? 5 : 3, 0.005, 0.025, 0.4);
    top = y0 + L;
    if (lod === 0) { // épillets de l'épi central, sur quatre rangs
      const cnt = Math.floor((L * 0.7) / 0.009);
      for (let j = 0; j < cnt; j++) {
        const s = 0.3 + (0.7 * j) / cnt, fi = s * (nAx - 1), i = Math.min(nAx - 2, Math.floor(fi)), f = fi - i;
        const x = lerp(PX[i], PX[i + 1], f), y = lerp(PY[i], PY[i + 1], f), z = lerp(PZ[i], PZ[i + 1], f);
        for (let q = 0; q < 4; q++) {
          const th = q * 1.5708 + j * 0.8, c = Math.cos(th), sn = Math.sin(th);
          const dl = Math.hypot(c * 0.35, 1, sn * 0.35);
          tcol(); toward(STRAW, hash(j, q) * 0.3);
          octa(g, x + c * 0.003, y, z + sn * 0.003, (c * 0.35) / dl, 1 / dl, (sn * 0.35) / dl, 0.0075 * size, 0.0024 * size, sway(y), 0.5);
        }
      }
    }
    const nb = lod === 0 ? 10 + Math.floor(hash(seed, 2) * 4) : lod === 1 ? 7 : 3;
    const segs = lod === 0 ? 9 : lod === 1 ? 3 : 2;
    for (let b = 0; b < nb; b++) {
      const q = b / nb, ya = y0 + L * 0.22 * q, az = seed + b * 2.39996;
      const bl = size * fl * (0.21 - 0.08 * q) * (0.9 + 0.2 * hash(seed, b + 7));
      const g0 = lerp(0.12, 0.85 - 0.25 * q, open), dr = (0.55 + 0.7 * (1 - q)) * open;
      const ca = Math.cos(az), sa = Math.sin(az), ds = bl / segs;
      let x = sx(ya), y = ya, z = sz(ya);
      for (let j = 0; j <= segs; j++) {
        const s = j / segs, al = g0 + dr * s ** 1.4;
        tcol();
        pt(x, y, z, size * (0.0016 - 0.0009 * s), s, sway(ya), 0.3 + 0.7 * s);
        x += Math.sin(al) * ca * ds; y += Math.cos(al) * ds; z += Math.sin(al) * sa * ds;
      }
      const np = pn;
      tube(g, lod === 0 ? 4 : 3, 0.005, 0.025, 0.4);
      if (lod !== 0) continue;
      const anth = stageAt(grow) === 'floraison';
      for (let i = 0; i < np - 1; i++) {
        let tx = PX[i + 1] - PX[i], ty = PY[i + 1] - PY[i], tz = PZ[i + 1] - PZ[i];
        const sl = Math.hypot(tx, ty, tz);
        if (sl < 1e-6) continue;
        tx /= sl; ty /= sl; tz /= sl;
        let ux = -tz, uz = tx;
        const ul = Math.hypot(ux, uz) || 1;
        ux /= ul; uz /= ul;
        const m = Math.max(1, Math.round(sl / (0.011 * size)));
        for (let k = 0; k < m; k++) {
          const f = (k + 0.5) / m;
          if (i === 0 && f < 0.4) continue;
          const x0 = lerp(PX[i], PX[i + 1], f), y0b = lerp(PY[i], PY[i + 1], f), z0 = lerp(PZ[i], PZ[i + 1], f);
          for (let sd = -1; sd <= 1; sd += 2) {
            const dx = tx + ux * sd * 0.45, dy = ty, dz = tz + uz * sd * 0.45, dl = Math.hypot(dx, dy, dz);
            tcol(); toward(STRAW, hash(b * 31 + i, k + sd) * 0.35);
            const fx = 0.3 + 0.7 * ((i + f) / (np - 1));
            octa(g, x0 + ux * sd * 0.0022, y0b - 0.0016, z0 + uz * sd * 0.0022, dx / dl, dy / dl, dz / dl, 0.0075 * size, 0.0024 * size, sway(ya), fx);
            if (anth && hash(b + i, k * 2 + sd) < 0.55) {
              setC(ANTHER);
              octa(g, x0 + ux * sd * 0.003, y0b - 0.0075, z0 + uz * sd * 0.003, 0, 1, 0, 0.0048 * size, 0.0013 * size, sway(ya), fx);
            }
          }
        }
      }
    }
  }

  // épi à l'aisselle d'une feuille du milieu, spathes, soies ; à la récolte les spathes sèchent et s'ouvrent
  const e = smooth(0.58, 0.76, grow), ie = Math.min(kTop, Math.round(N * 0.57));
  if (e > 0) {
    const ph = PH[ie], cp = Math.cos(ph), spn = Math.sin(ph);
    const y0 = NY[ie] + 0.025 * size, r0 = rad(y0) * 1.15, sw = sway(y0);
    const beta = 0.28 + 0.55 * ripe;
    const ax = Math.sin(beta) * cp, ay = Math.cos(beta), az = Math.sin(beta) * spn;
    const sl = 0.05 * size * e;
    const bx = sx(y0) + cp * r0 + ax * sl, by = y0 + ay * sl, bz = sz(y0) + spn * r0 + az * sl;
    const huskC = (s: number) => { setC(HUSK); toward(STRAW, smooth(0.8, 0.95, grow)); toward(TAN, smooth(0.9, 1, grow) * 0.5 * s); };
    const lc = 0.18 * size * e, rc = 0.022 * size * (0.35 + 0.65 * e), lh = lc * 1.22;
    if (lod === 0 && cob) {
      huskC(0);
      pt(sx(y0) + cp * r0 * 0.4, y0 - 0.01, sz(y0) + spn * r0 * 0.4, 0.006 * size, 0, sw, 0);
      pt(bx, by, bz, 0.0065 * size, 0.1, sw, 0);
      tube(g, 6, 0.06, 0.3, 0.3);
      let n1x = -az, n1z = ax;
      const nl = Math.hypot(n1x, n1z) || 1;
      n1x /= nl; n1z /= nl;
      const n2x = ay * n1z, n2y = az * n1x - ax * n1z, n2z = -ay * n1x;
      // épi nu : la texture porte les rangées de grains
      setC(COB);
      toward(C(0xf2ead2), 1 - ripe);
      for (let j = 0; j <= 16; j++) { const s = j / 16; pt(bx + ax * lc * s, by + ay * lc * s, bz + az * lc * s, rc * cobProf(s), s, sw, 0); }
      tube(cob, 20, 0, 1, 0);
      // spathes
      const open = smooth(0.86, 1, grow), nH = 7, HS = 12, HA = 5;
      for (let h = 0; h < nH; h++) {
        if (!g.fits((HS + 1) * HA, HS * (HA - 1) * 6)) break;
        const th0 = (h * TAU) / nH + hash(seed, h + 3) * 0.6, span = (TAU / nH) * 1.75, off = 0.0007 * (h % 3) + 0.0012 * size;
        const c0 = Math.cos(th0), s0 = Math.sin(th0);
        const rdx = c0 * n1x + s0 * n2x, rdy = s0 * n2y, rdz = c0 * n1z + s0 * n2z;
        const tdx = -s0 * n1x + c0 * n2x, tdy = c0 * n2y, tdz = -s0 * n1z + c0 * n2z;
        const v0 = g.nv, i0 = g.ni, ds = lh / HS;
        let oa = 0, orr = 0;
        for (let k = 0; k <= HS; k++) {
          const s = k / HS, along = s * lh, rr = rc * 1.04 * huskProf(s) + off, hw = (rc + off) * span * 0.5 * (1 - s ** 3);
          huskC(s);
          for (let j = 0; j < HA; j++) {
            const c = (j / (HA - 1)) * 2 - 1, th = th0 + c * span * 0.5 * (1 - 0.35 * s), ct = Math.cos(th), st = Math.sin(th);
            let px = bx + ax * along + (ct * n1x + st * n2x) * rr;
            let py = by + ay * along + st * n2y * rr;
            let pz = bz + az * along + (ct * n1z + st * n2z) * rr;
            if (open > 0) {
              const R = rc + off + orr - (1 - c * c) * 0.004 * size, w = c * hw;
              px = lerp(px, bx + ax * oa + rdx * R + tdx * w, open);
              py = lerp(py, by + ay * oa + rdy * R + tdy * w, open);
              pz = lerp(pz, bz + az * oa + rdz * R + tdz * w, open);
            }
            g.vert(px, py, pz, 0.06 + 0.195 * (c + 1), s, OUT[0], OUT[1], OUT[2], sw, 0.25 * s, 0.6);
          }
          const psi = open * 2.6 * smooth(0, 0.75, s);
          oa += Math.cos(psi) * ds; orr += Math.sin(psi) * ds;
        }
        grid(g, v0, HS + 1, HA);
        g.smooth(v0, i0);
      }
      // soies : houppe qui sort des spathes, vert pâle puis brun-rouge
      const age = smooth(0.66, 0.84, grow), vis = smooth(0.35, 0.6, e);
      if (vis > 0) {
        const ox = lerp(bx + ax * lh, bx + ax * lc * 0.97, open), oy = lerp(by + ay * lh, by + ay * lc * 0.97, open), oz = lerp(bz + az * lh, bz + az * lc * 0.97, open);
        for (let j = 0; j < 40; j++) {
          const th = hash(seed + j, 3.1) * TAU, sp2 = 0.25 + 0.6 * hash(seed + j, 7.7);
          const c = Math.cos(th), sn = Math.sin(th);
          let dx = ax + (c * n1x + sn * n2x) * sp2, dy = ay + sn * n2y * sp2 + 0.15, dz = az + (c * n1z + sn * n2z) * sp2;
          const len = size * (0.05 + 0.09 * hash(seed + j, 9.3)) * (1 - 0.45 * age) * vis, ds = len / 6;
          let x = ox, y = oy, z = oz;
          for (let k = 0; k <= 6; k++) {
            const s = k / 6;
            setC(SILK_FRESH); toward(SILK_PINK, s * 0.7 * (1 - age)); toward(SILK_BROWN, age * (0.6 + 0.4 * s)); toward(SILK_DRY, ripe);
            pt(x, y, z, 0, s, sw, 0.6 + 0.4 * s);
            const dl = Math.hypot(dx, dy, dz);
            x += (dx / dl) * ds; y += (dy / dl) * ds; z += (dz / dl) * ds;
            dy -= 0.35 + 0.3 * age;
          }
          strip(g, 0.0013 * size, 0.0007 * size, 0.7);
        }
      }
    } else {
      // de loin, l'épi enveloppé suffit : un fuseau de spathes à pointe brune
      const n = lod === 1 ? 6 : 3;
      for (let j = 0; j <= n; j++) {
        const s = j / n;
        huskC(s);
        if (j === n) { toward(SILK_BROWN, 0.8); toward(SILK_DRY, ripe); }
        pt(bx + ax * lh * s, by + ay * lh * s, bz + az * lh * s, rc * 1.1 * huskProf(s) + 0.001, s, sw, 0);
      }
      tube(g, lod === 1 ? 6 : 4, 0.06, 0.3, 0.6);
    }
  }

  // racines d'appui : deux couronnes au-dessus du sol qui plongent dans la terre
  const br = smooth(0.7, 0.95, v);
  if (lod === 0 && br > 0 && N > 4) {
    for (let w = 0; w < 2; w++) {
      const y = NY[2 + w] + 0.004, n = w ? 7 : 9, rr = rad(y);
      for (let j = 0; j < n; j++) {
        const th = (j * TAU) / n + w * 0.4 + hash(seed, j + w * 10) * 0.3, c = Math.cos(th), s = Math.sin(th);
        const reach = (0.05 + 0.04 * hash(seed, j + 31) + w * 0.03) * size;
        for (let k = 0; k <= 5; k++) {
          const t = (k / 5) * br, out = rr * 0.9 + reach * Math.sin(t * Math.PI * 0.5), yy = y - (y + 0.03) * t ** 1.5;
          setC(BRACE); toward(BRACE_RED, 0.55 * t); toward(TAN, ripe * 0.5);
          pt(sx(y) + c * out, yy, sz(y) + s * out, 0.0034 * size * (1 - 0.4 * t), t, 0, 0);
        }
        tube(g, 5, 0.005, 0.025, 0.2);
      }
    }
  }
  return top;
}

/** Sous terre (plant principal) : radicule et ramifications, racines séminales, coléoptile, racines de la couronne. */
export function buildUnder(g: Geo, grow: number) {
  if (!(grow > 0.015) || grow > 0.5) return;
  const rootC = (s: number) => { setC(ROOT); toward(ROOT_TIP, s ** 3); };
  // racine qui part d'un point et s'incline vers le bas (ang : angle à la verticale, négatif vers la gauche)
  const root = (x0: number, y0: number, ang: number, bendDown: number, L: number, r0: number, m: number, seed: number) => {
    let x = x0, y = y0;
    const ds = L / m;
    for (let k = 0; k <= m; k++) {
      const s = k / m;
      rootC(s);
      pt(x, y, KZ + (hash(seed, k) - 0.5) * 0.002, r0 * (1 - 0.65 * s) + 0.0003, s, 0, 0);
      const a = ang * (1 - bendDown * s) + (hash(seed, k + 50) - 0.5) * 0.25;
      x += Math.sin(a) * ds; y -= Math.cos(a) * ds;
    }
    tube(g, 5, 0.005, 0.025, 0.2);
  };
  const ky = KY;
  const rad = clamp01((grow - 0.02) / 0.33), Lr = 0.27 * (1 - (1 - rad) ** 2);
  if (Lr > 0.003) {
    const m = 16;
    for (let k = 0; k <= m; k++) {
      const s = k / m;
      rootC(s);
      pt(0.012 * Math.sin(s * 5 + 0.5) * s, ky - 0.007 - Lr * s, KZ, 0.0018 * (1 - 0.6 * s) + 0.0004, s, 0, 0);
    }
    tube(g, 6, 0.005, 0.025, 0.2);
    for (let j = 0; j < 10; j++) {
      const a = 0.08 + 0.085 * j, depth = 0.27 * a, l = Math.min(0.075 * (1 - a * 0.55), (Lr - depth) * 0.55);
      if (l < 0.003) continue;
      const sd = depth / Math.max(Lr, 1e-6);
      root(0.012 * Math.sin(sd * 5 + 0.5) * sd, ky - 0.007 - depth, (j % 2 ? 1 : -1) * (1.15 + hash(j, 1) * 0.3), 0.4, l, 0.0008, 5, j + 10);
    }
  }
  const sem = clamp01((grow - 0.05) / 0.3);
  if (sem > 0) {
    const angs = [-0.95, 0.8, 1.25];
    for (let j = 0; j < 3; j++) {
      const L = 0.17 * sem * (0.8 + 0.1 * j);
      root(Math.sign(angs[j]) * 0.004, ky - 0.002, angs[j], 0.45, L, 0.0012, 8, j + 30);
    }
  }
  const col = clamp01((grow - 0.03) / 0.08);
  if (col > 0 && grow < 0.3) {
    const y0 = ky + 0.006, y1 = y0 + 0.064 * col;
    for (let k = 0; k <= 6; k++) {
      const s = k / 6, y = lerp(y0, y1, s);
      setC(SHOOT); toward(SHOOT_G, smooth(-0.005, 0.01, y));
      pt(0.0015 * Math.sin(s * 3), y, KZ, k === 6 ? 0.0006 : 0.0022, s, 0, 0);
    }
    tube(g, 6, 0.005, 0.025, 0.4);
  }
  const cr = clamp01((grow - 0.16) / 0.3);
  if (cr > 0) for (let j = 0; j < 8; j++) {
    const ang = lerp(-1.35, 1.35, (j + 0.5) / 8) + (hash(j, 5) - 0.5) * 0.3;
    const L = 0.26 * cr * (0.65 + 0.35 * hash(j, 9));
    root(0, -0.02, ang, 0.5, L, 0.0024, 9, j + 60);
  }
}

/** Grain de maïs (pointe en bas, couronne en haut), à l'échelle EXAG ; aplati par l'instance. */
export function kernelGeo(g: Geo) {
  const L = 0.011 * EXAG, R = 0.0042 * EXAG;
  for (let k = 0; k <= 8; k++) {
    const s = k / 8;
    setC(KERNEL); toward(KERNEL_CAP, 1 - smooth(0.05, 0.2, s)); toward(KERNEL_TOP, smooth(0.7, 1, s));
    pt(0, (s - 0.5) * L, 0, R * Math.sin(Math.PI * (0.04 + 0.92 * s)) ** 0.6 * (0.55 + 0.45 * s), s, 0, 0);
  }
  tube(g, 10, 0, 0.03, 0.1);
}

/** Touffe d'herbe sèche de savane. */
export function grassGeo(g: Geo) {
  for (let b = 0; b < 9; b++) {
    const h1 = hash(b, 1), h2 = hash(b, 2), h3 = hash(b, 3);
    const az = h1 * TAU, lean = 0.15 + 0.6 * h2, len = 0.1 + 0.22 * h3, ds = len / 5;
    let x = (h2 - 0.5) * 0.04, y = 0, z = (h3 - 0.5) * 0.04;
    for (let k = 0; k <= 5; k++) {
      const s = k / 5, al = lean + s * s * (0.6 + h1 * 0.8);
      setC(GRASS_G); toward(GRASS_DRY, 0.35 + 0.55 * hash(b, 4) * (0.5 + s));
      pt(x, y, z, 0, s, 0, s * s);
      x += Math.sin(al) * Math.cos(az) * ds; y += Math.cos(al) * ds; z += Math.sin(al) * Math.sin(az) * ds;
    }
    strip(g, 0.004, 0.0008, 0.8);
  }
}

// ---------- champ ----------

export interface Layout { n: number; x: Float32Array; z: Float32Array; s: Float32Array; v: Uint8Array; m: Float32Array; c: Float32Array }

/** Plants d'arrière-plan : rangs réels jusqu'au fond, quelques manquants, variations de taille, rotation, inclinaison, teinte. */
export function fieldLayout(lite: boolean): Layout {
  const R = lite ? 8 : 13, Zmax = lite ? 14 : 22;
  const xs: number[] = [], zs: number[] = [];
  for (let k = -R; k <= R; k++) {
    const z0 = k === 0 ? -2.9 : -2.5 - 0.6 * hash(k, 1); // le plant principal se détache devant le champ
    for (let j = 0; z0 - j * STEP > -Zmax; j++) {
      if (hash(k * 7 + 3, j) < 0.04) continue; // manquants
      xs.push(k * ROW + (hash(k, j + 1) - 0.5) * 0.05);
      zs.push(z0 - j * STEP + (hash(j, k + 5) - 0.5) * 0.06);
    }
  }
  const n = xs.length;
  const L: Layout = { n, x: new Float32Array(xs), z: new Float32Array(zs), s: new Float32Array(n), v: new Uint8Array(n), m: new Float32Array(n * 16), c: new Float32Array(n * 3) };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, 11), h2 = hash(i, 13), h3 = hash(i, 17), h4 = hash(i, 19);
    L.s[i] = 0.86 + 0.22 * h1;
    L.v[i] = Math.floor(h2 * 3) % 3;
    // feuilles plutôt en travers des rangs, comme dans un vrai champ
    e.set((h3 - 0.5) * 0.08, (h4 - 0.5) * 1.2 + (h2 > 0.5 ? Math.PI : 0), (h1 - 0.5) * 0.08);
    q.setFromEuler(e);
    p.set(L.x[i], ridgeY(L.x[i]), L.z[i]);
    sc.setScalar(L.s[i]);
    m.compose(p, q, sc).toArray(L.m, i * 16);
    const t = (h3 - 0.5) * 0.14;
    L.c[i * 3] = 1 - t * 0.6; L.c[i * 3 + 1] = 1 + t * 0.3; L.c[i * 3 + 2] = 1 - t;
  }
  return L;
}

// ---------- textures générées ----------

function rnd(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctx2d(c: HTMLCanvasElement) { return c.getContext('2d') as CanvasRenderingContext2D; }

/** Limbe : R = nervures parallèles (luminance), G = masque de la nervure centrale ; zone unie à gauche pour tiges, racines, soies. */
function leafTexture() {
  const W = 256, H = 256, c = canvas(W, H), x = ctx2d(c), img = x.createImageData(W, H), d = img.data, R = rnd(7);
  const lum = new Float32Array(W), rib = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W;
    if (u < 0.035) { lum[i] = 0.9; continue; }
    const lu = (u - 0.04) / 0.96, dr = Math.abs(lu - 0.5);
    let k = 0.86;
    if (Math.abs(Math.sin(lu * Math.PI * 70)) < 0.25) k -= 0.06; // nervures fines
    if (Math.abs(Math.sin(lu * Math.PI * 14)) < 0.12) k -= 0.07; // nervures secondaires
    if (lu < 0.015 || lu > 0.985) k = 0.95; // marge
    lum[i] = k;
    rib[i] = dr < 0.018 ? 1 : dr < 0.032 ? 1 - (dr - 0.018) / 0.014 : 0;
  }
  for (let y = 0; y < H; y++) {
    const band = 0.97 + 0.03 * Math.sin(y * 0.21 + R() * 0.5);
    for (let i = 0; i < W; i++) {
      const o = (y * W + i) * 4;
      d[o] = Math.min(255, lum[i] * band * (0.97 + 0.03 * R()) * 255);
      d[o + 1] = rib[i] * 255;
      d[o + 2] = 0;
      d[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Terre rouge latéritique : grain fin, croûte sèche, gravillons ferrugineux et grains de quartz. */
function soilTexture() {
  const S = 512, c = canvas(S, S), x = ctx2d(c), img = x.createImageData(S, S), d = img.data, R = rnd(3);
  for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) {
    const n = vnoise(i / 64, y / 64) * 0.5 + vnoise(i / 16, y / 16) * 0.3 + vnoise(i / 4, y / 4) * 0.2;
    const k = 0.72 + 0.4 * n + (R() - 0.5) * 0.14;
    const o = (y * S + i) * 4;
    d[o] = Math.min(255, 168 * k); d[o + 1] = Math.min(255, 92 * k); d[o + 2] = Math.min(255, 58 * k); d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 520; i++) { // gravillons sombres arrondis, avec reflet
    const px = R() * S, py = R() * S, r = 1 + R() * R() * 5;
    x.fillStyle = `rgba(${70 + R() * 40},${34 + R() * 20},${22 + R() * 12},0.9)`;
    x.beginPath(); x.ellipse(px, py, r, r * (0.7 + R() * 0.3), R() * 3, 0, TAU); x.fill();
    x.fillStyle = 'rgba(220,170,130,0.35)';
    x.beginPath(); x.arc(px - r * 0.3, py - r * 0.3, r * 0.35, 0, TAU); x.fill();
  }
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(235,215,185,${0.35 + R() * 0.4})`; x.fillRect(R() * S, R() * S, 1 + R(), 1 + R()); }
  x.strokeStyle = 'rgba(60,28,16,0.35)'; // fentes de retrait
  for (let i = 0; i < 14; i++) {
    let px = R() * S, py = R() * S;
    x.lineWidth = 0.6 + R();
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 6; k++) { px += (R() - 0.5) * 40; py += (R() - 0.5) * 40; x.lineTo(px, py); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  return t;
}

/** Paroi de la coupe : horizons (croûte sombre, horizon rouge à gravillons, altérite tachetée), traces de racines. */
function cutTexture() {
  const W = 512, H = 512, c = canvas(W, H), x = ctx2d(c), img = x.createImageData(W, H), d = img.data, R = rnd(5);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    const depth = y / H + (vnoise(i / 40, 3) - 0.5) * 0.06; // 0 en surface, 1 à 0,6 m
    const n = vnoise(i / 24, y / 24) * 0.6 + vnoise(i / 6, y / 6) * 0.4;
    let r = 96, g = 52, b = 34; // horizon humifère
    if (depth > 0.16) { const t = smooth(0.16, 0.24, depth); r = lerp(r, 158, t); g = lerp(g, 72, t); b = lerp(b, 42, t); }
    if (depth > 0.58) { const t = smooth(0.58, 0.7, depth); r = lerp(r, 190, t); g = lerp(g, 122, t); b = lerp(b, 70, t); }
    const mott = depth > 0.6 && vnoise(i / 14, y / 14) > 0.62 ? 0.82 : 1;
    const k = (0.82 + 0.3 * n + (R() - 0.5) * 0.12) * mott;
    const o = (y * W + i) * 4;
    d[o] = Math.min(255, r * k); d[o + 1] = Math.min(255, g * k); d[o + 2] = Math.min(255, b * k); d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 260; i++) {
    const py = (0.14 + R() * 0.5) * H, px = R() * W, r = 1 + R() * R() * 6;
    x.fillStyle = `rgba(${60 + R() * 40},${30 + R() * 16},${18 + R() * 10},0.9)`;
    x.beginPath(); x.ellipse(px, py, r, r * 0.8, R() * 3, 0, TAU); x.fill();
  }
  x.strokeStyle = 'rgba(225,190,150,0.16)';
  for (let i = 0; i < 14; i++) {
    let px = R() * W, py = R() * H * 0.3;
    x.lineWidth = 0.5 + R() * 0.6;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 8; k++) { px += (R() - 0.5) * 18; py += 10 + R() * 20; x.lineTo(px, py); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.MirroredRepeatWrapping; // texture non raccordable : le miroir évite la couture
  return t;
}

/** Grains de l'épi en rangées droites : couleur et carte de normales tirées du même relief. */
function kernelTextures() {
  const S = 512, ROWS = 16, ALONG = 42;
  const cc = canvas(S, S), cn = canvas(S, S);
  const ic = ctx2d(cc).createImageData(S, S), inn = ctx2d(cn).createImageData(S, S);
  const hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) {
    const fu = (i / S) * ROWS, row = Math.floor(fu), cu = fu - row;
    const fv = (y / S) * ALONG + (row % 2) * 0.12, kk = Math.floor(fv), cv = fv - kk;
    const du = Math.abs(cu - 0.5) / 0.49, dv = Math.abs(cv - 0.5) / 0.48;
    const inside = Math.max(0, 1 - du ** 4 - dv ** 4);
    hgt[y * S + i] = inside > 0 ? Math.sqrt(inside) : 0;
    const o = (y * S + i) * 4, var1 = hash(row, kk) * 0.12, h = hgt[y * S + i];
    if (h <= 0) { ic.data[o] = 150; ic.data[o + 1] = 100; ic.data[o + 2] = 36; }
    else {
      const crown = Math.max(0, 1 - Math.hypot(cu - 0.45, cv - 0.6) * 3.2);
      ic.data[o] = Math.min(255, (215 + 40 * h) * (1 - var1 * 0.4) + crown * 18);
      ic.data[o + 1] = Math.min(255, (150 + 60 * h) * (1 - var1) + crown * 26);
      ic.data[o + 2] = Math.min(255, 22 + 30 * h + crown * 30);
    }
    ic.data[o + 3] = 255;
  }
  for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) {
    const hx = hgt[y * S + ((i + 1) % S)] - hgt[y * S + ((i + S - 1) % S)];
    const hy = hgt[((y + 1) % S) * S + i] - hgt[((y + S - 1) % S) * S + i];
    const nx = -hx * 2.5, ny = hy * 2.5, l = Math.hypot(nx, ny, 1), o = (y * S + i) * 4;
    inn.data[o] = (nx / l * 0.5 + 0.5) * 255; inn.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; inn.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; inn.data[o + 3] = 255;
  }
  ctx2d(cc).putImageData(ic, 0, 0);
  ctx2d(cn).putImageData(inn, 0, 0);
  const map = new THREE.CanvasTexture(cc), nrm = new THREE.CanvasTexture(cn);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = nrm.wrapS = THREE.RepeatWrapping;
  return { map, nrm };
}

// ---------- sol ----------

function groundGeo(x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, ridged: boolean): Geo {
  const g = new Geo((nx + 1) * (nz + 1), nx * nz * 6);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = lerp(x0, x1, i / nx), z = lerp(z0, z1, j / nz);
    const ry = ridged ? ridgeY(x, z) : 0;
    const k = (0.8 + 0.25 * vnoise(x * 0.3 + 40, z * 0.3)) * (ridged ? 0.9 + 0.1 * (1 + ry / RIDGE) : 1);
    g.vert(x, ry + (ridged ? (vnoise(x * 9, z * 9) - 0.5) * 0.008 : 0), z, x / 1.3, z / 1.3, k, k * 0.97, k * 0.95, 0, 0, 0);
  }
  grid(g, 0, nz + 1, nx + 1);
  g.smooth(0, 0);
  return g;
}
function cutGeo(X: number, nx: number): Geo {
  const g = new Geo((nx + 1) * 2, nx * 6);
  for (let j = 0; j < 2; j++) for (let i = 0; i <= nx; i++) {
    const x = lerp(-X, X, i / nx), y = j ? -CUT : 0;
    g.vert(x, y, 0, x, 1 + y / CUT, 1, 1, 1, 0, 0, 0);
  }
  grid(g, 0, 2, nx + 1);
  g.smooth(0, 0);
  return g;
}

// ---------- three.js ----------

function bufferOf(g: Geo, dynamic: boolean) {
  const b = new THREE.BufferGeometry();
  const at = (a: Float32Array, n: number) => { const x = new THREE.BufferAttribute(a, n); if (dynamic) x.setUsage(THREE.DynamicDrawUsage); return x; };
  b.setAttribute('position', at(g.pos, 3));
  b.setAttribute('normal', at(g.nor, 3));
  b.setAttribute('uv', at(g.uv, 2));
  b.setAttribute('color', at(g.col, 3));
  b.setAttribute('aWind', at(g.wnd, 3));
  const ix = new THREE.BufferAttribute(g.idx, 1);
  if (dynamic) ix.setUsage(THREE.DynamicDrawUsage);
  b.setIndex(ix);
  b.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  b.setDrawRange(0, g.ni);
  return b;
}
function sync(b: THREE.BufferGeometry, g: Geo) {
  for (const name of ['position', 'normal', 'uv', 'color', 'aWind']) {
    const a = b.getAttribute(name) as THREE.BufferAttribute;
    a.clearUpdateRanges();
    a.addUpdateRange(0, g.nv * a.itemSize);
    a.needsUpdate = true;
  }
  const ix = b.getIndex() as THREE.BufferAttribute;
  ix.clearUpdateRanges();
  ix.addUpdateRange(0, g.ni);
  ix.needsUpdate = true;
  b.setDrawRange(0, g.ni);
}

// vent dans l'espace monde : balancement de tout le plant (aWind.x), frémissement des feuilles (aWind.y)
const WIND_VERT = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelMatrix * mvPosition;
{
  float ph = dot( mvPosition.xz, vec2( 0.73, 0.41 ) );
  float sw = uWind * aWind.x, fl = uWind * aWind.y;
  float gust = 0.6 + 0.4 * sin( uTime * 0.37 + ph * 0.11 );
  mvPosition.x += gust * ( sw * ( 0.06 * sin( uTime * 1.25 + ph ) + 0.02 * sin( uTime * 2.7 + ph * 1.9 ) ) + fl * 0.02 * sin( uTime * 4.1 + ph * 2.3 + transformed.y * 9.0 ) );
  mvPosition.z += gust * sw * 0.025 * sin( uTime * 0.93 + ph * 1.3 );
  mvPosition.y += gust * fl * 0.016 * sin( uTime * 3.6 + ph * 1.7 + transformed.x * 11.0 );
}
mvPosition = viewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;
// brume qui s'éclaire en direction du soleil, même formule que le ciel pour un horizon sans couture
const GLOW = 'pow( mu, 8.0 ) + 0.6 * pow( mu, 60.0 )';
const FOG_FRAG = /* glsl */ `
#ifdef USE_FOG
  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  float mu = max( dot( normalize( -vViewPosition ), uSunView ), 0.0 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, uFogCol + uGlow * ( ${GLOW} ), fogFactor );
#endif
`;

interface Uni { [k: string]: THREE.IUniform }

function patch(m: THREE.Material, U: Uni, wind: boolean, plant: boolean, fog: boolean) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    if (wind) {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nattribute vec3 aWind;\nuniform float uTime;\nuniform float uWind;\n${plant ? 'varying float vTrans;' : ''}`)
        .replace('#include <project_vertex>', WIND_VERT + (plant ? '\nvTrans = aWind.z;' : ''));
    }
    if (plant || fog) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uSunView;\nuniform vec3 uSunCol;\nuniform vec3 uFogCol;\nuniform vec3 uGlow;\n${plant ? 'varying float vTrans;' : ''}`);
    }
    if (plant) {
      sh.fragmentShader = sh.fragmentShader
        // R : nervures (luminance) ; G : nervure centrale plus claire, mêlée après la couleur des sommets
        .replace('#include <map_fragment>', '#ifdef USE_MAP\n  vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n  diffuseColor.rgb *= sampledDiffuseColor.r * 1.15;\n#endif')
        .replace('#include <color_fragment>', '#include <color_fragment>\n#ifdef USE_MAP\n  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * 0.5 + vec3( 0.36, 0.38, 0.24 ), sampledDiffuseColor.g * 0.85 );\n#endif')
        // translucidité : la feuille s'allume quand le soleil est derrière elle
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{\n  float mt = max( dot( normalize( -vViewPosition ), uSunView ), 0.0 );\n  totalEmissiveRadiance += diffuseColor.rgb * uSunCol * vTrans * ( 0.12 * mt + 0.9 * pow( mt, 4.0 ) );\n}');
    }
    if (fog) sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', FOG_FRAG);
  };
  m.customProgramCacheKey = () => `f3d${+wind}${+plant}${+fog}`;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`;
// couleurs du ciel directement en espace d'affichage, comme la brume (appliquée après le tone mapping)
const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uFogCol; uniform vec3 uGlow; uniform vec3 uSunDir; uniform vec3 uDisk;
varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir );
  vec3 col = mix( uFogCol, uZenith, pow( smoothstep( 0.0, 0.6, d.y ), 0.75 ) );
  float mu = max( dot( d, uSunDir ), 0.0 );
  col += uGlow * ( ${GLOW} );
  col = mix( col, uDisk, smoothstep( 0.99955, 0.9998, mu ) );
  col += ( fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5 ) / 255.0;
  gl_FragColor = vec4( col, 1.0 );
}`;

/** WebGL 2 disponible (three r169 l'exige). Ne lève jamais. */
export function webglAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof WebGL2RenderingContext === 'undefined') return false;
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

const D3 = (h: number) => new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
// aube fraîche → fin de journée dorée (ciel en espace d'affichage)
const SKY0 = { zenith: D3(0x1f3a63), fog: D3(0xb9a3a2), glow: D3(0x6a4434), disk: D3(0xfff4e0) };
const SKY1 = { zenith: D3(0x283658), fog: D3(0xd39a62), glow: D3(0xa85a1c), disk: D3(0xfff0c0) };
const SUN0 = new THREE.Color(0xffe6cc), SUN1 = new THREE.Color(0xffad58);
const HEMI0 = new THREE.Color(0x8fa3c4), HEMI1 = new THREE.Color(0xc7a078), HEMI_G = new THREE.Color(0x6b3b22);
const VARIANTS: { spec: PlantSpec; k: number }[] = [
  { spec: { seed: 11, lod: 1, leaves: 14, height: 1.62, phi0: 0, tint: -0.7, lean: 0.01 }, k: 0.95 },
  { spec: { seed: 23, lod: 1, leaves: 13, height: 1.72, phi0: 0, tint: 0.2, lean: 0.012 }, k: 1 },
  { spec: { seed: 37, lod: 1, leaves: 14, height: 1.8, phi0: 0, tint: 0.8, lean: 0.008 }, k: 1.045 },
];
const SOWN = [[0, KZ], [0, -0.75], [ROW, -0.45], [-ROW, -0.5], [0, -1.0], [2 * ROW, -0.4], [-2 * ROW, -0.55]];
const MAIN: PlantSpec = { seed: 5, lod: 0, leaves: 14, height: 1.82, phi0: 0.55, tint: 0, lean: 0.01 };

export class Field3D {
  /** Triangles, appels et instances de la dernière image (contrôle du budget). */
  readonly stats = { tris: 0, calls: 0, instances: 0 };
  private readonly lite: boolean;
  private readonly r: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.PerspectiveCamera(40, 1, 0.01, 2500);
  private readonly U: Uni = {
    uTime: { value: 0 }, uWind: { value: 0 }, uSunView: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() },
    uFogCol: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Vector3() },
  };
  private readonly sun = new THREE.DirectionalLight(0xffffff, 3);
  private readonly hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  private readonly sunDir = new THREE.Vector3();
  private readonly skyU: Uni;
  private readonly sky: THREE.Mesh;
  private readonly texs: THREE.Texture[] = [];
  private readonly mats: THREE.Material[] = [];
  // plant principal
  private readonly mainG = new Geo(40000, 150000);
  private readonly cobG = new Geo(2000, 4000);
  private readonly mainB: THREE.BufferGeometry;
  private readonly cobB: THREE.BufferGeometry;
  // champ : 3 variantes de croissance × 2 niveaux de détail
  private readonly layout: Layout;
  private readonly vg: Geo[] = [];
  private readonly vb: THREE.BufferGeometry[] = [];
  private readonly vh = new Float32Array(6);
  private readonly inst: THREE.InstancedMesh[] = [];
  private readonly seeds: THREE.InstancedMesh;
  private readonly headland: THREE.Mesh;
  private readonly earMat: THREE.MeshStandardMaterial;
  // état et objets réutilisés
  private gq = -1;
  private readonly cnt = new Uint32Array(6);
  private key = [NaN, NaN, NaN, NaN, NaN, NaN];
  private readonly v3 = new THREE.Vector3();
  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly eu = new THREE.Euler();
  private readonly sc = new THREE.Vector3();
  private readonly frustum = new THREE.Frustum();
  private readonly sphere = new THREE.Sphere();

  constructor(canvas: HTMLCanvasElement, opts: { lite: boolean }) {
    const lite = (this.lite = opts.lite);
    const r = (this.r = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance', stencil: false }));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.shadowMap.enabled = true;
    r.shadowMap.type = lite ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    const U = this.U, aniso = Math.min(8, r.capabilities.getMaxAnisotropy());
    const tex = <T extends THREE.Texture>(t: T) => { t.anisotropy = aniso; this.texs.push(t); return t; };
    const mat = <M extends THREE.Material>(m: M) => { this.mats.push(m); return m; };

    const leafT = tex(leafTexture()), soilT = tex(soilTexture()), cutT = tex(cutTexture()), kt = kernelTextures();
    tex(kt.map); tex(kt.nrm);
    const plantMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, map: leafT, side: THREE.DoubleSide, roughness: 0.62, metalness: 0 }));
    patch(plantMat, U, true, true, true);
    const depthMat = mat(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
    patch(depthMat, U, true, false, false);
    this.earMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, map: kt.map, normalMap: kt.nrm, roughness: 0.42, metalness: 0 }));
    patch(this.earMat, U, true, false, true);
    const soilMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, map: soilT, bumpMap: soilT, bumpScale: 0.6, roughness: 0.97, metalness: 0 }));
    patch(soilMat, U, false, false, true);
    const cutMat = mat(new THREE.MeshStandardMaterial({ map: cutT, bumpMap: cutT, bumpScale: 0.8, roughness: 1, metalness: 0 }));
    patch(cutMat, U, false, false, true);

    const S = this.scene;
    S.fog = new THREE.FogExp2(0x000000, 0.018);
    // ciel
    this.skyU = { uZenith: { value: new THREE.Vector3() }, uFogCol: U.uFogCol, uGlow: U.uGlow, uSunDir: { value: this.sunDir }, uDisk: { value: new THREE.Vector3() } };
    const skyMat = mat(new THREE.ShaderMaterial({ uniforms: this.skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false }));
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    S.add(this.sky);
    // lumières
    this.sun.castShadow = true;
    const sm = lite ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.bias = -0.0004;
    S.add(this.sun, this.sun.target, this.hemi);

    // sol : billons du champ, tournière (creusée au début), fond plat, paroi de la coupe, canopée lointaine
    const add = (g: Geo, m: THREE.Material, shadow: boolean) => {
      const mesh = new THREE.Mesh(bufferOf(g, false), m);
      mesh.receiveShadow = shadow;
      mesh.frustumCulled = false;
      S.add(mesh);
      return mesh;
    };
    const XN = lite ? 10 : 14, ZN = lite ? 16 : 24;
    add(groundGeo(-XN, XN, -ZN, 0, Math.round((2 * XN) / (lite ? 0.16 : 0.1)), ZN * 2, true), soilMat, true);
    this.headland = add(groundGeo(-60, 60, 0, 40, 24, 16, false), soilMat, true);
    add(groundGeo(-900, 900, -900, 0, 8, 8, false), soilMat, false).position.y = -0.085;
    add(cutGeo(XN, Math.round((2 * XN) / 0.05)), cutMat, true);

    // plant principal
    this.mainB = bufferOf(this.mainG, true);
    this.cobB = bufferOf(this.cobG, true);
    for (const [b, m] of [[this.mainB, plantMat], [this.cobB, this.earMat]] as const) {
      const mesh = new THREE.Mesh(b, m);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.customDepthMaterial = depthMat;
      mesh.frustumCulled = false;
      S.add(mesh);
    }

    // champ instancié
    this.layout = fieldLayout(lite);
    const n = this.layout.n;
    for (let i = 0; i < 6; i++) {
      const lod = i % 2 ? 2 : 1;
      const g = lod === 1 ? new Geo(5000, 16000) : new Geo(1500, 4000);
      this.vg.push(g);
      const b = bufferOf(g, true);
      this.vb.push(b);
      const mesh = new THREE.InstancedMesh(b, plantMat, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = lod === 1 && !lite;
      mesh.receiveShadow = lod === 1;
      mesh.customDepthMaterial = depthMat;
      this.inst.push(mesh);
      S.add(mesh);
    }

    // grains semés
    const kg = new Geo(200, 600);
    kernelGeo(kg);
    this.seeds = new THREE.InstancedMesh(bufferOf(kg, false), plantMat, 7);
    this.seeds.castShadow = true;
    this.seeds.frustumCulled = false;
    S.add(this.seeds);

    // herbes : sur la tournière (qui monte avec elle) et dans les sillons proches
    const gg = new Geo(200, 600);
    grassGeo(gg);
    const gb = bufferOf(gg, false);
    const nG = lite ? 50 : 140;
    const head = new THREE.InstancedMesh(gb, plantMat, nG), rows = new THREE.InstancedMesh(gb, plantMat, nG);
    let nh = 0, nr = 0;
    for (let i = 0; i < nG * 2; i++) {
      const h1 = hash(i, 71), h2 = hash(i, 73), h3 = hash(i, 79);
      this.eu.set(0, h3 * TAU, 0);
      this.q.setFromEuler(this.eu);
      this.sc.setScalar(0.6 + 0.9 * h3);
      if (i % 2 === 0 && nh < nG) {
        this.v3.set((h1 - 0.5) * 14, 0, h2 < 0.25 ? -0.3 - h2 * 8 : 0.3 + h2 * h2 * 9);
        head.setMatrixAt(nh++, this.m4.compose(this.v3, this.q, this.sc));
      } else if (nr < nG) {
        const x = (Math.floor((h1 - 0.5) * 20) + 0.5) * ROW + (h3 - 0.5) * 0.2;
        this.v3.set(x, ridgeY(x) - 0.005, -2.6 - h2 * 6);
        rows.setMatrixAt(nr++, this.m4.compose(this.v3, this.q, this.sc));
      }
    }
    head.count = nh; rows.count = nr;
    for (const m of [head, rows]) { m.frustumCulled = false; m.receiveShadow = true; }
    this.headland.add(head);
    S.add(rows);
  }

  resize(W: number, H: number, dpr: number) {
    this.r.setPixelRatio(Math.min(dpr || 1, this.lite ? 1.5 : 2));
    this.r.setSize(Math.max(1, W), Math.max(1, H), false);
  }

  draw(f: FieldFrame) {
    const g = clamp01(f.grow || 0), gq = Math.round(g * 200) / 200;
    if (gq !== this.gq) { this.gq = gq; this.rebuild(gq); this.key[0] = NaN; }
    const W = Math.max(1, f.W), H = Math.max(1, f.H);
    this.frame(W, H, f.cx, f.groundY, f.unit, g);
    const k = this.key;
    if (k[0] !== g || k[1] !== W || k[2] !== H || k[3] !== f.cx || k[4] !== f.groundY || k[5] !== f.unit) {
      k[0] = g; k[1] = W; k[2] = H; k[3] = f.cx; k[4] = f.groundY; k[5] = f.unit;
      this.fill();
    }
    this.light(clamp01(f.light || 0));
    this.sowing(clamp01(f.seed || 0), g);
    // la tournière remonte et referme la coupe une fois les racines montrées
    this.headland.position.y = -lerp(CUT, 0, smooth(0.24, 0.45, g));
    const t = f.time || 0;
    this.U.uTime.value = t % 3600;
    this.U.uWind.value = t ? 1 : 0;
    this.sky.position.copy(this.cam.position);
    this.r.render(this.scene, this.cam);
    const info = this.r.info.render;
    this.stats.tris = info.triangles;
    this.stats.calls = info.calls;
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
    });
    for (const m of this.mats) m.dispose();
    for (const t of this.texs) t.dispose();
    this.sun.shadow.map?.dispose();
    this.r.dispose();
    this.r.forceContextLoss();
  }

  /** Reconstruit le plant principal et les variantes du champ pour un pas de croissance. */
  private rebuild(g: number) {
    const m = this.mainG, c = this.cobG;
    m.reset(); c.reset();
    buildPlant(m, c, g, MAIN);
    buildUnder(m, g);
    sync(this.mainB, m);
    sync(this.cobB, c);
    for (let i = 0; i < 6; i++) {
      const V = VARIANTS[i >> 1], vg = this.vg[i];
      vg.reset();
      V.spec.lod = i % 2 ? 2 : 1;
      this.vh[i] = buildPlant(vg, null, clamp01(g * V.k), V.spec);
      sync(this.vb[i], vg);
    }
  }

  /** Caméra : basse et proche pour la coupe au début, puis elle recule, monte et tourne d'environ 40° autour du plant. */
  private frame(W: number, H: number, cx: number, gy: number, unit: number, g: number) {
    const cam = this.cam;
    const S = g < 0.12 ? lerp(0.16, 0.32, smooth(0, 0.12, g)) : lerp(0.32, 2.45, smooth(0.12, 0.66, g)); // hauteur monde qui vaut `unit` px
    const ay = lerp(-0.1, 0, smooth(0.14, 0.4, g)); // point posé sur (cx, groundY)
    const ty = ay + S * 0.42;
    const yaw = lerp(-20, 20, smooth(0, 1, g)) * RAD, pitch = lerp(6, 16, smooth(0.15, 0.85, g)) * RAD;
    const fov = 40, d = (S * H) / (Math.max(1, unit) * 2 * Math.tan((fov * RAD) / 2));
    cam.fov = fov;
    cam.aspect = W / H;
    cam.near = Math.min(0.1, Math.max(0.005, d * 0.01));
    cam.position.set(Math.sin(yaw) * Math.cos(pitch) * d, ty + Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
    cam.lookAt(this.v3.set(0, ty, 0));
    cam.clearViewOffset();
    cam.updateMatrixWorld();
    this.v3.set(0, ay, 0).project(cam);
    // décentrement optique : le pied du plant tombe sur (cx, groundY) sans incliner les verticales
    cam.setViewOffset(W, H, ((this.v3.x + 1) / 2) * W - cx, ((1 - this.v3.y) / 2) * H - gy, W, H);
    // ombres serrées autour du plant principal
    const R = Math.max(0.45, S * 1.3), sh = this.sun.shadow.camera;
    if (sh.right !== R) {
      sh.left = sh.bottom = -R; sh.right = sh.top = R; sh.near = 0.5; sh.far = 80;
      sh.updateProjectionMatrix();
      this.sun.shadow.normalBias = R * 0.006;
    }
    this.sun.target.position.set(0, S * 0.35, 0);
  }

  /** Instances visibles, par variante et niveau de détail. */
  private fill() {
    const L = this.layout, cam = this.cam;
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const near = Math.hypot(cam.position.x, cam.position.z) + (this.lite ? 1.5 : 2.5);
    const cnt = this.cnt;
    cnt.fill(0);
    let total = 0;
    for (let i = 0; i < L.n; i++) {
      const x = L.x[i], z = L.z[i], s = L.s[i], vi = L.v[i] * 2, h = this.vh[vi] * s;
      if (!(h > 0)) continue;
      this.sphere.center.set(x, h * 0.5, z);
      this.sphere.radius = h * 0.6 + 0.35;
      if (!this.frustum.intersectsSphere(this.sphere)) continue;
      const mi = vi + (Math.hypot(x - cam.position.x, z - cam.position.z) < near ? 0 : 1), mesh = this.inst[mi], c = cnt[mi]++;
      (mesh.instanceMatrix.array as Float32Array).set(L.m.subarray(i * 16, i * 16 + 16), c * 16);
      (mesh.instanceColor as THREE.InstancedBufferAttribute).array.set(L.c.subarray(i * 3, i * 3 + 3), c * 3);
      total++;
    }
    for (let i = 0; i < 6; i++) {
      const mesh = this.inst[i], ic = mesh.instanceColor as THREE.InstancedBufferAttribute;
      mesh.count = cnt[i];
      mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, cnt[i] * 16); mesh.instanceMatrix.needsUpdate = true;
      ic.clearUpdateRanges(); ic.addUpdateRange(0, cnt[i] * 3); ic.needsUpdate = true;
    }
    this.stats.instances = total;
  }

  /** Soleil, ciel, brume : light 0 = aube fraîche, 1 = fin de journée dorée, soleil bas derrière le plant, ombres longues. */
  private light(l: number) {
    const el = lerp(16, 6.5, l) * RAD, az = lerp(50, 165, l) * RAD;
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir, 30);
    this.sun.color.lerpColors(SUN0, SUN1, l);
    this.sun.intensity = lerp(2.6, 3.2, l);
    this.hemi.color.lerpColors(HEMI0, HEMI1, l);
    this.hemi.groundColor.copy(HEMI_G);
    this.hemi.intensity = lerp(0.95, 1.15, l);
    const U = this.U, sk = this.skyU;
    (sk.uZenith.value as THREE.Vector3).lerpVectors(SKY0.zenith, SKY1.zenith, l);
    (U.uFogCol.value as THREE.Vector3).lerpVectors(SKY0.fog, SKY1.fog, l);
    (U.uGlow.value as THREE.Vector3).lerpVectors(SKY0.glow, SKY1.glow, l);
    (sk.uDisk.value as THREE.Vector3).lerpVectors(SKY0.disk, SKY1.disk, l);
    (U.uSunCol.value as THREE.Color).copy(this.sun.color).multiplyScalar(this.sun.intensity * 0.45);
    (U.uSunView.value as THREE.Vector3).copy(this.sunDir).transformDirection(this.cam.matrixWorldInverse);
  }

  /** Grains semés : ils tombent (seed 0 → 0,75) puis s'enfouissent ; le grain principal glisse contre la paroi de la coupe. */
  private sowing(seed: number, g: number) {
    const sink = Math.max(clamp01((seed - 0.75) / 0.25), smooth(0, 0.02, g));
    let n = 0;
    for (let k = 0; k < SOWN.length; k++) {
      const s = clamp01((seed - k * 0.035) / 0.75);
      if (k === 0 ? !(seed > 0 || g > 0) || g > 0.4 : s <= 0 || sink >= 1 || g > 0) continue;
      const y = s < 1 ? 0.24 * (1 - s * s) + 0.008 : 0.008 + (k === 0 ? KY - 0.008 : -0.05) * sink;
      const tumble = s < 1 ? s * 9 + k : 0;
      this.eu.set(tumble, k * 1.7, s < 1 ? tumble * 0.6 : 0);
      this.q.setFromEuler(this.eu);
      const sw = k === 0 ? 1 + 0.3 * smooth(0, 0.05, g) : 1;
      this.sc.set(sw, sw, 0.6 * sw);
      this.v3.set(SOWN[k][0], y, SOWN[k][1]);
      this.seeds.setMatrixAt(n++, this.m4.compose(this.v3, this.q, this.sc));
    }
    this.seeds.count = n;
    this.seeds.instanceMatrix.needsUpdate = true;
  }
}
