// Jetons du kit « Bénin Vert » (DESIGN.md, maquettes/web/kit.css), en deux modes. Seule source des couleurs, tailles, rayons et ombres :
// tailwind.config en tire les variables CSS --c-*, kit.css s'y branche, scripts/contrast.mjs les vérifie.
// Refonte « Argile et verre » (docs/REFONTE_FRONTEND.md) : crème et sauge, verre dépoli, volumes d'argile, pastel par rang.
const light = {
  bg: '#F6F3E8', // crème : fond de travail
  surface: '#FFFFFF', // cartes (kit.css les rend en verre translucide)
  text: '#16301F',
  muted: '#4B6354',
  border: '#E3E8DA',
  brand: '#1A6E43', // vert d'action (blanc dessus : 6,3:1 ; sur pastel : au moins 4,6:1)
  brandHover: '#135A37',
  brandInk: '#FFFFFF',
  warn: '#8A4B12',
  warnBg: '#FDF3E6',
  error: '#9A3A1C', // latérite foncée : alertes et erreurs
  errorBg: '#FBE5DB',
  success: '#135A37',
  successBg: '#E6F4EA',
  // Palette nommée
  canopy: '#0E2F1C', // vert profond : paysages, toasts, bandeau du prototype
  maize: '#6FA83A', // jeune maïs : barres de données
  sun: '#F3C54A', // soleil : données et focus
  laterite: '#B4532D', // alertes et « Simulé »
  rain: '#E6F0E3',
  layer: '#EEF2E6', // second neutre : en-têtes de tableau, barres d'outils
  sage: '#CFE3D3', // barre latérale
  mint: '#DDEFE3', // pastel 1
  peach: '#FBDDCD', // pastel 2
  butter: '#FBEBBF', // pastel 3
  sky: '#D8E8F6', // pastel 4
  coral: '#C84B24', // appel à l'action d'accueil
  coralInk: '#FFFFFF', // texte sur corail (4,9:1)
  teal: '#0F7C82', // seconde extrémité du dégradé d'action (blanc dessus : 5:1)
};
const dark: typeof light = {
  bg: '#0B1D17',
  surface: '#16352B',
  text: '#EAF3EC',
  muted: '#B6CABD',
  border: '#2C5444',
  brand: '#7FD3A0', // sur vert profond, l'action passe au menthe clair
  brandHover: '#9BE0B5',
  brandInk: '#0B1D17',
  warn: '#F2C46B',
  warnBg: '#33290C',
  error: '#FF9B8F',
  errorBg: '#3D1714',
  success: '#A8E6A1',
  successBg: '#163F27',
  canopy: '#0E2F1C',
  maize: '#82BC4A',
  sun: '#F3C54A',
  laterite: '#E08A63',
  rain: '#1B4034',
  layer: '#1B3B30',
  sage: '#1D3F33',
  mint: '#1D4A38',
  peach: '#4A2E26',
  butter: '#4A3F1E',
  sky: '#1F3A52',
  coral: '#E8795A',
  coralInk: '#2A120A',
  teal: '#3CB9BF',
};

export const tokens = {
  color: light,
  dark,
  fontSize: { xs: '13px', sm: '14px', base: '16px', lg: '18px', xl: '22px', '2xl': '28px' },
  radius: { sm: '10px', md: '14px', lg: '22px', xl: '30px' }, // boutons, puces et étiquettes en pilule (rounded-full)
  shadow: {
    // argile : portée douce + lumière intérieure en haut + ombre intérieure en bas
    card: '0 12px 28px -14px rgba(34,72,52,.28), inset 0 2px 0 rgba(255,255,255,.85), inset 0 -3px 8px rgba(88,128,104,.10)',
    pop: '0 30px 70px -24px rgba(16,44,30,.45), 0 0 0 1px rgba(255,255,255,.6)',
    btn: '0 10px 22px -10px rgba(19,132,138,.65), inset 0 2px 0 rgba(255,255,255,.35), inset 0 -3px 6px rgba(8,60,50,.22)',
  },
  ease: 'cubic-bezier(.16, 1, .3, 1)', // une seule courbe de mouvement
  touch: '44px',
  font: '"Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif',
  display: '"Bricolage Grotesque", "Atkinson Hyperlegible Next", "Segoe UI", sans-serif',
} as const;
