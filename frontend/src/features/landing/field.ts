// Champ de maïs de la landing, en 3D dessinée à la main dans un canvas 2D (même technique que le relief de scene.ts).
// Monde : x à droite, y en profondeur, z vers le haut ; le plant principal est à l'origine et mesure 1 une fois mûr.
// Faces triées par le peintre, ombrage Lambert, tampons typés réutilisés : pas d'allocation par image.
import { clamp01, smooth, type Theme } from './scene';

export type Stage = 'semis' | 'croissance' | 'floraison' | 'recolte';

/** Stade affiché pour une croissance de 0 à 1 (NaN compte comme le semis). */
export function stageAt(grow: number): Stage {
  if (!(grow >= 0.12)) return 'semis';
  if (grow < 0.55) return 'croissance';
  if (grow < 0.8) return 'floraison';
  return 'recolte';
}

export interface FieldFrame { W: number; H: number; theme: Theme; seed: number; grow: number; light: number; time: number; cx: number; groundY: number; unit: number; lite: boolean }

// ---------- couleurs ----------

const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t)).toString(16).padStart(2, '0')).join('');
}
const rgba = (h: string, a: number) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

interface Pal {
  skyTop: [string, string]; skyLow: [string, string]; sun: [string, string]; // [aube, fin de journée]
  field: string; furrow: string; soil: [string, string, string]; under: string; pebble: string; shadow: string;
  stem: string; leaf: string; rib: string; tassel: string; silk: string; husk: string; kernel: string; root: string; straw: string;
}
const PAL: Record<Theme, Pal> = {
  dark: {
    skyTop: ['#0B2230', '#0A2417'], skyLow: ['#6E5A6E', '#B8742A'], sun: ['#F4C9BE', '#F7C14A'],
    field: '#24432A', furrow: '#14281A', soil: ['#3A2A1C', '#4B3725', '#5C4632'], under: '#06170E', pebble: '#76604A', shadow: 'rgba(0,0,0,0.3)',
    stem: '#3E8E3A', leaf: '#58B04A', rib: '#C6F432', tassel: '#E6D9A0', silk: '#E8B4A0', husk: '#7DBA4F', kernel: '#F2C230', root: '#EFEBD8', straw: '#C9A85A',
  },
  light: {
    skyTop: ['#DCE8F0', '#F3EBD3'], skyLow: ['#F6E1DC', '#F2C26B'], sun: ['#FBE3DA', '#F6B73C'],
    field: '#A9BE8A', furrow: '#8DA26C', soil: ['#8A6A4A', '#A88763', '#C4A983'], under: '#E4ECDD', pebble: '#E2D2B4', shadow: 'rgba(31,50,30,0.2)',
    stem: '#2F7A45', leaf: '#3F8B5C', rib: '#9CCB1E', tassel: '#C9B26A', silk: '#C77F6A', husk: '#5E9E4A', kernel: '#E9AE1E', root: '#F7F0DE', straw: '#C8A24E',
  },
};

// matières : couleur de base, puis 16 niveaux d'éclairage et 4 niveaux de brume, chaînes créées une seule fois
const STEM = 0, LEAF = 1, TASSEL = 2, HUSK = 3, KERNEL = 4, SILK = 5, ROOT = 6, GRAIN = 7, SHOOT = 8, NMAT = 9;
const LEV = 16, FOG = 4;

interface Look {
  key: string; sky: CanvasGradient; top: CanvasGradient; glow: CanvasGradient; sun: string; sunX: number; sunY: number;
  base: Float32Array; sunC: number[]; fogC: number[]; cols: (string | undefined)[];
}

const hash = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

const MAXF = 2600; // capacité du tampon de faces
const DIST = 3.2; // distance de la caméra à sa cible, en hauteurs de plant
const SLAB = 0.42; // épaisseur du bloc de terre
const ROW0 = 1.1, ROW_GAP = 0.6; // rangées d'arrière-plan
const RAD = Math.PI / 180;

// ---------- rendu ----------

