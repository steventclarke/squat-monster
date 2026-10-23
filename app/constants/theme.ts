// MGS-inspired tactical HUD theme (original assets/design only)
export const Colors = {
  background: '#0a0a0a',
  surface: '#101010',
  panel: '#151515',
  border: '#2a2a2a',
  borderAccent: '#4a4a4a',
  textPrimary: '#e6e6e6',
  textSecondary: '#b9b9b9',
  textTertiary: '#8a8a8a',
  accent: '#9fbf3b', // phosphor-green accent
  accentWarn: '#d9b54c',
  accentAlert: '#d94c4c',
  grid: '#1f1f1f',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Radius = {
  sm: 4,
  md: 6,
  lg: 8,
};

export const Typography = {
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 1.2 },
  subtitle: { fontSize: 18, fontWeight: '600' as const, letterSpacing: 1.0 },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 1.0, textTransform: 'uppercase' as const },
};
