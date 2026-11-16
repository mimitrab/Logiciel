/** Toutes les couleurs passent par les jetons CSS de src/styles.css (thèmes clair et sombre). */
const v = (n) => `var(--${n})`;
const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  bg: v('bg'),
  surface: { DEFAULT: v('surface'), 2: v('surface-2') },
  line: { DEFAULT: v('line'), strong: v('line-strong') },
  ink: { DEFAULT: v('ink'), 2: v('ink-2'), 3: v('ink-3') },
  accent: { DEFAULT: v('accent'), strong: v('accent-strong'), soft: v('accent-soft') },
  'on-accent': v('on-accent'),
  nav: { DEFAULT: v('nav'), 2: v('nav-2'), ink: v('nav-ink'), 'ink-2': v('nav-ink-2') },
  ok: { DEFAULT: v('ok'), soft: v('ok-soft') },
  warn: { DEFAULT: v('warn'), soft: v('warn-soft') },
  danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
  info: { DEFAULT: v('info'), soft: v('info-soft') },
  paper: { DEFAULT: v('paper'), ink: v('paper-ink'), 'ink-2': v('paper-ink-2'), line: v('paper-line'), accent: v('paper-accent') },
};

export default {
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    colors,
    borderColor: { ...colors, DEFAULT: v('line') },
    fontFamily: { sans: [v('font-ui')], display: [v('font-display')], mono: [v('font-mono')] },
    boxShadow: { none: 'none', sm: v('shadow-sm'), md: v('shadow-md'), lg: v('shadow-lg') },
  },
};