export class FieldRenderer {
  /** Faces dessinées à la dernière image (contrôle du budget). */
  faces = 0;
  private look: Look | null = null;
  // caméra et soleil de l'image courante
  private cw = 1; private sw = 0; private cp = 1; private sp = 0; private tz = 0; private F = 1; private ox = 0; private oy = 0;
  private camX = 0; private camY = 0; private camZ = 0; private Lx = 0; private Ly = 0; private Lz = 1;
  private PX = 0; private PY = 0;
  private lm = 0; private lc = 0;
  // faces projetées
  private fx = new Float32Array(MAXF * 4);
  private fy = new Float32Array(MAXF * 4);
  private fv = new Uint8Array(MAXF);
  private fd = new Float32Array(MAXF);
  private fc = new Uint16Array(MAXF);
  private order = new Uint16Array(MAXF);
  private n = 0;
  private byDepth = (a: number, b: number) => this.fd[b] - this.fd[a];
  // face en cours (monde), chemins des tubes et rubans
  private qx = new Float64Array(4); private qy = new Float64Array(4); private qz = new Float64Array(4);
  private px = new Float64Array(24); private py = new Float64Array(24); private pz = new Float64Array(24); private pr = new Float64Array(24);
  private wx = new Float64Array(24); private wy = new Float64Array(24); private wz = new Float64Array(24);
  private ring = new Float64Array(2 * 8 * 3);
  private mat = 0; private fog = 0;
  private swX = 0; private swA = 0; private swH = 1;

  constructor(private ctx: CanvasRenderingContext2D) {}

