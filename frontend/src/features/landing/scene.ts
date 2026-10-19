// Relief 3D de la landing : les fermes du POC regroupées en colonnes de 0,05° (environ 5,5 km), dessinées en canvas 2D
// avec une perspective calculée à la main. Aucune bibliothèque 3D : le poids reste faible pour les petits appareils.
import relief from './relief.json';

export type Theme = 'dark' | 'light';

const CELL = relief.cell;
const GX_C = 46; // centre approximatif du pays en cellules (lon 2,3° et lat 9,35°)
const GY_C = 187;
const WIDTH_CELLS = 62; // largeur du pays, sert à cadrer la vue sur un écran étroit

export interface Col { x: number; y: number; s: number; n: number; t: number; h: number; delay: number; bucket: number; hl: boolean }
export interface Dep { name: string; x: number; y: number; farms: number }
export interface World { cols: Col[]; deps: Dep[]; total: number; alibori: number }

export const BANIKOARA = { x: 2.44 / CELL - GX_C, y: 11.3 / CELL - GY_C };
const HL_RADIUS = 2.6;

/** `coarse` fusionne les colonnes 2 par 2 : quatre fois moins de dessin sur un petit appareil. */
export function buildWorld(coarse = false): World {
  const f = coarse ? 2 : 1;
  const flat = relief.cells as number[];
  const merged = new Map<number, Col>();
  for (let i = 0; i < flat.length; i += 3) {
    const kx = Math.floor(flat[i] / f);
    const ky = Math.floor(flat[i + 1] / f);
    const key = ky * 1024 + kx;
    const c = merged.get(key);
    if (c) c.n += flat[i + 2];
    else merged.set(key, { x: kx * f + (f - 1) / 2 - GX_C, y: ky * f + (f - 1) / 2 - GY_C, s: f, n: flat[i + 2], t: 0, h: 0, delay: 0, bucket: 0, hl: false });
  }
  const cols = [...merged.values()];
  const max = Math.max(...cols.map((c) => c.n));
  const yMin = Math.min(...cols.map((c) => c.y));
  const ySpan = Math.max(...cols.map((c) => c.y)) - yMin || 1;
  for (const c of cols) {
    c.t = Math.log1p(c.n) / Math.log1p(max);
    c.h = 0.3 + 7.2 * c.t ** 1.2;
    c.bucket = Math.min(15, Math.floor(c.t * 16));
    // la montée part du sud ; un léger bruit déterministe évite l'effet de rangées
    c.delay = ((c.y - yMin) / ySpan) * 0.55 + ((Math.sin(c.x * 12.9898 + c.y * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.2;
    c.hl = Math.hypot(c.x - BANIKOARA.x, c.y - BANIKOARA.y) < HL_RADIUS;
  }
  const deps = relief.departments.map((d) => ({ name: d.name, x: d.lon / CELL - GX_C, y: d.lat / CELL - GY_C, farms: d.farms }));
  return { cols, deps, total: relief.total, alibori: relief.departments.find((d) => d.code === 'alibori')?.farms ?? 0 };
}

// ---------- caméra pilotée par le défilement ----------

export interface Cam { tx: number; ty: number; ratio: number; pitch: number; yaw: number }
const B = BANIKOARA;
const KEYS: [number, Cam][] = [
  [0.0, { tx: 0, ty: 0, ratio: 1, pitch: 34, yaw: -8 }],
  [0.2, { tx: 0, ty: 6, ratio: 0.98, pitch: 40, yaw: -10 }],
  [0.55, { tx: B.x * 0.5, ty: B.y * 0.55, ratio: 0.62, pitch: 48, yaw: -4 }],
  [0.75, { tx: B.x, ty: B.y - 2, ratio: 0.3, pitch: 55, yaw: 0 }],
  [0.9, { tx: B.x + 1.5, ty: B.y - 1, ratio: 0.26, pitch: 62, yaw: 8 }],
  [1.0, { tx: B.x, ty: B.y, ratio: 0.16, pitch: 74, yaw: 0 }], // plongée : l'iris s'ouvre sur le champ
];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function camAt(p: number): Cam {
  const v = clamp01(p);
  let i = 0;
  while (i < KEYS.length - 2 && v > KEYS[i + 1][0]) i++;
  const [p0, a] = KEYS[i];
  const [p1, b] = KEYS[i + 1];
  const k = ease(clamp01((v - p0) / (p1 - p0)));
  const mix = (x: number, y: number) => x + (y - x) * k;
  return { tx: mix(a.tx, b.tx), ty: mix(a.ty, b.ty), ratio: Math.exp(mix(Math.log(a.ratio), Math.log(b.ratio))), pitch: mix(a.pitch, b.pitch), yaw: mix(a.yaw, b.yaw) };
}

/** Opacité d'un acte de texte : [début de l'apparition, fin, début de la sortie, fin]. */
export function actVisibility(p: number, [a0, a1, b0, b1]: [number, number, number, number]) {
  return smooth(a0, a1, p) * (1 - smooth(b0, b1, p));
}
// ---------- palettes ----------

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c: RGB, m: number): RGB => [c[0] * m, c[1] * m, c[2] * m];

function ramp(stops: [number, string][], n = 16): RGB[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    let j = 0;
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const [t0, c0] = stops[j];
    const [t1, c1] = stops[j + 1];
    return lerp(hex(c0), hex(c1), clamp01((t - t0) / (t1 - t0)));
  });
}

