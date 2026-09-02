import { describe, expect, it } from 'vitest';
import { ESI_BANDS, getESIBand } from '@/components/explore/esiBands';
import { generateCSSVariables } from '@/lib/theme';

describe('ESI_BANDS', () => {
  it('describes the four bands the explainer documents', () => {
    expect(ESI_BANDS.map((band) => band.range)).toEqual(['85–100', '70–84', '50–69', 'Below 50']);
  });

  it('orders bands from most to least Earth-like with no gaps between them', () => {
    const boundaries = ESI_BANDS.map((band) => band.minScore);

    expect(boundaries).toEqual([...boundaries].sort((a, b) => b - a));
    expect(boundaries[boundaries.length - 1]).toBe(0);
    expect(ESI_BANDS.map((band) => band.tier)).toEqual([1, 2, 3, 4]);
  });

  it('styles every band with custom properties the theme actually defines', () => {
    const declared = new Set(Object.keys(generateCSSVariables('nautilus')));

    for (const band of ESI_BANDS) {
      for (const value of [band.style.background, band.style.color]) {
        const token = value.replace(/^var\(|\)$/g, '');
        expect(declared, `${band.label} references ${token}`).toContain(token);
      }
    }
  });
});

describe('getESIBand', () => {
  it.each([
    [100, 'Highly Earth-like'],
    [85, 'Highly Earth-like'],
    [84, 'Good similarity'],
    [70, 'Good similarity'],
    [69, 'Moderate similarity'],
    [50, 'Moderate similarity'],
    [49, 'Low similarity'],
    [0, 'Low similarity'],
  ])('places a score of %i in the %s band', (score, label) => {
    expect(getESIBand(score).label).toBe(label);
  });

  it('keeps scores below the scale in the lowest band rather than returning nothing', () => {
    expect(getESIBand(-1)).toBe(ESI_BANDS[ESI_BANDS.length - 1]);
  });
});
