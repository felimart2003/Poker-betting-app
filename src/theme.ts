export const COLORS = {
  // Primary
  background: '#0d1117',
  surface: '#161b22',
  surfaceLight: '#21262d',
  surfaceHighlight: '#30363d',

  // Accent
  primary: '#e6b800',
  primaryDark: '#b38f00',
  primaryLight: '#ffd633',

  // Poker greens
  felt: '#1a5c2e',
  feltLight: '#237a3c',
  feltDark: '#0f3d1d',

  // Status
  danger: '#f85149',
  dangerDark: '#b3261e',
  success: '#3fb950',
  warning: '#d29922',
  info: '#58a6ff',

  // Text
  text: '#f0f6fc',
  textSecondary: '#8b949e',
  textMuted: '#484f58',

  // Player colors
  playerColors: [
    '#58a6ff', // blue
    '#f85149', // red
    '#3fb950', // green
    '#d29922', // yellow
    '#bc8cff', // purple
    '#f78166', // orange
    '#79c0ff', // light blue
    '#ffa657', // amber
  ],
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  display: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
