/**
 * Canvas-rendered surfaces (Chart.js) cannot read CSS custom properties, so the
 * handful of theme colours they need are mirrored here. Keep in sync with the
 * tokens in `src/index.css`.
 */
export const THEME = {
  textPrimary: '#E3F5F1',
  textMuted: '#7FA5A1',
  chartGrid: 'rgba(127, 165, 161, 0.13)',
  tooltipBg: 'rgba(4, 16, 15, 0.96)',
  tooltipBorder: 'rgba(94, 234, 212, 0.28)',
  cursorLine: 'rgba(94, 234, 212, 0.55)',
} as const;