interface Palette { bgTop: string; bgBottom: string; top: string[]; front: string[]; side: string[]; peak: [string, string, string]; label: string; ring: string }
const dark = ramp([[0, '#164A2F'], [0.35, '#2A7A47'], [0.7, '#58B04A'], [1, '#B9E24A']]);
const light = ramp([[0, '#CFE3D0'], [0.35, '#8DBB9A'], [0.7, '#3F8B5C'], [1, '#1F5B3A']]);
export const PALETTES: Record<Theme, Palette> = {
  dark: {
    bgTop: '#06170E', bgBottom: '#0F3A22', label: '#EFEBD8', ring: '#C6F432',
    top: dark.map(css), front: dark.map((c) => css(shade(c, 0.58))), side: dark.map((c) => css(shade(c, 0.78))),
    peak: ['#C6F432', css(shade(hex('#C6F432'), 0.6)), css(shade(hex('#C6F432'), 0.8))],
  },
  light: {
    bgTop: '#EEF4E9', bgBottom: '#D6E6CF', label: '#10261A', ring: '#1F5B3A',
    top: light.map(css), front: light.map((c) => css(shade(c, 0.8))), side: light.map((c) => css(shade(c, 0.9))),
    peak: ['#9CCB1E', css(shade(hex('#9CCB1E'), 0.78)), css(shade(hex('#9CCB1E'), 0.9))],
  },
};

// ---------- rendu ----------

export interface Frame { W: number; H: number; p: number; intro: number; theme: Theme }

export class ReliefRenderer {
  private keys: Float32Array;
  private order: number[];
  private fog: { key: string; g: CanvasGradient } | null = null;
  /** Position écran de Banikoara à la dernière image : centre de l'iris qui ouvre le champ. */
  readonly hlScreen = { x: 0, y: 0 };
  private sx = new Float64Array(8);
  private sy = new Float64Array(8);
  private cxs = new Float64Array(8);
  private cys = new Float64Array(8);

  constructor(private ctx: CanvasRenderingContext2D, private world: World) {
    this.keys = new Float32Array(world.cols.length);
    this.order = world.cols.map((_, i) => i);
  }

