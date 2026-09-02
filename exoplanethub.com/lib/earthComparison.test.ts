import { describe, expect, it } from 'vitest';
import { earthComparisons } from '@/lib/earthComparison';
import type { Planet } from '@/lib/mockPlanets';

const UNMEASURED: Planet = {
  pl_name: 'Kepler-452 b',
  hostname: null,
  sy_snum: null,
  sy_pnum: null,
  sy_dist: null,
  discoverymethod: null,
  disc_year: null,
  disc_facility: null,
  pl_orbper: null,
  pl_orbsmax: null,
  pl_rade: null,
  pl_bmasse: null,
  pl_dens: null,
  pl_eqt: null,
  pl_insol: null,
  st_teff: null,
  st_rad: null,
  st_mass: null,
  st_logg: null,
  st_age: null,
  last_updated: '2026-08-30T06:00:00Z',
};

function comparisonsOf(planet: Partial<Planet>) {
  return earthComparisons({ ...UNMEASURED, ...planet });
}

function detailOf(aspect: string, planet: Partial<Planet>): string | undefined {
  return comparisonsOf(planet).find((comparison) => comparison.aspect === aspect)?.detail;
}

describe('earthComparisons selection', () => {
  it('offers nothing at all for a planet with no measured fields', () => {
    expect(comparisonsOf({})).toEqual([]);
  });

  it('keeps a measured aspect and drops the unmeasured ones rather than half-writing them', () => {
    expect(comparisonsOf({ pl_rade: 1.63 })).toEqual([
      { aspect: 'Size', detail: "About 1.6 times Earth's width." },
    ]);
  });

  it('orders the aspects from the planet itself outwards to its orbit', () => {
    const planet = { pl_rade: 1.63, pl_bmasse: 5, pl_eqt: 265, pl_insol: 1.1, pl_orbper: 384.8 };

    expect(comparisonsOf(planet).map((comparison) => comparison.aspect)).toEqual([
      'Size',
      'Mass',
      'Temperature',
      'Starlight',
      'Year',
    ]);
  });

  it.each([
    ['pl_rade', 'Size'],
    ['pl_bmasse', 'Mass'],
    ['pl_eqt', 'Temperature'],
    ['pl_insol', 'Starlight'],
    ['pl_orbper', 'Year'],
  ])('drops %s when it is null', (field, aspect) => {
    expect(detailOf(aspect, { [field]: null })).toBeUndefined();
  });

  // A ratio, a kelvin and a period are all positive; anything else is a corrupt row, not a fact.
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'treats the stored value %s as unmeasured rather than comparing it',
    (corrupt) => {
      const planet = {
        pl_rade: corrupt,
        pl_bmasse: corrupt,
        pl_eqt: corrupt,
        pl_insol: corrupt,
        pl_orbper: corrupt,
      };

      expect(comparisonsOf(planet)).toEqual([]);
    }
  );
});

describe('proportions of Earth', () => {
  it.each([
    [1.63, "About 1.6 times Earth's width."],
    [11.2, "About 11 times Earth's width."],
    [0.85, "About 85% of Earth's width."],
  ])('states a radius of %s in the register people use', (pl_rade, detail) => {
    expect(detailOf('Size', { pl_rade })).toBe(detail);
  });

  it('says almost exactly rather than "1 times" when a planet matches Earth', () => {
    expect(detailOf('Size', { pl_rade: 1.02 })).toBe("Almost exactly Earth's width.");
  });

  it('never rounds a proportion up to a flat 100% of Earth', () => {
    expect(detailOf('Mass', { pl_bmasse: 0.9951 })).toBe("Almost exactly Earth's mass.");
  });

  it('measures mass against Earth too', () => {
    expect(detailOf('Mass', { pl_bmasse: 5 })).toBe("About 5 times Earth's mass.");
  });

  it('frames starlight as what Earth gets from the Sun, not as a bare number', () => {
    expect(detailOf('Starlight', { pl_insol: 1.1 })).toBe(
      'About 1.1 times the starlight Earth gets from the Sun.'
    );
  });

  it('keeps a scorched planet on the number the archive holds', () => {
    expect(detailOf('Starlight', { pl_insol: 3247 })).toBe(
      'About 3,247 times the starlight Earth gets from the Sun.'
    );
  });

  it('keeps a faintly lit planet legible instead of collapsing it to 0%', () => {
    expect(detailOf('Starlight', { pl_insol: 0.0004 })).toBe(
      'About 0.04% of the starlight Earth gets from the Sun.'
    );
  });
});

describe('temperature', () => {
  it('converts to everyday units and names the basis of the comparison', () => {
    expect(detailOf('Temperature', { pl_eqt: 265 })).toBe(
      'About -8 °C (17 °F) from starlight alone, against -18 °C (-1 °F) for Earth measured the same way.'
    );
  });

  it('reads a planet just below freezing as 0 °C, never as -0 °C', () => {
    expect(detailOf('Temperature', { pl_eqt: 273.1 })).toContain('About 0 °C');
  });

  it('groups the digits of a scorching planet', () => {
    expect(detailOf('Temperature', { pl_eqt: 2000 })).toContain('About 1,727 °C');
  });
});

describe('year length', () => {
  it('counts a short orbit in Earth days', () => {
    expect(detailOf('Year', { pl_orbper: 11.186 })).toBe('A year here lasts about 11 Earth days.');
  });

  it('counts an orbit shorter than a day in hours', () => {
    expect(detailOf('Year', { pl_orbper: 0.75 })).toBe('A year here lasts about 18 hours.');
  });

  it('keeps a day count the archive holds instead of rounding 267 up to 270', () => {
    expect(detailOf('Year', { pl_orbper: 267.29 })).toBe('A year here lasts about 267 Earth days.');
  });

  it('keeps an orbit just under an Earth year shorter than one', () => {
    expect(detailOf('Year', { pl_orbper: 365 })).toBe('A year here lasts about 365 Earth days.');
  });

  it('counts a long orbit in Earth years rather than hundreds of days', () => {
    expect(detailOf('Year', { pl_orbper: 4332.6 })).toBe('A year here lasts about 12 Earth years.');
  });

  it.each([
    [1, 'A year here lasts about 1 Earth day.'],
    [365.25, 'A year here lasts about 1 Earth year.'],
  ])('says "%s day" in the singular where the count is one', (pl_orbper, detail) => {
    expect(detailOf('Year', { pl_orbper })).toBe(detail);
  });
});
