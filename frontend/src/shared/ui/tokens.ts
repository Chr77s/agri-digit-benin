// Jetons de la section 12 du MASTER_PROMPT, en deux modes (palette de la landing). Seule source des couleurs, tailles, rayons et ombres :
// tailwind.config en tire les variables CSS, scripts/contrast.mjs les vérifie.
const light = {
  bg: '#F2F5EE',
  surface: '#FFFFFF',
  text: '#10261A',
  muted: '#3F5546',
  border: '#D3DCCB',
  brand: '#1F5B3A',
  brandHover: '#17472D',
  brandInk: '#FFFFFF',
  warn: '#8A5A00',
  warnBg: '#FFF3D6',
  error: '#B3261E',
  errorBg: '#FDECEA',
  success: '#1F5B3A',
  successBg: '#E6F2EA',
};
const dark: typeof light = {
  bg: '#0A2417',
  surface: '#10301F',
  text: '#EFEBD8',
  muted: '#B8C7B0',
  border: '#2E5A40',
  brand: '#C6F432',
  brandHover: '#D7FA6E',
  brandInk: '#0A2417',
  warn: '#F2C46B',
  warnBg: '#33290C',
  error: '#FF9B8F',
  errorBg: '#3D1714',
  success: '#A8E6A1',
  successBg: '#163F27',
};

export const tokens = {
  color: light,
  dark,
  fontSize: { sm: '14px', base: '16px', lg: '18px', xl: '22px', '2xl': '28px' },
  radius: '12px', // cartes, champs, encarts ; les boutons sont en pastille (rounded-full)
  shadow: '0 2px 8px rgba(16, 38, 26, 0.12)',
  touch: '44px',
  font: '"Source Sans 3", system-ui, sans-serif',
} as const;
