// Jetons du kit « Bénin Vert » (DESIGN.md, maquettes/web/kit.css), en deux modes. Seule source des couleurs, tailles, rayons et ombres :
// tailwind.config en tire les variables CSS --c-*, kit.css s'y branche, scripts/contrast.mjs les vérifie.
const light = {
  bg: '#F3F7EE', // fond de travail (app-bg)
  surface: '#FFFFFF',
  text: '#13261A',
  muted: '#4A5E4F',
  border: '#DCE6D3',
  brand: '#1F5A32', // feuille : l'action sur fond clair
  brandHover: '#276B3D',
  brandInk: '#FFFFFF',
  warn: '#8A4B12',
  warnBg: '#FDF6EE',
  error: '#8E3E1F', // latérite foncée : alertes et erreurs
  errorBg: '#F7E3D9',
  success: '#1F5A32',
  successBg: '#E0F0D3',
  // Palette nommée du kit
  canopy: '#0E2F1C', // barre latérale, toasts, bandeau
  maize: '#6FA83A', // jeune maïs : action sur sombre, barres de données
  sun: '#F3C54A', // soleil : données et focus uniquement
  laterite: '#B4532D', // alertes et « Simulé »
  rain: '#E8F1DF',
  layer: '#E8F1DF', // second neutre : en-têtes de tableau, barres d'outils
};
const dark: typeof light = {
  bg: '#0A2415',
  surface: '#10301F',
  text: '#EFF3E8',
  muted: '#B8C7B0',
  border: '#2E5A40',
  brand: '#82BC4A', // sur canopée, l'action passe au jeune maïs (DESIGN.md : maïs sur canopée)
  brandHover: '#9BCB62',
  brandInk: '#0A2415',
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
  rain: '#163F27',
  layer: '#163824',
};

export const tokens = {
  color: light,
  dark,
  fontSize: { xs: '13px', sm: '14px', base: '16px', lg: '18px', xl: '22px', '2xl': '28px' },
  radius: { sm: '6px', md: '10px', lg: '14px', xl: '18px' }, // boutons, puces et étiquettes en pilule (rounded-full)
  shadow: {
    card: '0 1px 0 rgba(14,47,28,.05), 0 10px 24px -20px rgba(14,47,28,.45)',
    pop: '0 24px 60px -20px rgba(6,22,12,.45), 0 0 0 1px rgba(14,47,28,.08)',
    btn: '0 8px 20px -14px rgba(31,90,50,.9)',
  },
  ease: 'cubic-bezier(.16, 1, .3, 1)', // une seule courbe de mouvement
  touch: '44px',
  font: '"Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif',
  display: '"Bricolage Grotesque", "Atkinson Hyperlegible Next", "Segoe UI", sans-serif',
} as const;
