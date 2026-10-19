import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { tokens } from './src/shared/ui/tokens';

const t = tokens;
type Key = keyof typeof t.color;
// Couleurs en canaux RGB dans des variables : les classes existantes (bg-surface, text-brand/40…) basculent avec data-theme.
const c = (k: Key) => `rgb(var(--c-${k}) / <alpha-value>)`;
const vars = (p: Record<Key, string>) =>
  Object.fromEntries(Object.entries(p).map(([k, h]) => [`--c-${k}`, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ')]));

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: c('bg'),
      surface: c('surface'),
      text: c('text'),
      muted: c('muted'),
      border: c('border'),
      brand: { DEFAULT: c('brand'), hover: c('brandHover'), ink: c('brandInk') },
      warn: { DEFAULT: c('warn'), bg: c('warnBg') },
      error: { DEFAULT: c('error'), bg: c('errorBg') },
      success: { DEFAULT: c('success'), bg: c('successBg') },
      canopy: c('canopy'),
      maize: c('maize'),
      sun: c('sun'),
      laterite: c('laterite'),
      rain: c('rain'),
      layer: c('layer'),
    },
    fontSize: {
      xs: [t.fontSize.xs, '18px'],
      sm: [t.fontSize.sm, '20px'],
      base: [t.fontSize.base, '24px'],
      lg: [t.fontSize.lg, '26px'],
      xl: [t.fontSize.xl, '28px'],
      '2xl': [t.fontSize['2xl'], '34px'],
    },
    fontFamily: { sans: [t.font], display: [t.display] },
    // DEFAULT = carte (14 px) ; md pour champs et contrôles, xl pour modales et tiroir.
    borderRadius: { none: '0', ...t.radius, DEFAULT: t.radius.lg, full: '9999px' },
    boxShadow: { none: 'none', DEFAULT: t.shadow.card, ...t.shadow },
    extend: {
      minHeight: { touch: t.touch },
      minWidth: { touch: t.touch },
      transitionTimingFunction: { DEFAULT: t.ease },
      transitionDuration: { DEFAULT: '200ms' },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      const dark = { ...vars(t.dark), colorScheme: 'dark' };
      // Sans choix enregistré (ou avant le JS), le mode suit le système ; data-theme posé par useTheme l'emporte.
      addBase({
        ":root, [data-theme='light']": { ...vars(t.color), colorScheme: 'light' },
        "[data-theme='dark']": dark,
        '@media (prefers-color-scheme: dark)': { ":root:not([data-theme='light'])": dark },
      });
    }),
  ],
} satisfies Config;
