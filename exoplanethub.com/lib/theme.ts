import themeConfig from '@/theme/theme.json';

export type ThemeName = 'nautilus' | 'cosmicDawn' | 'starlight';

export function getTheme(themeName: ThemeName = 'nautilus') {
  return themeConfig.themes[themeName];
}

export function generateCSSVariables(themeName: ThemeName) {
  const theme = getTheme(themeName);
  return {
    '--color-background': theme.colors.background,
    '--color-surface': theme.colors.surface,
    '--color-surface-alt': theme.colors.surfaceAlt,
    '--color-primary': theme.colors.primary,
    '--color-primary-contrast': theme.colors.primaryContrast,
    '--color-accent': theme.colors.accent,
    '--color-text': theme.colors.text,
    '--color-text-muted': theme.colors.textMuted,
    '--color-border': theme.colors.border,
    '--color-esi-band-1': theme.colors.esiBand1,
    '--color-esi-band-1-text': theme.colors.esiBand1Text,
    '--color-esi-band-2': theme.colors.esiBand2,
    '--color-esi-band-2-text': theme.colors.esiBand2Text,
    '--color-esi-band-3': theme.colors.esiBand3,
    '--color-esi-band-3-text': theme.colors.esiBand3Text,
    '--color-esi-band-4': theme.colors.esiBand4,
    '--color-esi-band-4-text': theme.colors.esiBand4Text,
    '--font-heading': theme.typography.fontFamily.heading,
    '--font-body': theme.typography.fontFamily.body,
  } as React.CSSProperties;
}
