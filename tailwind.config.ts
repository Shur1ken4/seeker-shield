import type { Config } from 'tailwindcss'

const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: c('bg'),
      'surface-1': c('surface-1'),
      'surface-2': c('surface-2'),
      border: c('border'),
      'text-primary': c('text-primary'),
      'text-secondary': c('text-secondary'),
      'text-muted': c('text-muted'),
      safe: c('safe'),
      critical: c('critical'),
      warning: c('warning'),
      cleanup: c('cleanup'),
      'on-safe': c('on-safe'),
    },
    fontFamily: {
      sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      brand: ['Manrope', '"IBM Plex Sans"', 'sans-serif'],
    },
    fontSize: {
      caption: ['12px', '1.4'],
      'body-sm': ['14px', '1.5'],
      body: ['16px', '1.5'],
      title: ['20px', '1.3'],
      heading: ['28px', '1.2'],
      score: ['64px', '1'],
    },
    fontWeight: { normal: '400', medium: '500', semibold: '600', extrabold: '800' },
    borderRadius: { none: '0', chip: '6px', card: '10px', sheet: '16px', full: '9999px' },
    extend: {
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
      boxShadow: { sheet: '0 -8px 32px rgb(0 0 0 / 0.28)' },
      transitionDuration: { fast: '150ms', base: '250ms' },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
} satisfies Config
