import type { CSSProperties } from 'react';

// Illustrations de la page d'accueil : SVG en ligne, décoratifs (aria-hidden), colorés par les jetons du thème
// pour suivre le mode sombre sans second jeu d'images.
const fill = (v: string, opacity?: number): CSSProperties => ({ fill: `var(${v})`, opacity });
const line = (v: string, w: number): CSSProperties => ({ fill: 'none', stroke: `var(${v})`, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' });

const stop = (v: string, o = 1): CSSProperties => ({ stopColor: `var(${v})`, stopOpacity: o });

/** Un plant de maïs : tige, feuilles qui retombent, épi et panicule. Posé en (x, y) au sol, hauteur 60 × s. */
function Plant({ x, y, s, i, sway }: { x: number; y: number; s: number; i: number; sway: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={sway ? 'hm-sway' : undefined} style={{ '--i': i } as CSSProperties}>
        <path d="M0 0C1-20-1-40 0-58" style={line('--canopy', 3)} />
        <path d="M0-10C-8-24-26-26-36-12C-24-18-10-14 0-10z" style={fill('--leaf')} />
        <path d="M0-18C8-32 26-34 36-20C24-26 10-22 0-18z" style={fill('--maize')} />
        <path d="M0-28C-8-40-22-42-30-30C-20-34-10-30 0-28z" style={fill('--maize')} />
        <path d="M0-36C6-48 20-50 26-40C18-42 8-40 0-36z" style={fill('--leaf')} />
        <path d="M0-46C-4-56-2-62 2-68C4-60 4-52 0-46z" style={fill('--maize')} />
        <ellipse cx="5" cy="-26" rx="4" ry="9" transform="rotate(14 5 -26)" style={fill('--sun')} />
        <path d="M5-34c-5 4-6 14-2 22" style={line('--leaf', 2)} />
        <path d="M0-58l-6-8M0-58l6-9M0-58V-70" style={line('--sun', 1.6)} />
      </g>
    </g>
  );
}

// Champ en perspective : les rangs partent d'un point de fuite et les plants grossissent en se rapprochant.
const VP = { x: 262, y: 322 };
const ROWS = [-170, -40, 90, 215, 340, 470, 600, 730];
const DEPTHS = [0.1, 0.24, 0.42, 0.66, 0.96];
const PLANTS = ROWS.flatMap((bx, r) => DEPTHS.map((t, d) => {
  const jitter = ((r * 7 + d * 3) % 5 - 2) * 2.2;
  return { x: VP.x + (bx - VP.x) * t + jitter, y: VP.y + (484 - VP.y) * t, s: 0.2 + t * 0.95 + ((r + d) % 3) * 0.03, i: r + d, sway: t > 0.4, key: `${r}-${d}` };
})).filter((p) => p.x > -30 && p.x < 550).sort((a, b) => a.y - b.y);

/** Acacia : tronc tordu et houppier plat en étages. */
function Acacia({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d="M-2 0C0-14-6-24-14-32M-2-14C2-26 8-32 16-38" style={line('--laterite', 4)} />
      <ellipse cx="-14" cy="-36" rx="26" ry="9" style={fill('--leaf')} />
      <ellipse cx="16" cy="-42" rx="24" ry="8" style={fill('--maize')} />
      <ellipse cx="0" cy="-48" rx="20" ry="7" style={fill('--leaf')} />
    </g>
  );
}

/** Palmier : tronc courbe et palmes. */
function Palm({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d="M0 0C4-20 2-44 8-66" style={line('--laterite', 5)} />
      <g transform="translate(8 -66)">
        {[[-34, 6], [-26, -14], [-8, -22], [14, -22], [32, -12], [38, 8]].map(([dx, dy]) => <path key={`${dx}${dy}`} d={`M0 0C${dx * 0.3} ${dy - 10} ${dx * 0.8} ${dy - 8} ${dx} ${dy + 10}`} style={line('--canopy-2', 3.4)} />)}
        <circle r="3.6" style={fill('--sun')} cx="-2" cy="4" />
      </g>
    </g>
  );
}

/** Paysan à la houe, de dos, au milieu du champ. */
function Farmer({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d="M-5 0L-6-22M5 0L6-22" style={line('--canopy-deep', 5)} />
      <path d="M-9-22L-8-44C-8-50 8-50 8-44L9-22z" style={fill('--sun')} />
      <path d="M8-42L22-18" style={line('--laterite', 2.6)} />
      <path d="M18-18h10" style={line('--canopy-deep', 3)} />
      <circle cx="0" cy="-54" r="6" style={{ fill: '#8A5A3C' }} />
      <path d="M-13-55h26M-7-55C-6-64 6-64 7-55z" style={{ fill: '#E9C46A', stroke: '#E9C46A', strokeWidth: 2.4, strokeLinejoin: 'round' }} />
    </g>
  );
}

/** Paysage d'accueil : savane, champ de maïs en perspective et téléphone qui montre une parcelle tracée. */
export function HeroScene() {
  return (
    <svg className="hm-ill" viewBox="0 0 520 480" role="presentation" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="hm-clip"><rect width="520" height="480" rx="36" /></clipPath>
        <linearGradient id="hm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={stop('--sky')} /><stop offset="1" style={stop('--mint')} /></linearGradient>
        <radialGradient id="hm-glow"><stop offset="0" style={stop('--sun', 0.55)} /><stop offset="1" style={stop('--sun', 0)} /></radialGradient>
        <linearGradient id="hm-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={stop('--laterite', 0.8)} /><stop offset="1" style={stop('--laterite')} /></linearGradient>
        <linearGradient id="hm-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={stop('--surface', 0)} /><stop offset="1" style={stop('--surface', 0.45)} /></linearGradient>
      </defs>
      <g clipPath="url(#hm-clip)">
        <rect width="520" height="480" fill="url(#hm-sky)" />
        <circle className="hm-sun" cx="408" cy="104" r="120" fill="url(#hm-glow)" />
        <circle cx="408" cy="104" r="40" style={fill('--sun')} />
        {/* nuages : plusieurs boules qui se chevauchent */}
        <g className="hm-cloud" style={fill('--surface', 0.9)}>
          <ellipse cx="82" cy="118" rx="34" ry="11" /><circle cx="70" cy="108" r="14" /><circle cx="94" cy="104" r="17" /><circle cx="112" cy="113" r="11" />
        </g>
        <g className="hm-cloud" style={fill('--surface', 0.75)}>
          <ellipse cx="292" cy="64" rx="28" ry="9" /><circle cx="282" cy="56" r="11" /><circle cx="301" cy="53" r="14" />
        </g>
        {/* oiseaux */}
        <g className="hm-cloud" style={line('--canopy', 2)}><path d="M180 88q6-7 12 0q6-7 12 0M222 70q5-6 10 0q5-6 10 0" /></g>
        {/* chaîne lointaine, collines, brume */}
        <path d="M0 292L40 262l30 18 46-40 44 36 38-22 50 30 48-34 52 30 40-20 38 28 38-14 50 22V330H0z" style={fill('--maize', 0.28)} />
        <path d="M0 316C70 276 150 282 230 304S400 318 520 286V340H0z" style={fill('--maize', 0.55)} />
        <path d="M0 330C90 300 190 312 290 326S440 332 520 312V350H0z" style={fill('--leaf', 0.9)} />
        <rect y="296" width="520" height="40" fill="url(#hm-haze)" />
        {/* arbres et case au loin */}
        <Acacia x={64} y={330} k={0.8} />
        <Acacia x={138} y={334} k={0.5} />
        <Palm x={470} y={334} k={0.7} />
        <g transform="translate(402 336)">
          <rect x="-13" y="-16" width="26" height="16" rx="2" style={fill('--butter')} />
          <path d="M-18-14L0-34L18-14z" style={fill('--laterite')} />
          <rect x="-4" y="-11" width="8" height="11" rx="3" style={fill('--canopy-deep', 0.75)} />
        </g>
        {/* le champ */}
        <rect y="322" width="520" height="160" fill="url(#hm-soil)" />
        <path d="M0 322C100 314 200 318 300 322S440 318 520 320V332H0z" style={fill('--leaf')} />
        {ROWS.map((bx) => <path key={bx} d={`M${VP.x} ${VP.y}L${bx} 490`} style={line('--canopy-deep', 1.6)} opacity=".28" />)}
        {PLANTS.map(({ key, ...p }) => <Plant key={key} {...p} />)}
        <Farmer x={464} y={398} k={0.78} />
        {/* le téléphone, légèrement penché */}
        <g transform="translate(168 108) rotate(-3 95 160)">
          <rect x="8" y="16" width="190" height="318" rx="34" style={fill('--canopy-deep')} opacity=".28" />
          <rect width="190" height="318" rx="32" style={fill('--surface')} />
          <rect width="190" height="318" rx="32" style={line('--canopy', 6)} />
          <rect x="70" y="14" width="50" height="8" rx="4" style={fill('--canopy')} />
          <rect x="18" y="40" width="154" height="26" rx="13" style={fill('--mint')} />
          <circle cx="34" cy="53" r="6" style={fill('--leaf')} />
          <rect x="48" y="49" width="72" height="8" rx="4" style={fill('--canopy')} opacity=".55" />
          <rect x="18" y="78" width="154" height="124" rx="18" style={fill('--sage')} />
          <path className="hm-draw" pathLength={1} d="M48 112l50-18 44 26-10 50-62 6z" style={{ ...fill('--maize', 0.4), stroke: 'var(--leaf)', strokeWidth: 3, strokeLinejoin: 'round' }} />
          {[[48, 112], [98, 94], [142, 120], [132, 170], [70, 176]].map(([cx, cy], i) => <circle key={`${cx}-${cy}`} className="hm-pop" cx={cx} cy={cy} r="6" style={{ ...fill('--surface'), stroke: 'var(--sun)', strokeWidth: 3, '--i': i } as CSSProperties} />)}
          <rect x="18" y="216" width="104" height="9" rx="4.5" style={fill('--canopy')} opacity=".6" />
          <rect x="18" y="234" width="136" height="9" rx="4.5" style={fill('--canopy')} opacity=".25" />
          <rect x="18" y="252" width="82" height="9" rx="4.5" style={fill('--canopy')} opacity=".25" />
          <rect x="18" y="276" width="154" height="30" rx="15" style={fill('--leaf')} />
          <rect x="62" y="287" width="66" height="8" rx="4" style={fill('--leaf-ink')} opacity=".9" />
        </g>
        {/* herbes du premier plan */}
        <path d="M-6 484C4 450 10 440 24 428C20 450 24 468 30 484z" style={fill('--canopy')} />
        <path d="M14 484C20 456 34 446 46 440C42 458 44 472 48 484z" style={fill('--leaf')} />
        <path d="M526 484C516 452 508 444 494 432C498 452 494 470 488 484z" style={fill('--canopy')} />
      </g>
    </svg>
  );
}

const STEP_BASE = { className: 'hm-step-ill', viewBox: '0 0 160 120', role: 'presentation', 'aria-hidden': true, focusable: false } as const;

/** Étape 1 : un code arrive par SMS sur le téléphone. */
export function StepSignup() {
  return (
    <svg {...STEP_BASE}>
      <rect width="160" height="120" rx="20" style={fill('--mint')} />
      <rect x="52" y="14" width="56" height="96" rx="12" style={fill('--surface')} stroke="var(--canopy)" strokeWidth="3" />
      <rect x="62" y="28" width="36" height="8" rx="4" style={fill('--canopy')} opacity=".4" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={61 + i * 9.5} y="50" width="7" height="12" rx="2" style={fill('--leaf')} />)}
      <rect x="62" y="80" width="36" height="14" rx="7" style={fill('--leaf')} />
      <path className="hm-bubble" d="M112 30h34a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-18l-8 8v-8h-8a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z" style={fill('--sun')} transform="translate(-6 -6) scale(.96)" />
      <circle cx="122" cy="38" r="2.6" style={fill('--surface')} />
      <circle cx="131" cy="38" r="2.6" style={fill('--surface')} />
      <circle cx="140" cy="38" r="2.6" style={fill('--surface')} />
    </svg>
  );
}

