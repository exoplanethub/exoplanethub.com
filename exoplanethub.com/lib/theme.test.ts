import { describe, expect, it } from 'vitest';
import themeConfig from '@/theme/theme.json';
import { generateCSSVariables, getTheme, SITE_THEME, type ThemeName } from '@/lib/theme';

const THEME_NAMES: ThemeName[] = ['nautilus', 'cosmicDawn', 'starlight'];
const BAND_NUMBERS = [1, 2, 3, 4] as const;

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => channelLuminance(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('getTheme', () => {
  it('defaults to the theme theme.json declares as default', () => {
    expect(SITE_THEME).toBe(themeConfig.defaultTheme);
    expect(getTheme()).toBe(getTheme(SITE_THEME));
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
      '--color-esi-band-1': colors.esiBand1,
      '--color-esi-band-1-text': colors.esiBand1Text,
      '--color-esi-band-2': colors.esiBand2,
      '--color-esi-band-2-text': colors.esiBand2Text,
      '--color-esi-band-3': colors.esiBand3,
      '--color-esi-band-3-text': colors.esiBand3Text,
      '--color-esi-band-4': colors.esiBand4,
      '--color-esi-band-4-text': colors.esiBand4Text,
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

describe('ESI band tokens', () => {
  it.each(THEME_NAMES)('%s reads its band label against the band fill at 4.5:1 or better', (name) => {
    const { colors } = getTheme(name);

    for (const band of BAND_NUMBERS) {
      const fill = colors[`esiBand${band}` as const];
      const ink = colors[`esiBand${band}Text` as const];
      expect(contrastRatio(ink, fill), `${name} band ${band}: ${ink} on ${fill}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(THEME_NAMES)('%s keeps every band fill distinct', (name) => {
    const { colors } = getTheme(name);
    const fills = BAND_NUMBERS.map((band) => colors[`esiBand${band}` as const]);

    expect(new Set(fills).size).toBe(BAND_NUMBERS.length);
  });

  it.each(THEME_NAMES)('%s steps band fills monotonically in luminance, so the scale reads as ordered', (name) => {
    const { colors } = getTheme(name);
    const luminances = BAND_NUMBERS.map((band) => relativeLuminance(colors[`esiBand${band}` as const]));
    const descending = luminances.every((value, i) => i === 0 || value < luminances[i - 1]);
    const ascending = luminances.every((value, i) => i === 0 || value > luminances[i - 1]);

    expect(descending || ascending, `${name} luminances: ${luminances.map((l) => l.toFixed(3)).join(', ')}`).toBe(true);
  });
});