  draw(f: FieldFrame) {
    const { ctx } = this;
    const { W, H, theme, grow, light, time, cx, groundY, unit, lite } = f;
    const pal = PAL[theme];
    this.faces = 0;

    // caméra : orbite d'environ 56° autour du plant au fil de la croissance, cible qui monte avec lui
    const v = clamp01((grow - 0.11) / 0.5);
    const hNow = grow < 0.11 ? 0 : 0.03 + 0.97 * smooth(0, 1, v);
    const yaw = (-28 + 56 * smooth(0, 1, grow)) * RAD, pitch = (8 + 5 * v) * RAD;
    this.cw = Math.cos(yaw); this.sw = Math.sin(yaw); this.cp = Math.cos(pitch); this.sp = Math.sin(pitch);
    this.tz = 0.08 + 0.42 * hNow;
    this.F = unit * (DIST + this.tz * this.sp); // 1 unité monde = `unit` px au pied du plant
    this.ox = cx;
    this.oy = groundY - this.tz * this.cp * unit; // le pied du plant tombe exactement sur groundY
    const b = -DIST * this.cp;
    this.camX = b * this.sw; this.camY = b * this.cw; this.camZ = this.tz + DIST * this.sp;
    // soleil à droite, un peu en avant : bas et froid à l'aube, plus haut et doré le soir
    const l = clamp01(light), lx = 0.8, ly = -0.35, lz = 0.28 + 0.3 * l, ln = Math.hypot(lx, ly, lz);
    this.Lx = lx / ln; this.Ly = ly / ln; this.Lz = lz / ln;
    const horizon = this.oy - (this.F * this.sp) / this.cp;
    const look = this.getLook(f, pal, horizon);

    // ciel, halo et disque du soleil
    ctx.fillStyle = look.sky;
    ctx.fillRect(0, 0, W, horizon + 1);
    ctx.fillStyle = look.glow;
    ctx.fillRect(0, 0, W, horizon + 1);
    ctx.fillStyle = look.sun;
    ctx.beginPath();
    ctx.arc(look.sunX, look.sunY, Math.max(10, unit * 0.045), 0, Math.PI * 2);
    ctx.fill();

    // bloc de terre : dessus (surface du champ) jusqu'à l'horizon, sillons, face avant coupée en horizons
    this.line(0, 0);
    ctx.fillStyle = look.top;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(W, horizon);
    ctx.lineTo(W, this.lc + this.lm * W);
    ctx.lineTo(0, this.lc);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.furrow;
    const furrows = lite ? 6 : 10;
    for (let r = 1; r <= furrows; r++) {
      this.line(r * ROW_GAP * 0.5 + 0.15, 0);
      ctx.lineWidth = Math.max(0.5, 1.6 - r * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, this.lc);
      ctx.lineTo(W, this.lc + this.lm * W);
      ctx.stroke();
    }
    this.band(0, -0.11, W, pal.soil[0]);
    this.band(-0.11, -0.3, W, pal.soil[1]);
    this.band(-0.3, -SLAB, W, pal.soil[2]);
    this.line(0, -SLAB);
    ctx.fillStyle = pal.under; // sous le bloc
    ctx.beginPath();
    ctx.moveTo(0, this.lc);
    ctx.lineTo(W, this.lc + this.lm * W);
    ctx.lineTo(W, H + 1);
    ctx.lineTo(0, H + 1);
    ctx.closePath();
    ctx.fill();
    this.line(0, 0);
    ctx.strokeStyle = pal.furrow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.lc);
    ctx.lineTo(W, this.lc + this.lm * W);
    ctx.stroke();
    if (!lite) {
      ctx.fillStyle = pal.pebble;
      for (let i = 0; i < 12; i++) {
        this.proj(-2.4 + hash(i, 3) * 4.8, 0, -0.13 - hash(i, 7) * (SLAB - 0.16));
        ctx.beginPath();
        ctx.arc(this.PX, this.PY, 1.5 + hash(i, 5) * unit * 0.008, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // sous terre : grain, coléoptile, racines (tubes vus par la face coupée)
    this.fog = 0;
    this.underground(f);
    this.flush(lite);

    // ombre portée du plant principal, aplatie sur le sol dans l'axe du soleil
    if (hNow > 0) this.shadow(hNow, v, pal.shadow);

    // au-dessus du sol : rangées d'arrière-plan en vraie perspective, plant principal, grains qui tombent
    const rows = lite ? 3 : 4, perRow = lite ? 6 : 11;
    for (let r = 0; r < rows; r++) {
      const y = ROW0 + r * ROW_GAP;
      const k = this.F / (DIST + y * this.cw * this.cp + this.tz * this.sp);
      const x0 = ((-40 - this.ox) / k + y * this.sw) / this.cw, x1 = ((W + 40 - this.ox) / k + y * this.sw) / this.cw;
      const step = Math.max(0.32, (x1 - x0) / perRow);
      this.fog = Math.min(FOG - 1, r + 1);
      for (let i = 0, x = x0 + step * (r % 2 ? 0.5 : 0.15); x < x1; i++, x += step) {
        const hh = hash(i, r);
        this.plant(x + (hh - 0.5) * step * 0.3, y, 0.72 * (0.85 + 0.3 * hh), clamp01(grow * (0.94 + 0.1 * hh)), false, lite, time, hh * 6, hh * Math.PI);
      }
    }
    this.fog = 0;
    this.plant(0, 0, 1, grow, true, lite, time, 0, 0.3);
    this.falling(f);
    this.flush(lite);
  }

  // ---------- projection ----------

  /** Projette (x, y, z) : écrit PX, PY et renvoie la profondeur. */
  private proj(x: number, y: number, z: number) {
    const a = x * this.cw - y * this.sw, b = x * this.sw + y * this.cw, zz = z - this.tz;
    const d = DIST + b * this.cp - zz * this.sp;
    const k = this.F / d;
    this.PX = this.ox + a * k;
    this.PY = this.oy - (b * this.sp + zz * this.cp) * k;
    return d;
  }

  /** Droite écran de l'arête (y, z) parallèle à x : sy = lc + lm * sx. Deux points proches suffisent, sans souci de plan proche. */
  private line(y: number, z: number) {
    this.proj(-0.5, y, z);
    const x0 = this.PX, y0 = this.PY;
    this.proj(0.5, y, z);
    this.lm = (this.PY - y0) / (this.PX - x0);
    this.lc = y0 - this.lm * x0;
  }

  /** Bande de la face avant du bloc entre deux profondeurs. */
  private band(z1: number, z2: number, W: number, fill: string) {
    const { ctx } = this;
    this.line(0, z1);
    const a0 = this.lc, a1 = this.lc + this.lm * W;
    this.line(0, z2);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, a0);
    ctx.lineTo(W, a1);
    ctx.lineTo(W, this.lc + this.lm * W);
    ctx.lineTo(0, this.lc);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- couleurs ----------

  /** Dégradés et couleurs de base : recalculés seulement si la taille, le thème, la lumière, la maturité ou l'horizon changent. */
  private getLook(f: FieldFrame, p: Pal, horizon: number): Look {
    const lq = Math.round(clamp01(f.light) * 24) / 24;
    const rq = Math.round(smooth(0.8, 1, f.grow) * 16) / 16;
    const hq = Math.round(horizon / 4) * 4;
    const key = `${f.W}|${f.H}|${f.groundY}|${f.unit}|${f.theme}|${lq}|${rq}|${hq}`;
    if (this.look?.key === key) return this.look;
    const { ctx } = this;
    const top = mix(p.skyTop[0], p.skyTop[1], lq), low = mix(p.skyLow[0], p.skyLow[1], lq), sun = mix(p.sun[0], p.sun[1], lq);
    const sky = ctx.createLinearGradient(0, 0, 0, hq);
    sky.addColorStop(0, top);
    sky.addColorStop(1, low);
    const field = ctx.createLinearGradient(0, hq, 0, f.groundY);
    field.addColorStop(0, mix(p.field, low, 0.6));
    field.addColorStop(1, mix(p.field, sun, lq * 0.12));
    const sunX = f.W * (f.W > f.H * 0.9 ? 0.88 : 0.84), sunY = hq - f.unit * (0.06 + 0.08 * lq);
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, f.unit * 0.9);
    glow.addColorStop(0, rgba(sun, 0.55));
    glow.addColorStop(1, rgba(sun, 0));
    const base = new Float32Array(NMAT * 3);
    const mats = [
      mix(p.stem, p.straw, rq * 0.6), mix(p.leaf, p.straw, rq * 0.5), mix(p.tassel, p.straw, rq * 0.5), mix(p.husk, p.straw, rq),
      p.kernel, mix(p.silk, '#7A4A2A', rq), p.root, p.kernel, mix(p.rib, p.root, 0.4),
    ];
    mats.forEach((c, i) => base.set(rgb(c), i * 3));
    this.look = { key, sky, top: field, glow, sun, sunX, sunY, base, sunC: rgb(sun), fogC: rgb(low), cols: new Array(NMAT * FOG * LEV) };
    return this.look;
  }

  private color(i: number) {
    const L = this.look as Look;
    const c = L.cols[i];
    if (c) return c;
    const lev = i % LEV, fog = Math.floor(i / LEV) % FOG, mat = Math.floor(i / (LEV * FOG));
    const s = lev / (LEV - 1), br = 0.5 + 0.65 * s, warm = 0.14 * s, fg = fog * 0.22;
    let out = 'rgb(';
    for (let ch = 0; ch < 3; ch++) {
      let x = L.base[mat * 3 + ch] * br;
      x += (L.sunC[ch] - x) * warm;
      x += (L.fogC[ch] - x) * fg;
      out += Math.round(Math.min(255, x)) + (ch < 2 ? ',' : ')');
    }
    L.cols[i] = out;
    return out;
  }

  // ---------- faces ----------

  /** Face de qx/qy/qz (3 ou 4 sommets). `cull` : face de tube, orientée vers l'extérieur depuis (rx, ry, rz) et éliminée si elle tourne le dos. */
  private emit(nv: number, cull: boolean, rx = 0, ry = 0, rz = 0) {
    if (this.n >= MAXF) return;
    const { qx, qy, qz } = this;
    const ax = qx[2] - qx[0], ay = qy[2] - qy[0], az = qz[2] - qz[0];
    const j = nv === 4 ? 3 : 1;
    const bx = qx[j] - qx[nv === 4 ? 1 : 0], by = qy[j] - qy[nv === 4 ? 1 : 0], bz = qz[j] - qz[nv === 4 ? 1 : 0];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) return;
    nx /= len; ny /= len; nz /= len;
    let mx = 0, my = 0, mz = 0;
    for (let k = 0; k < nv; k++) { mx += qx[k]; my += qy[k]; mz += qz[k]; }
    mx /= nv; my /= nv; mz /= nv;
    if (cull && nx * (mx - rx) + ny * (my - ry) + nz * (mz - rz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (nx * (this.camX - mx) + ny * (this.camY - my) + nz * (this.camZ - mz) < 0) {
      if (cull) return; // face arrière d'un tube fermé
      nx = -nx; ny = -ny; nz = -nz; // ruban : on voit l'autre côté
    }
    const lam = Math.max(0, nx * this.Lx + ny * this.Ly + nz * this.Lz);
    const s = clamp01(lam * 0.85 + Math.max(0, nz) * 0.25);
    const f = this.n, o = f * 4;
    let dsum = 0;
    for (let k = 0; k < nv; k++) {
      const d = this.proj(qx[k], qy[k], qz[k]);
      if (!(d > 0.1)) return;
      this.fx[o + k] = this.PX;
      this.fy[o + k] = this.PY;
      dsum += d;
    }
    this.fv[f] = nv;
    this.fd[f] = dsum / nv;
    this.fc[f] = (this.mat * FOG + this.fog) * LEV + Math.round(s * (LEV - 1));
    this.n++;
  }

  /** Dessine les faces en attente, de la plus lointaine à la plus proche. */
  private flush(lite: boolean) {
    const { ctx, n, order, fx, fy, fv, fc } = this;
    for (let i = 0; i < n; i++) order[i] = i;
    order.subarray(0, n).sort(this.byDepth);
    ctx.lineWidth = 0.6;
    for (let i = 0; i < n; i++) {
      const f = order[i], o = f * 4;
      const col = this.color(fc[f]);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(fx[o], fy[o]);
      for (let k = 1; k < fv[f]; k++) ctx.lineTo(fx[o + k], fy[o + k]);
      ctx.closePath();
      ctx.fill();
      if (!lite) { ctx.strokeStyle = col; ctx.stroke(); } // masque les joints entre faces voisines
    }
    this.faces += n;
    this.n = 0;
  }

  /** Tube polygonal le long du chemin px/py/pz de rayons pr (np points). */
  private tube(np: number, sides: number, mat: number) {
    const { px, py, pz, pr, ring, qx, qy, qz } = this;
    this.mat = mat;
    const ex = px[np - 1] - px[0], ey = py[np - 1] - py[0], ez = pz[np - 1] - pz[0];
    const vert = Math.abs(ez) > 0.7 * Math.hypot(ex, ey, ez);
    for (let i = 0; i < np; i++) {
      const i0 = i > 0 ? i - 1 : 0, i1 = i < np - 1 ? i + 1 : np - 1;
      let tx = px[i1] - px[i0], ty = py[i1] - py[i0], tz = pz[i1] - pz[i0];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      // repère perpendiculaire : t × x pour un tube vertical, t × z sinon
      let ux = vert ? 0 : ty, uy = vert ? tz : -tx, uz = vert ? -ty : 0;
      const ul = Math.hypot(ux, uy, uz);
      if (ul < 1e-9) { ux = 1; uy = 0; uz = 0; } else { ux /= ul; uy /= ul; uz /= ul; }
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      const cur = (i & 1) * 24, prev = 24 - cur;
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2, c = Math.cos(a) * pr[i], s = Math.sin(a) * pr[i];
        ring[cur + j * 3] = px[i] + c * ux + s * vx;
        ring[cur + j * 3 + 1] = py[i] + c * uy + s * vy;
        ring[cur + j * 3 + 2] = pz[i] + c * uz + s * vz;
      }
      if (i === 0) continue;
      const rx = (px[i] + px[i - 1]) / 2, ry = (py[i] + py[i - 1]) / 2, rz = (pz[i] + pz[i - 1]) / 2;
      for (let j = 0; j < sides; j++) {
        const j2 = (j + 1) % sides;
        qx[0] = ring[prev + j * 3]; qy[0] = ring[prev + j * 3 + 1]; qz[0] = ring[prev + j * 3 + 2];
        qx[1] = ring[prev + j2 * 3]; qy[1] = ring[prev + j2 * 3 + 1]; qz[1] = ring[prev + j2 * 3 + 2];
        qx[2] = ring[cur + j2 * 3]; qy[2] = ring[cur + j2 * 3 + 1]; qz[2] = ring[cur + j2 * 3 + 2];
        qx[3] = ring[cur + j * 3]; qy[3] = ring[cur + j * 3 + 1]; qz[3] = ring[cur + j * 3 + 2];
        this.emit(4, true, rx, ry, rz);
      }
    }
  }

  /** Ruban double face : axe px/py/pz, demi-largeur wx/wy/wz (np points). */
  private ribbon(np: number, mat: number) {
    const { px, py, pz, wx, wy, wz, qx, qy, qz } = this;
    this.mat = mat;
    for (let i = 1; i < np; i++) {
      qx[0] = px[i - 1] - wx[i - 1]; qy[0] = py[i - 1] - wy[i - 1]; qz[0] = pz[i - 1] - wz[i - 1];
      qx[1] = px[i - 1] + wx[i - 1]; qy[1] = py[i - 1] + wy[i - 1]; qz[1] = pz[i - 1] + wz[i - 1];
      qx[2] = px[i] + wx[i]; qy[2] = py[i] + wy[i]; qz[2] = pz[i] + wz[i];
      qx[3] = px[i] - wx[i]; qy[3] = py[i] - wy[i]; qz[3] = pz[i] - wz[i];
      this.emit(4, false);
    }
  }

  private pt(i: number, x: number, y: number, z: number, r: number) {
    this.px[i] = x; this.py[i] = y; this.pz[i] = z; this.pr[i] = r;
  }

  /** Grain de maïs : fuseau court. */
  private grain(x: number, y: number, z: number, r: number, sides: number) {
    for (let k = 0; k < 5; k++) this.pt(k, x, y, z - r + (r * 2 * k) / 4, r * 0.85 * Math.sin((Math.PI * (k + 0.3)) / 4.6));
    this.tube(5, sides, GRAIN);
  }

  // ---------- scène ----------

  private sway(z: number) { return this.swX + (this.swA * z * z) / this.swH; }

  /** Grain enfoui, coléoptile et racines du plant principal. */
  private underground({ grow, seed, lite }: FieldFrame) {
    if (seed < 0.75) return; // encore en l'air : voir `falling`
    const depth = 0.09, gr = 0.026 * (1 + 0.3 * smooth(0, 0.05, grow));
    const gz = -depth * clamp01((seed - 0.75) / 0.25);
    const v = clamp01((grow - 0.11) / 0.5);
    const sides = lite ? 3 : 5;

    // racine primaire, puis latérales qui naissent quand la pointe dépasse leur profondeur
    const rad = clamp01((grow - 0.025) / 0.35);
    const tip = Math.min(0.3 * (1 - (1 - rad) ** 2), SLAB + gz - 0.04);
    const top = gz - gr * 0.8;
    if (rad > 0 && tip > 0.002) {
      const m = lite ? 4 : 7;
      for (let k = 0; k <= m; k++) {
        const s = k / m;
        this.pt(k, 0.02 * Math.sin(s * 3), 0.01 * Math.sin(s * 5), top - tip * s, 0.006 * (1 - 0.7 * s) + 0.001);
      }
      this.tube(m + 1, sides, ROOT);
      const nl = lite ? 3 : 6;
      for (let j = 0; j < nl; j++) {
        const a = 0.15 + (0.8 / nl) * j, yj = 0.3 * a;
        const l = clamp01((tip - yj) / 0.12) * 0.1 * (1 - a * 0.4);
        if (l <= 0) continue;
        const s = yj / Math.max(tip, 1e-6), th = j * 2.4;
        const x0 = 0.02 * Math.sin(s * 3), y0 = 0.01 * Math.sin(s * 5), z0 = top - yj;
        const dx = Math.cos(th), dy = Math.abs(Math.sin(th)) * 0.4;
        this.pt(0, x0, y0, z0, 0.003);
        this.pt(1, x0 + dx * l * 0.6, y0 + dy * l * 0.6, z0 - l * 0.1, 0.002);
        this.pt(2, x0 + dx * l, y0 + dy * l, z0 - l * 0.45, 0.001);
        this.tube(3, 3, ROOT);
      }
      const sem = clamp01((grow - 0.06) / 0.25) * 0.12;
      if (sem > 0) {
        for (let s = -1; s <= 1; s += 2) {
          this.pt(0, s * gr * 0.6, 0, gz - gr * 0.4, 0.004);
          this.pt(1, s * sem * 0.7, 0.01, gz - sem * 0.2, 0.003);
          this.pt(2, s * sem, 0.02, gz - sem * 0.75, 0.001);
          this.tube(3, 3, ROOT);
        }
      }
    }
    // racines coronaires au pied de la tige, une fois le plant levé
    const crown = clamp01((v - 0.15) / 0.5) * 0.16;
    if (crown > 0) {
      const nc = lite ? 3 : 5;
      for (let j = 0; j < nc; j++) {
        const th = (j / nc) * Math.PI * 2 + 0.3, dx = Math.cos(th), dy = Math.abs(Math.sin(th)) * 0.3;
        this.pt(0, 0, 0, -0.012, 0.005);
        this.pt(1, dx * crown * 0.5, dy * crown * 0.5, -crown * 0.25, 0.004);
        this.pt(2, dx * crown * 0.8, dy * crown * 0.8, -crown * 0.8, 0.001);
        this.tube(3, lite ? 3 : 4, ROOT);
      }
    }
    // coléoptile : la pousse monte du grain jusqu'à la surface
    const col = clamp01((grow - 0.03) / 0.08);
    if (col > 0) {
      const z0 = gz + gr * 0.8;
      this.pt(0, 0, 0, z0, 0.006);
      this.pt(1, 0, 0, z0 + (0.01 - z0) * col, 0.003);
      this.tube(2, lite ? 3 : 4, SHOOT);
    }
    this.grain(0, 0, gz, gr, lite ? 4 : 6);
  }

  /** Grains qui tombent du ciel : le principal se pose au pied du plant, les autres sur les rangées. */
  private falling({ seed, lite }: FieldFrame) {
    if (seed <= 0 || seed >= 0.75) return;
    for (let k = 0; k < 5; k++) {
      const s = clamp01((seed - k * 0.04) / 0.75);
      if (s <= 0 || s >= 1) continue;
      const x = k === 0 ? 0 : (k % 2 ? 1 : -1) * (0.35 + 0.3 * k), y = k === 0 ? 0 : ROW0 + ((k - 1) % 2) * ROW_GAP;
      this.grain(x, y, 1.4 * (1 - s * s), 0.026, lite ? 4 : 6);
    }
  }

  /** Ombre portée : polygone aplati sur le sol, de la base vers l'ombre du sommet. */
  private shadow(h: number, v: number, fill: string) {
    const { ctx, Lx, Ly, Lz } = this;
    let ex = (-Lx * h) / Lz, ey = (-Ly * h) / Lz;
    const el = Math.hypot(ex, ey), cap = 1.5 * h;
    if (el > cap) { ex *= cap / el; ey *= cap / el; }
    const len = Math.min(el, cap), ux = ex / (len || 1), uy = ey / (len || 1);
    const a = len / 2 + 0.03, bw = 0.05 + 0.2 * h * v;
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const t = (k / 14) * Math.PI * 2, c = Math.cos(t) * a, s = Math.sin(t) * bw;
      this.proj(ex / 2 + ux * c - uy * s, Math.max(0, ey / 2 + uy * c + ux * s), 0);
      if (k === 0) ctx.moveTo(this.PX, this.PY); else ctx.lineTo(this.PX, this.PY);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** Plant de maïs : tige-tube à nœuds, feuilles-rubans alternées à 180°, panicule, épi avec spathes et soies. */
  private plant(X: number, Y: number, S: number, grow: number, main: boolean, lite: boolean, time: number, phase: number, phi0: number) {
    if (grow < 0.11) return;
    const { px, py, pz, wx, wy, wz } = this;
    const v = clamp01((grow - 0.11) / 0.5);
    const h = S * (0.03 + 0.97 * smooth(0, 1, v));
    const amp = time ? Math.sin(time * 1.2 + phase) * 0.03 * S : 0; // vent léger, nul quand time = 0
    this.swX = X; this.swA = amp; this.swH = h;
    const N = main ? 8 : 4;
    const r0 = S * 0.018 * (0.35 + 0.65 * v);

    // tige : un anneau renflé à chaque nœud
    let np = 0;
    for (let i = 0; i <= N; i++) {
      const z = (h * i) / N, r = r0 * (1 - (0.45 * i) / N);
      this.pt(np++, this.sway(z), Y, z, main && i > 0 && i < N ? r * 1.25 : r);
      if (main && i < N) { const zm = z + h / (2 * N); this.pt(np++, this.sway(zm), Y, zm, r * 0.95); }
    }
    this.tube(np, main ? (lite ? 5 : 7) : lite ? 3 : 4, STEM);

    // feuilles : montent puis retombent en arc, avec une torsion le long du ruban
    const segs = main ? (lite ? 4 : 7) : lite ? 2 : 3;
    for (let i = 1; i < N; i++) {
      const lg = clamp01((v - ((i - 1) / N) * 0.8) / 0.25);
      if (lg <= 0) continue;
      const fr = i / N;
      const L = S * 0.56 * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, fr * 1.15))) * lg;
      const phi = phi0 + i * Math.PI + 0.25 * Math.sin(i * 2.1);
      const dx = Math.cos(phi), dy = Math.sin(phi);
      const droop = 0.25 + 0.5 * lg * (0.6 + 0.4 * fr);
      const flap = time ? Math.sin(time * 1.9 + phase + i * 0.7) * 0.04 : 0;
      const bz = h * fr, bx = this.sway(bz) + dx * r0, by = Y + dy * r0;
      const p1h = 0.5 * L, p1z = 0.55 * L * (1 - droop * 0.4), p2h = 0.95 * L, p2z = L * (0.35 - droop * 0.6 + flap);
      const wmax = L * 0.1, tw = (i % 2 ? 0.9 : -0.9);
      for (let k = 0; k <= segs; k++) {
        const s = k / segs, b1 = 2 * (1 - s) * s, b2 = s * s;
        const hd = b1 * p1h + b2 * p2h;
        px[k] = bx + dx * hd + amp * hd * 0.6; py[k] = by + dy * hd; pz[k] = bz + b1 * p1z + b2 * p2z;
        const w = wmax * Math.sin(Math.PI * (0.12 + 0.88 * s)) ** 0.7, t = tw * s;
        const c = Math.cos(t) * w;
        wx[k] = -dy * c; wy[k] = dx * c; wz[k] = Math.sin(t) * w;
      }
      this.ribbon(segs + 1, LEAF);
    }

