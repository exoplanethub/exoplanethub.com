import { describe, expect, it } from 'vitest';
import type { Planet } from '@/lib/mockPlanets';
import { planetHighlights, planetStatSections, type PlanetStat } from '@/lib/planetStats';

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

function statsOf(planet: Partial<Planet>): PlanetStat[] {
  return planetStatSections({ ...UNMEASURED, ...planet }).flatMap((section) => section.stats);
}

function valueOf(label: string, planet: Partial<Planet>): string | null {
  const stat = statsOf(planet).find((candidate) => candidate.label === label);
  if (!stat) throw new Error(`No stat labelled "${label}"`);
  return stat.value;
}

describe('planetStatSections structure', () => {
  it('groups the archive fields into Planet, Star, System and Discovery, in that order', () => {
    expect(planetStatSections(UNMEASURED).map((section) => section.title)).toEqual([
      'Planet',
      'Star',
      'System',
      'Discovery',
    ]);
  });

  it('gives every section an id distinct enough to key a heading', () => {
    const ids = planetStatSections(UNMEASURED).map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels every stat uniquely within its own section', () => {
    for (const section of planetStatSections(UNMEASURED)) {
      const labels = section.stats.map((stat) => stat.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  // Surface gravity in log-cgs means nothing to a lay reader; the spec cuts it deliberately.
  it('leaves surface gravity out even when the archive has it', () => {
    const values = statsOf({ st_logg: 4.32 }).map((stat) => stat.value);

    expect(values.some((value) => value?.includes('4.32'))).toBe(false);
  });
});

describe('planetStatSections values', () => {
  it.each([
    ['Radius', { pl_rade: 1.63 }, '1.63 × Earth'],
    ['Mass', { pl_bmasse: 5 }, '5 × Earth'],
    ['Density', { pl_dens: 5.51 }, '5.51 g/cm³'],
    ['Equilibrium temperature', { pl_eqt: 265 }, '265 K'],
    ['Starlight received', { pl_insol: 1.1 }, '1.1 × Earth'],
    ['Orbital period', { pl_orbper: 384.843 }, '384.8 days'],
    ['Average distance from its star', { pl_orbsmax: 1.046 }, '1.046 AU'],
    ['Surface temperature', { st_teff: 5757 }, '5,757 K'],
    ['Age', { st_age: 6 }, '6 billion years'],
  ])('renders %s with its unit', (label, planet, expected) => {
    expect(valueOf(label, planet)).toBe(expected);
  });

  it('names the host star as the archive spells it', () => {
    expect(valueOf('Host star', { hostname: 'Kepler-452' })).toBe('Kepler-452');
  });

  it('reads the spectral class off the star temperature rather than storing one', () => {
    expect(valueOf('Spectral class', { st_teff: 5757 })).toBe('G — sun-like');
  });

  // Parsecs are the archive's unit and light-years are the reader's; the page owes both.
  it('gives distance in light-years first and parsecs alongside', () => {
    expect(valueOf('Distance from Earth', { sy_dist: 551.7 })).toBe(
      '1,799 light-years (551.7 parsecs)'
    );
  });

  it.each([
    ['Year', { disc_year: 2015 }, '2015'],
    ['Stars in system', { sy_snum: 1 }, '1'],
    ['Known planets', { sy_pnum: 5 }, '5'],
  ])('prints %s exactly, without grouping separators', (label, planet, expected) => {
    expect(valueOf(label, planet)).toBe(expected);
  });

  it('keeps short-period orbits legible instead of rounding them to zero', () => {
    expect(valueOf('Orbital period', { pl_orbper: 0.0007365474 })).toBe('0.0007365 days');
  });
});

describe('planetStatSections unknowns', () => {
  it('reports every field of a name-only planet as unknown, dropping none of them', () => {
    const stats = statsOf({});

    expect(stats).toHaveLength(19);
    expect(stats.every((stat) => stat.value === null)).toBe(true);
  });

  it.each([
    ['a blank host name', { hostname: '  ' }, 'Host star'],
    ['a blank discovery method', { discoverymethod: '' }, 'Method'],
  ])('treats %s as unknown rather than an empty row', (_case, planet, label) => {
    expect(valueOf(label, planet)).toBeNull();
  });

  // A corrupt row must not reach the page as "NaN K".
  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('reports %s as unknown rather than formatting it', (_case, corrupt) => {
    expect(valueOf('Equilibrium temperature', { pl_eqt: corrupt })).toBeNull();
    expect(valueOf('Distance from Earth', { sy_dist: corrupt })).toBeNull();
    expect(valueOf('Year', { disc_year: corrupt })).toBeNull();
  });

  it('leaves the spectral class unknown for a star too cool to classify', () => {
    expect(valueOf('Spectral class', { st_teff: 1200 })).toBeNull();
  });

  it('keeps a measured zero rather than reading it as missing', () => {
    expect(valueOf('Starlight received', { pl_insol: 0 })).toBe('0 × Earth');
  });
});

describe('planetHighlights', () => {
  function highlightsOf(planet: Partial<Planet>): string[] {
    return planetHighlights({ ...UNMEASURED, ...planet });
  }

  it('leads with size, orbit and distance, in that order', () => {
    expect(highlightsOf({ pl_rade: 1.63, pl_orbper: 384.843, sy_dist: 551.7 })).toEqual([
      "1.63\u00d7 Earth's radius",
      '384.8-day orbit',
      '1,799 light-years away',
    ]);
  });

  // A preview that rounded differently would contradict the stat table on the page it links to.
  it.each([
    ['Radius', { pl_rade: 1.63 }, '1.63 \u00d7 Earth', "1.63\u00d7 Earth's radius"],
    ['Orbital period', { pl_orbper: 384.843 }, '384.8 days', '384.8-day orbit'],
  ])('rounds %s to the figure the section already shows', (label, planet, sectionValue, phrase) => {
    expect(valueOf(label, planet)).toBe(sectionValue);
    expect(highlightsOf(planet)).toEqual([phrase]);
  });

  it('converts distance to the same light-years the System section shows', () => {
    expect(valueOf('Distance from Earth', { sy_dist: 551.7 })).toBe(
      '1,799 light-years (551.7 parsecs)'
    );
    expect(highlightsOf({ sy_dist: 551.7 })).toEqual(['1,799 light-years away']);
  });

  it('drops the fields the archive never measured instead of naming them', () => {
    expect(highlightsOf({ pl_orbper: 384.843 })).toEqual(['384.8-day orbit']);
  });

  it('returns nothing at all for a planet the archive only names', () => {
    expect(highlightsOf({})).toEqual([]);
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('skips a %s radius rather than quoting it', (_case, corrupt) => {
    expect(highlightsOf({ pl_rade: corrupt })).toEqual([]);
  });
});
