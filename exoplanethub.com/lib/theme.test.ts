import { describe, expect, it } from 'vitest';
import themeConfig from '@/theme/theme.json';
import { generateCSSVariables, getTheme, type ThemeName } from '@/lib/theme';

const THEME_NAMES: ThemeName[] = ['nautilus', 'cosmicDawn', 'starlight'];

describe('getTheme', () => {
  it('defaults to the theme theme.json declares as default', () => {
    expect(themeConfig.defaultTheme).toBe('nautilus');
    expect(getTheme()).toBe(getTheme('nautilus'));
  });

  it('exposes every theme named in the ThemeName union', () => {
    expect(Object.keys(themeConfig.themes).sort()).toEqual([...THEME_NAMES].sort());
  });

  it('gives each theme a distinct background', () => {
    const backgrounds = THEME_NAMES.map((name) => getTheme(name).colors.background);
    expect(new Set(backgrounds).size).toBe(THEME_NAMES.length);
  });
});

describe('generateCSSVariables', () => {
  it.each(THEME_NAMES)('maps %s onto the documented custom properties', (name) => {
    const { colors, typography } = getTheme(name);

    expect(generateCSSVariables(name)).toEqual({
      '--color-background': colors.background,
      '--color-surface': colors.surface,
      '--color-surface-alt': colors.surfaceAlt,
      '--color-primary': colors.primary,
      '--color-primary-contrast': colors.primaryContrast,
      '--color-accent': colors.accent,
      '--color-text': colors.text,
      '--color-text-muted': colors.textMuted,
      '--color-border': colors.border,
      '--font-heading': typography.fontFamily.heading,
      '--font-body': typography.fontFamily.body,
    });
  });

  it('emits only custom properties, so the object is safe to spread into style', () => {
    const variables = generateCSSVariables('nautilus');

    expect(Object.keys(variables).length).toBeGreaterThan(0);
    expect(Object.keys(variables).every((key) => key.startsWith('--'))).toBe(true);
    expect(Object.values(variables).every((value) => typeof value === 'string')).toBe(true);
  });
});
