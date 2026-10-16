import type { Config } from 'tailwindcss';
import { tokens } from './src/shared/ui/tokens';

const t = tokens;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: t.color.bg,
      surface: t.color.surface,
      text: t.color.text,
      muted: t.color.muted,
      border: t.color.border,
      brand: { DEFAULT: t.color.brand, hover: t.color.brandHover },
      warn: { DEFAULT: t.color.warn, bg: t.color.warnBg },
      error: { DEFAULT: t.color.error, bg: t.color.errorBg },
      success: { DEFAULT: t.color.success, bg: t.color.successBg },
    },
    fontSize: {
      sm: [t.fontSize.sm, '20px'],
      base: [t.fontSize.base, '24px'],
      lg: [t.fontSize.lg, '26px'],
      xl: [t.fontSize.xl, '28px'],
      '2xl': [t.fontSize['2xl'], '34px'],
    },
    fontFamily: { sans: [t.font] },
    borderRadius: { none: '0', DEFAULT: t.radius, full: '9999px' },
    boxShadow: { none: 'none', DEFAULT: t.shadow },
    extend: { minHeight: { touch: t.touch }, minWidth: { touch: t.touch } },
  },
  plugins: [],
} satisfies Config;
