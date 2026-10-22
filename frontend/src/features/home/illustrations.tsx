import type { CSSProperties } from 'react';

// Illustrations de la page d'accueil : SVG en ligne, décoratifs (aria-hidden), colorés par les jetons du thème
// pour suivre le mode sombre sans second jeu d'images.
const fill = (v: string, opacity?: number): CSSProperties => ({ fill: `var(${v})`, opacity });
const line = (v: string, w: number): CSSProperties => ({ fill: 'none', stroke: `var(${v})`, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' });

/** Un pied de maïs : tige, quatre feuilles, épi. Posé en (x, y) au sol, hauteur h. */
function Maize({ x, y, h, i }: { x: number; y: number; h: number; i: number }) {
  const s = h / 60;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}><g className="hm-sway" style={{ "--i": i } as CSSProperties}>
      <path d="M0 0V-58" style={line('--canopy', 3)} />
      <path d="M0-14C-12-18-20-26-24-38M0-24C12-28 20-36 24-46M0-36C-10-40-16-46-18-54M0-44C8-48 14-52 16-58" style={line('--maize', 3)} />
      <ellipse cx="4" cy="-30" rx="3.5" ry="8" style={fill('--sun')} />
    </g></g>
  );
}

/** Paysage d'accueil : soleil, collines, champ de maïs et téléphone qui montre une parcelle tracée. */
export function HeroScene() {
  return (
    <svg className="hm-ill" viewBox="0 0 520 480" role="presentation" aria-hidden="true" focusable="false">
      <rect width="520" height="480" rx="36" style={fill('--sky')} />
      <circle className="hm-sun" cx="408" cy="104" r="74" style={fill('--sun', 0.18)} />
      <circle cx="408" cy="104" r="46" style={fill('--sun')} />
      <path className="hm-cloud" d="M62 120c0-12 10-20 22-20 4-10 20-12 28-2 14-2 22 8 20 22z" style={fill('--surface', 0.85)} />
      <path className="hm-cloud" d="M262 70c0-9 8-15 17-15 3-8 15-9 21-1 11-1 17 6 15 16z" style={fill('--surface', 0.7)} />
      <path d="M0 270C80 210 150 214 230 250S400 280 520 220V480H0z" style={fill('--maize', 0.5)} />
      <path d="M0 316C100 262 190 276 270 308S430 330 520 280V480H0z" style={fill('--leaf')} />
      <path d="M0 372C120 330 230 346 330 372S470 384 520 356V480H0z" style={fill('--canopy-2')} />
      <path d="M0 420C140 392 300 404 520 400V480H0z" style={fill('--laterite')} />
      {[34, 82, 130, 396, 444, 492].map((x, i) => <Maize key={x} i={i} x={x} y={404 + (i % 2) * 14} h={54 + (i % 3) * 6} />)}
      {/* le téléphone */}
      <g transform="translate(168 108)">
        <rect x="6" y="14" width="190" height="318" rx="34" style={fill('--canopy-deep')} opacity=".18" />
        <rect width="190" height="318" rx="32" style={fill('--surface')} />
        <rect width="190" height="318" rx="32" style={line('--canopy', 6)} />
        <rect x="70" y="14" width="50" height="8" rx="4" style={fill('--canopy')} />
        <rect x="18" y="40" width="154" height="26" rx="13" style={fill('--mint')} />
        <circle cx="34" cy="53" r="6" style={fill('--leaf')} />
        <rect x="48" y="49" width="72" height="8" rx="4" style={fill('--canopy')} opacity=".55" />
        <rect x="18" y="78" width="154" height="124" rx="18" style={fill('--sage')} />
        <path className="hm-draw" pathLength={1} d="M48 112l50-18 44 26-10 50-62 6z" style={{ ...fill('--maize', 0.4), stroke: 'var(--leaf)', strokeWidth: 3, strokeLinejoin: 'round' }} />
        {[[48, 112], [98, 94], [142, 120], [132, 170], [70, 176]].map(([cx, cy], i) => <circle key={`${cx}-${cy}`} className="hm-pop" cx={cx} cy={cy} r="6" style={{ ...fill('--surface'), stroke: 'var(--sun)', strokeWidth: 3, "--i": i } as CSSProperties} />)}
        <rect x="18" y="216" width="104" height="9" rx="4.5" style={fill('--canopy')} opacity=".6" />
        <rect x="18" y="234" width="136" height="9" rx="4.5" style={fill('--canopy')} opacity=".25" />
        <rect x="18" y="252" width="82" height="9" rx="4.5" style={fill('--canopy')} opacity=".25" />
        <rect x="18" y="276" width="154" height="30" rx="15" style={fill('--leaf')} />
        <rect x="62" y="287" width="66" height="8" rx="4" style={fill('--leaf-ink')} opacity=".9" />
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