  draw({ W, H, p, intro, theme }: Frame) {
    const { ctx, world, keys, order } = this;
    const pal = PALETTES[theme];
    const cam = camAt(p);
    const landscape = W > H * 0.9;
    const F = 1.5 * H;
    // portrait : le pays se place en haut et plus petit, le texte occupe le bas de l'écran
    const base = Math.max(150, (WIDTH_CELLS * F) / (0.9 * W * (landscape ? 0.62 : 1))) * (landscape ? 1 : 1.2);
    const dist = base * cam.ratio;
    const cx = landscape ? W * 0.62 : W * 0.5;
    const cy = landscape ? H * 0.56 : H * 0.3;
    const pitch = (cam.pitch * Math.PI) / 180;
    const yaw = (cam.yaw * Math.PI) / 180;
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cw = Math.cos(yaw), sw = Math.sin(yaw);
    const { tx, ty } = cam;
    const hl = smooth(0.45, 0.6, p);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, pal.bgTop);
    bg.addColorStop(1, pal.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // projection d'un point (x, y, z) : écrit [sx, sy] dans `out`, renvoie la profondeur
    const out = [0, 0];
    const project = (x: number, y: number, z: number) => {
      const px = x - tx, py = y - ty;
      const a = px * cw - py * sw;
      const b = px * sw + py * cw;
      const d = dist + b * cp - z * sp;
      const k = F / d;
      out[0] = cx + a * k;
      out[1] = cy - (b * sp + z * cp) * k;
      return d;
    };

    project(BANIKOARA.x, BANIKOARA.y, 3);
    this.hlScreen.x = out[0];
    this.hlScreen.y = out[1];

    if (hl > 0.02) {
      ctx.strokeStyle = pal.ring;
      ctx.globalAlpha = hl * 0.85;
      ctx.lineWidth = 2;
      for (const r of [HL_RADIUS + 0.9, HL_RADIUS + 2.2]) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          project(BANIKOARA.x + Math.cos(a) * r, BANIKOARA.y + Math.sin(a) * r, 0);
          if (i === 0) ctx.moveTo(out[0], out[1]); else ctx.lineTo(out[0], out[1]);
        }
        ctx.stroke();
        ctx.globalAlpha *= 0.5;
      }
      ctx.globalAlpha = 1;
    }

    // ordre du peintre : le plus loin d'abord, puis le plus éloigné de l'axe de la caméra
    const cols = world.cols;
    for (let i = 0; i < cols.length; i++) {
      const px = cols[i].x - tx, py = cols[i].y - ty;
      keys[i] = dist + (px * sw + py * cw) * cp + Math.abs(px * cw - py * sw) * 0.001;
    }
    order.sort((i, j) => keys[j] - keys[i]);

    const sx = this.sx, sy = this.sy, cxs = this.cxs, cys = this.cys;
    for (const idx of order) {
      if (keys[idx] < 12) continue;
      const c = cols[idx];
      const rise = clamp01((intro - c.delay) / 0.9);
      const h = c.h * (1 - (1 - rise) ** 3);
      const half = c.s * 0.5;
      const x0 = c.x - half, x1 = c.x + half, y0 = c.y - half, y1 = c.y + half;
      // coins : 0-3 au sol (sud-ouest, sud-est, nord-est, nord-ouest), 4-7 au sommet ; tableaux réutilisés, pas d'allocation
      cxs[0] = cxs[3] = cxs[4] = cxs[7] = x0;
      cxs[1] = cxs[2] = cxs[5] = cxs[6] = x1;
      cys[0] = cys[1] = cys[4] = cys[5] = y0;
      cys[2] = cys[3] = cys[6] = cys[7] = y1;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let k = 0; k < 8; k++) {
        project(cxs[k], cys[k], k < 4 ? 0 : h);
        sx[k] = out[0]; sy[k] = out[1];
        if (out[0] < minX) minX = out[0];
        if (out[0] > maxX) maxX = out[0];
        if (out[1] < minY) minY = out[1];
        if (out[1] > maxY) maxY = out[1];
      }
      if (maxX < -20 || minX > W + 20 || maxY < -20 || minY > H + 20) continue;
      const lit = c.hl && hl > 0.5;
      const top = lit ? pal.peak[0] : pal.top[c.bucket];
      const front = lit ? pal.peak[1] : pal.front[c.bucket];
      const side = lit ? pal.peak[2] : pal.side[c.bucket];
      const a = (c.x - tx) * cw - (c.y - ty) * sw; // position par rapport à l'axe de la caméra
      this.quad(front, 0, 1, 5, 4); // face sud, toujours tournée vers la caméra
      if (a < 0) this.quad(side, 1, 2, 6, 5); // face est, visible à gauche de l'axe
      else this.quad(side, 3, 0, 4, 7); // face ouest, visible à droite
      this.quad(top, 4, 5, 6, 7);
    }

    // brume : le lointain se fond dans le fond
    const key = `${H}${theme}`;
    if (this.fog?.key !== key) {
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
      g.addColorStop(0, pal.bgTop);
      g.addColorStop(1, theme === 'dark' ? 'rgba(6,23,14,0)' : 'rgba(238,244,233,0)');
      this.fog = { key, g };
    }
    ctx.fillStyle = this.fog.g;
    ctx.fillRect(0, 0, W, H * 0.5);

    this.labels(pal, p, project, out, W);
  }

  private quad(fill: string, i0: number, i1: number, i2: number, i3: number) {
    const { ctx, sx, sy } = this;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(sx[i0], sy[i0]);
    ctx.lineTo(sx[i1], sy[i1]);
    ctx.lineTo(sx[i2], sy[i2]);
    ctx.lineTo(sx[i3], sy[i3]);
    ctx.closePath();
    ctx.fill();
  }

  /** Texte avec un contour de la couleur du fond : lisible quel que soit ce qui passe derrière. */
  private halo(text: string, x: number, y: number, pal: Palette) {
    const { ctx } = this;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = pal.bgTop;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = pal.label;
    ctx.fillText(text, x, y);
  }

  private labels(pal: Palette, p: number, project: (x: number, y: number, z: number) => number, out: number[], W: number) {
    const { ctx, world } = this;
    const small = W < 520;
    // écran étroit : le texte du hero couvre la carte, les étiquettes n'apparaissent qu'une fois qu'il est sorti
    const overview = (1 - smooth(0.2, 0.4, p)) * (W < 860 ? smooth(0.09, 0.13, p) : 1);
    ctx.textBaseline = 'middle';
    if (overview > 0.02) {
      ctx.font = `600 ${small ? 12 : 14}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
      ctx.globalAlpha = overview;
      for (const d of world.deps) {
        if (d.farms < 20000 && d.name !== 'Littoral') continue;
        project(d.x, d.y, 0);
        ctx.fillStyle = pal.peak[0];
        ctx.beginPath();
        ctx.arc(out[0], out[1], 3, 0, Math.PI * 2);
        ctx.fill();
        const text = d.farms >= 20000 ? `${d.name} ${d.farms.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0')}` : d.name;
        this.halo(text, out[0] + 8, out[1], pal);
      }
      ctx.globalAlpha = 1;
    }
    // écran étroit : la carte de la parcelle passe devant, son étiquette « Banikoara » suffit
    const here = W < 860 ? 0 : smooth(0.5, 0.62, p) * (1 - smooth(0.9, 1, p));
    if (here > 0.02) {
      project(BANIKOARA.x, BANIKOARA.y, 9.5);
      ctx.font = `600 ${small ? 14 : 18}px "Young Serif", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = here;
      this.halo('Banikoara', out[0], out[1], pal);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    }
  }
}
