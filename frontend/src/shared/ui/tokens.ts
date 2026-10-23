// Jetons du kit « Bénin Vert » (DESIGN.md, maquettes/web/kit.css), en deux modes. Seule source des couleurs, tailles, rayons et ombres :
// tailwind.config en tire les variables CSS --c-*, kit.css s'y branche, scripts/contrast.mjs les vérifie.
// Refonte « Argile et verre » (docs/REFONTE_FRONTEND.md) : verre dépoli, volumes d'argile. Palette « Sunny Farm » (21 octobre 2026) : blanc, vert #00A563, vert profond #016648, orange #F6732F.
const light = {
  bg: '#F3F9F5', // crème : fond de travail
  surface: '#FFFFFF', // cartes (kit.css les rend en verre translucide)
  text: '#08291D',
  muted: '#41665A',
  border: '#D5E8DC',
  brand: '#016648', // vert d'action (blanc dessus : 6,3:1 ; sur pastel : au moins 4,6:1)
  brandHover: '#014E38',
  brandInk: '#FFFFFF',
  warn: '#8A4B12',
  warnBg: '#FDF3E6',
  error: '#9A3A1C', // latérite foncée : alertes et erreurs
  errorBg: '#FBE5DB',
  success: '#016648',
  successBg: '#E3F4EB',
  // Palette nommée
  canopy: '#014D38', // vert profond : paysages, toasts, bandeau du prototype
  maize: '#00A563', // jeune maïs : barres de données
  sun: '#F6732F', // soleil : données et focus
  laterite: '#B4532D', // alertes et « Simulé »
  rain: '#E3F4EB',
  layer: '#EAF5EE', // second neutre : en-têtes de tableau, barres d'outils
  sage: '#CDE8D9', // barre latérale
  mint: '#D9F2E5', // pastel 1
  peach: '#FDE3D3', // pastel 2
  butter: '#FDEBD0', // pastel 3
  sky: '#E3F1D4', // pastel 4
  coral: '#F6732F', // appel à l'action d'accueil
  coralInk: '#2B1206', // texte sur corail (4,9:1)
  teal: '#00835A', // seconde extrémité du dégradé d'action (blanc dessus : 5:1)
};
const dark: typeof light = {
  bg: '#071F18',
  surface: '#0F3A2C',
  text: '#EAF6EF',
  muted: '#B3D1C2',
  border: '#1F5440',
  brand: '#3DDC97', // sur vert profond, l'action passe au menthe clair
  brandHover: '#6BE8B2',
  brandInk: '#06261C',
  warn: '#F2C46B',
  warnBg: '#33290C',
  error: '#FF9B8F',
  errorBg: '#3D1714',
  success: '#A8E6A1',
  successBg: '#163F27',
  canopy: '#014D38',
  maize: '#00A563',
  sun: '#F6732F',
  laterite: '#E08A63',
  rain: '#154A39',
  layer: '#12392C',
  sage: '#124634',
  mint: '#17503B',
  peach: '#4D2F1E',
  butter: '#4A3A1C',
  sky: '#254B2B',
  coral: '#F78A4F',
  coralInk: '#2A120A',
  teal: '#00A563',
};

export const tokens = {
  color: light,
  dark,
  fontSize: { xs: '13px', sm: '14px', base: '16px', lg: '18px', xl: '22px', '2xl': '28px' },
  radius: { sm: '10px', md: '14px', lg: '22px', xl: '30px' }, // boutons, puces et étiquettes en pilule (rounded-full)
  shadow: {
    // argile : portée douce + lumière intérieure en haut + ombre intérieure en bas
    card: '0 12px 28px -14px rgba(1,70,50,.28), inset 0 2px 0 rgba(255,255,255,.85), inset 0 -3px 8px rgba(88,128,104,.10)',
    pop: '0 30px 70px -24px rgba(16,44,30,.45), 0 0 0 1px rgba(255,255,255,.6)',
    btn: '0 10px 22px -10px rgba(0,131,90,.65), inset 0 2px 0 rgba(255,255,255,.35), inset 0 -3px 6px rgba(8,60,50,.22)',
  },
  ease: 'cubic-bezier(.16, 1, .3, 1)', // une seule courbe de mouvement
  touch: '44px',
  font: '"Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif',
  display: '"Bricolage Grotesque", "Atkinson Hyperlegible Next", "Segoe UI", sans-serif',
} as const;