    // panicule (fleur mâle) : épi central et branches qui retombent
    const fl = smooth(0.55, 0.68, grow);
    if (fl > 0) {
      const tx = this.sway(h), len = S * 0.12 * fl, rt = S * 0.005;
      this.pt(0, tx, Y, h, rt);
      this.pt(1, tx + amp * 0.5, Y, h + len, rt * 0.4);
      this.tube(2, 3, TASSEL);
      const nb = main ? (lite ? 4 : 7) : lite ? 0 : 2;
      for (let b = 0; b < nb; b++) {
        const th = phi0 + b * 2.4, cx = Math.cos(th), cy = Math.sin(th);
        const oz = h + len * (0.1 + 0.1 * b), bl = len * 0.75 * (1 - b * 0.07);
        this.pt(0, tx, Y, oz, rt * 0.8);
        this.pt(1, tx + cx * bl * 0.6, Y + cy * bl * 0.6, oz + bl * 0.4, rt * 0.6);
        this.pt(2, tx + cx * bl * 0.95 + amp, Y + cy * bl * 0.95, oz - bl * 0.12, rt * 0.3);
        this.tube(3, 3, TASSEL);
      }
    }

    // épi au flanc, à l'aisselle opposée à la feuille du même nœud
    const e = smooth(0.58, 0.74, grow);
    if (e <= 0 || (!main && lite)) return;
    const ie = Math.round(N * 0.45), fz = (h * ie) / N;
    const pe = phi0 + ie * Math.PI + Math.PI;
    const ax = Math.cos(pe) * Math.sin(0.4), ay = Math.sin(pe) * Math.sin(0.4), az = Math.cos(0.4); // axe incliné de 23°
    const ex0 = this.sway(fz) + Math.cos(pe) * r0, ey0 = Y + Math.sin(pe) * r0;
    const le = S * 0.19 * e, re = le * 0.17, ripe = smooth(0.8, 0.95, grow);
    const se = main ? (lite ? 3 : 6) : 2;
    for (let k = 0; k <= se; k++) {
      const s = k / se;
      this.pt(k, ex0 + ax * le * s, ey0 + ay * le * s, fz + az * le * s, re * Math.sin(Math.PI * (0.06 + 0.88 * s)) ** 0.8);
    }
    this.tube(se + 1, main ? (lite ? 5 : 8) : 4, ripe > 0.3 ? KERNEL : HUSK);
    if (!main) return;
    // repère autour de l'axe de l'épi
    let ux = ay, uy = -ax;
    const ul = Math.hypot(ux, uy);
    ux /= ul; uy /= ul;
    const vx = -az * uy, vy = az * ux, vz = ax * uy - ay * ux;
    // spathes : trois rubans qui enveloppent l'épi, puis s'écartent à la récolte
    const sh = lite ? 3 : 5;
    for (let m = 0; m < 3; m++) {
      const g = (m * 2 * Math.PI) / 3 + 0.4, rdx = Math.cos(g) * ux + Math.sin(g) * vx, rdy = Math.cos(g) * uy + Math.sin(g) * vy, rdz = Math.sin(g) * vz;
      const tdx = ay * rdz - az * rdy, tdy = az * rdx - ax * rdz, tdz = ax * rdy - ay * rdx;
      for (let k = 0; k <= sh; k++) {
        const s = k / sh, off = re * 1.15 * Math.sin(Math.PI * s) + ripe * 0.5 * le * s * s, w = re * 1.05 * Math.sin(Math.PI * (0.05 + 0.9 * s));
        px[k] = ex0 + ax * le * 1.05 * s + rdx * off; py[k] = ey0 + ay * le * 1.05 * s + rdy * off; pz[k] = fz + az * le * 1.05 * s + rdz * off;
        wx[k] = tdx * w; wy[k] = tdy * w; wz[k] = tdz * w;
      }
      this.ribbon(sh + 1, HUSK);
    }
    // soies : fins tubes qui sortent de la pointe et retombent
    if (e > 0.3 && ripe < 0.7) {
      const ns = lite ? 3 : 6, tipX = ex0 + ax * le * 1.02, tipY = ey0 + ay * le * 1.02, tipZ = fz + az * le * 1.02;
      for (let k = 0; k < ns; k++) {
        const g = (k / ns) * Math.PI * 2, rdx = Math.cos(g) * ux + Math.sin(g) * vx, rdy = Math.cos(g) * uy + Math.sin(g) * vy, rdz = Math.sin(g) * vz;
        this.pt(0, tipX, tipY, tipZ, S * 0.003);
        this.pt(1, tipX + ax * le * 0.15 + rdx * le * 0.08, tipY + ay * le * 0.15 + rdy * le * 0.08, tipZ + az * le * 0.15 + rdz * le * 0.08, S * 0.0025);
        this.pt(2, tipX + ax * le * 0.1 + rdx * le * 0.25 + amp * 0.3, tipY + ay * le * 0.1 + rdy * le * 0.25, tipZ + az * le * 0.1 + rdz * le * 0.25 - le * 0.1, S * 0.0015);
        this.tube(3, 3, SILK);
      }
    }
  }
}