/** Étape 2 : l'agent ATDA valide la fiche. */
export function StepAgent() {
  return (
    <svg {...STEP_BASE}>
      <rect width="160" height="120" rx="20" style={fill('--peach')} />
      <rect x="28" y="18" width="70" height="88" rx="10" style={fill('--surface')} stroke="var(--canopy)" strokeWidth="3" />
      <rect x="54" y="12" width="18" height="12" rx="5" style={fill('--canopy')} />
      {[40, 56, 72].map((y) => <g key={y}><circle cx="42" cy={y} r="5" style={fill('--maize')} /><path d={`M39.5 ${y}l2 2 3.5-4`} style={line('--canopy-deep', 1.8)} /><rect x="54" y={y - 3} width="32" height="6" rx="3" style={fill('--canopy')} opacity=".3" /></g>)}
      <circle cx="126" cy="46" r="13" style={fill('--canopy-2')} />
      <path d="M104 98c2-16 12-24 22-24s20 8 22 24z" style={fill('--canopy-2')} />
      <circle cx="136" cy="86" r="14" style={fill('--maize')} stroke="var(--surface)" strokeWidth="3" />
      <path d="M129.5 86l5 5 8-9.5" style={line('--canopy-deep', 3)} />
    </svg>
  );
}

/** Étape 3 : récolte, panier et pièces du marché. */
export function StepHarvest() {
  return (
    <svg {...STEP_BASE}>
      <rect width="160" height="120" rx="20" style={fill('--butter')} />
      <path d="M30 62h80l-8 40a8 8 0 0 1-8 6H46a8 8 0 0 1-8-6z" style={fill('--laterite')} />
      <path d="M44 76h52M48 92h44" style={line('--butter', 3)} />
      {[[52, 54], [70, 46], [88, 54], [61, 36], [80, 36]].map(([cx, cy]) => <ellipse key={`${cx}${cy}`} cx={cx} cy={cy} rx="9" ry="14" transform={`rotate(${cx > 70 ? 14 : -14} ${cx} ${cy})`} style={fill('--sun')} />)}
      <circle cx="126" cy="44" r="18" style={fill('--maize')} stroke="var(--canopy)" strokeWidth="3" />
      <path d="M126 33v22M120 40c0-4 12-4 12 0s-12 4-12 8 12 4 12 0" style={line('--canopy-deep', 2.6)} />
      <path d="M118 78h36M148 72l6 6-6 6" style={line('--canopy', 3)} />
    </svg>
  );
}

