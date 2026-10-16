// Jetons de la section 12 du MASTER_PROMPT. Seule source des couleurs, tailles, rayons et ombres.
export const tokens = {
  color: {
    bg: '#F7F5F0',
    surface: '#FFFFFF',
    text: '#1B1F1A',
    muted: '#4A5148',
    border: '#D9D6CC',
    brand: '#1F5B3A',
    brandHover: '#17472D',
    warn: '#8A5A00',
    warnBg: '#FFF3D6',
    error: '#B3261E',
    errorBg: '#FDECEA',
    success: '#1F5B3A',
    successBg: '#E6F2EA',
  },
  fontSize: { sm: '14px', base: '16px', lg: '18px', xl: '22px', '2xl': '28px' },
  radius: '6px',
  shadow: '0 2px 8px rgba(27, 31, 26, 0.12)',
  touch: '44px',
  font: '"Source Sans 3", system-ui, sans-serif',
} as const;