/** Les quatre stades de la culture : semis, croissance, floraison, récolte. */
export function StageIllustration({ stage }: { stage: 'semis' | 'croissance' | 'floraison' | 'recolte' }) {
  return (
    <svg className="hm-stage-ill" viewBox="0 0 120 120" role="presentation" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="106" rx="50" ry="9" style={fill('--laterite')} />
      {stage === 'semis' && <>
        <ellipse cx="60" cy="98" rx="9" ry="6" style={fill('--sun')} />
        <path d="M60 92c0-8 0-12 4-16" style={line('--maize', 3)} />
        <path d="M64 76c6-1 9-4 10-8-6 0-10 3-10 8z" style={fill('--maize')} />
      </>}
      {stage === 'croissance' && <>
        <path d="M60 104V54" style={line('--canopy', 4)} />
        <path d="M60 86c-14-2-24-10-28-22 14 0 25 8 28 22zM60 70c14-2 24-10 28-22-14 0-25 8-28 22z" style={fill('--maize')} />
        <path d="M60 56c-6-6-8-12-6-20 8 4 10 12 6 20z" style={fill('--leaf')} />
      </>}
      {stage === 'floraison' && <>
        <path d="M60 104V28" style={line('--canopy', 4)} />
        <path d="M60 92c-16-2-28-12-32-26 16 0 29 10 32 26zM60 74c16-2 28-12 32-26-16 0-29 10-32 26z" style={fill('--maize')} />
        <path d="M60 28l-14-12M60 28V10M60 28l14-12M60 28l-8-16M60 28l8-16" style={line('--sun', 3)} />
        <circle cx="60" cy="10" r="3.4" style={fill('--sun')} />
      </>}
      {stage === 'recolte' && <>
        <path d="M60 104V34" style={line('--canopy', 4)} />
        <path d="M60 94c-16-2-28-12-32-26 16 0 29 10 32 26z" style={fill('--maize')} />
        <ellipse cx="72" cy="62" rx="12" ry="26" transform="rotate(10 72 62)" style={fill('--sun')} />
        <path d="M66 42c6 6 12 20 14 40M76 40c-2 14-2 30 2 44" style={line('--laterite', 2)} />
        <path d="M70 90c-8 0-16-10-18-22 8 2 15 10 18 22zM76 90c8 0 14-10 14-22-8 2-12 10-14 22z" style={fill('--leaf')} />
      </>}
    </svg>
  );
}

/** Pastille d'un partenaire : sigle en lettres, en attendant les logos officiels. */
export function PartnerMark({ code }: { code: string }) {
  return <span className="hm-mark" aria-hidden="true">{code}</span>;
}
