import { describe, expect, it } from 'vitest';
import type { PlanetSummary } from '@/lib/mockPlanets';
import {
  DEFAULT_FILTERS,
  FilterState,
  Range,
  RangeKey,
  applyFilters,
  discoveryMethods,
  measuredExtent,
  parseFilters,
  serializeFilters,
  sortPlanets,
  withMethod,
  withRange,
  withSort,
} from '@/lib/planetFilters';

function makePlanet(overrides: Partial<PlanetSummary> & Pick<PlanetSummary, 'pl_name'>): PlanetSummary {
  return {
    hostname: 'Host',
    sy_dist: 10,
    discoverymethod: 'Transit',
    disc_year: 2000,
    pl_orbper: 10,
    pl_rade: 1,
    pl_bmasse: 1,
    pl_eqt: 1,
    ...overrides,
  };
}

function parse(query: string): FilterState {
  return parseFilters(new URLSearchParams(query));
}

const ALPHA = makePlanet({ pl_name: 'Alpha b', hostname: 'Ross 128' });
const BETA = makePlanet({ pl_name: 'Beta c', hostname: 'Kepler-186', discoverymethod: 'Radial Velocity' });
const GAMMA = makePlanet({ pl_name: 'Gamma d', hostname: null });

describe('parseFilters', () => {
  it('reads an empty query string as the default view', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it('reads search, method and sort', () => {
    expect(parse('q=kepler&method=Transit&sort=pl_rade.asc')).toEqual({
      ...DEFAULT_FILTERS,
      q: 'kepler',
      methods: ['Transit'],
      sortKey: 'pl_rade',
      sortOrder: 'asc',
    });
  });

  it.each([
    ['an unknown sort key', 'sort=nonsense.asc'],
    ['an unknown direction', 'sort=pl_rade.sideways'],
    ['a sort with no direction', 'sort=pl_rade'],
    ['an empty sort', 'sort='],
    ['a sort key that is a planet field but not sortable', 'sort=pl_eqt.asc'],
  ])('falls back to the default sort for %s', (_label, query) => {
    expect(parse(query)).toMatchObject({ sortKey: 'disc_year', sortOrder: 'desc' });
  });

  it('treats an empty or absent value as an inactive filter', () => {
    expect(parse('q=&method=')).toMatchObject({ q: '', methods: [] });
  });

  it('reads a comma-separated method list', () => {
    expect(parse('method=Radial%20Velocity,Transit')).toMatchObject({
      methods: ['Radial Velocity', 'Transit'],
    });
  });

  it('normalises the order the URL gave, so one set of methods has exactly one URL', () => {
    expect(parse('method=Transit,Astrometry')).toEqual(parse('method=Astrometry,Transit'));
    expect(serializeFilters(parse('method=Transit,Astrometry'))).toBe('method=Astrometry%2CTransit');
  });

  it.each([
    ['empty entries', 'method=Transit,,Imaging', ['Imaging', 'Transit']],
    ['padding around each name', 'method=%20Transit%20,%20Imaging%20', ['Imaging', 'Transit']],
    ['a repeated method', 'method=Transit,Imaging,Transit', ['Imaging', 'Transit']],
    ['a list of nothing but separators', 'method=,,', []],
  ])('drops %s rather than filtering on them', (_label, query, expected) => {
    expect(parse(query)).toMatchObject({ methods: expected });
  });

  it('ignores params it does not recognise', () => {
    expect(parse('bogus=1&q=kepler')).toEqual({ ...DEFAULT_FILTERS, q: 'kepler' });
  });

  it('reads each range in its own real units', () => {
    expect(parse('radius=0.5..2&mass=..10&period=1..365').ranges).toEqual({
      radius: { min: 0.5, max: 2 },
      mass: { min: null, max: 10 },
      period: { min: 1, max: 365 },
    });
  });

  it.each([
    ['no lower bound', 'radius=..2', { min: null, max: 2 }],
    ['no upper bound', 'radius=0.5..', { min: 0.5, max: null }],
    ['a negative bound, which no planet can match rather than being an error', 'radius=-1..2', { min: -1, max: 2 }],
    ['bounds the visitor entered backwards', 'radius=10..1', { min: 10, max: 1 }],
  ])('reads a range with %s', (_label, query, expected) => {
    expect(parse(query).ranges.radius).toEqual(expected);
  });

  it.each([
    ['a bound that is not a number', 'radius=small..2'],
    ['no separator at all', 'radius=2'],
    ['more bounds than a range has ends', 'radius=1..2..3'],
    ['an infinite bound', 'radius=1..Infinity'],
    ['an empty value', 'radius='],
    ['a separator with nothing either side', 'radius=..'],
  ])('leaves the range inactive for %s', (_label, query) => {
    expect(parse(query).ranges.radius).toEqual({ min: null, max: null });
  });

  // Number(' ') is 0, which would quietly become a floor no planet falls below.
  it('reads a blank bound as an omitted end rather than as zero', () => {
    expect(parse('radius= ..2').ranges.radius).toEqual({ min: null, max: 2 });
  });
});

describe('serializeFilters', () => {
  it('writes nothing for the default view, so a pristine /explore carries no query string', () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe('');
  });

  it('omits the default sort while keeping the other filters', () => {
    expect(serializeFilters({ ...DEFAULT_FILTERS, q: 'kepler' })).toBe('q=kepler');
  });

  it('writes a sort that differs from the default only in direction', () => {
    expect(serializeFilters({ ...DEFAULT_FILTERS, sortOrder: 'asc' })).toBe('sort=disc_year.asc');
  });

  it('omits a search that is only whitespace', () => {
    expect(serializeFilters({ ...DEFAULT_FILTERS, q: '   ' })).toBe('');
  });

  it('writes the search the filter actually applies, not the padding around it', () => {
    expect(serializeFilters({ ...DEFAULT_FILTERS, q: '  wolf  ' })).toBe('q=wolf');
  });

  it('writes a range as the bounds a visitor would recognise, not slider positions', () => {
    expect(serializeFilters(withRange(DEFAULT_FILTERS, 'period', { min: 1, max: 365 }))).toBe(
      'period=1..365'
    );
  });

  it.each([
    ['no lower bound', { min: null, max: 2 }, 'radius=..2'],
    ['no upper bound', { min: 0.5, max: null }, 'radius=0.5..'],
  ])('keeps the separator for a range with %s, so the omitted end stays readable', (_label, range, expected) => {
    expect(serializeFilters(withRange(DEFAULT_FILTERS, 'radius', range))).toBe(expected);
  });

  it('leaves an unbounded range out of the URL entirely', () => {
    expect(serializeFilters(withRange(DEFAULT_FILTERS, 'radius', { min: null, max: null }))).toBe('');
  });

  it.each([
    ['the default view', DEFAULT_FILTERS],
    ['a search', { ...DEFAULT_FILTERS, q: 'kepler 186' }],
    ['a method', { ...DEFAULT_FILTERS, methods: ['Radial Velocity'] }],
    ['several methods', { ...DEFAULT_FILTERS, methods: ['Imaging', 'Radial Velocity', 'Transit'] }],
    ['a non-default sort', { ...DEFAULT_FILTERS, sortKey: 'esi' as const, sortOrder: 'asc' as const }],
    ['a range bounded at both ends', withRange(DEFAULT_FILTERS, 'radius', { min: 0.5, max: 2 })],
    ['a range open at the top', withRange(DEFAULT_FILTERS, 'mass', { min: 10, max: null })],
    ['a range open at the bottom', withRange(DEFAULT_FILTERS, 'period', { min: null, max: 365 })],
    ['a fractional bound', withRange(DEFAULT_FILTERS, 'radius', { min: 0.0912, max: null })],
    ['the longest periods in the archive', withRange(DEFAULT_FILTERS, 'period', { min: 8000000, max: null })],
    [
      'every filter at once',
      {
        ...withRange(withRange(DEFAULT_FILTERS, 'radius', { min: 0.5, max: 2 }), 'period', { min: null, max: 365 }),
        q: 'wolf',
        methods: ['Transit'],
        sortKey: 'sy_dist' as const,
        sortOrder: 'asc' as const,
      },
    ],
  ])('round-trips %s through the URL', (_label, state) => {
    expect(parse(serializeFilters(state))).toEqual(state);
  });
});

describe('withRange', () => {
  it('leaves the other ranges and filters alone', () => {
    const state = withRange({ ...DEFAULT_FILTERS, q: 'wolf' }, 'radius', { min: 1, max: 2 });

    expect(withRange(state, 'mass', { min: 5, max: null })).toEqual({
      ...DEFAULT_FILTERS,
      q: 'wolf',
      ranges: {
        radius: { min: 1, max: 2 },
        mass: { min: 5, max: null },
        period: { min: null, max: null },
      },
    });
  });
});

describe('withSort', () => {
  it('starts a newly chosen column descending', () => {
    expect(withSort({ ...DEFAULT_FILTERS, sortOrder: 'asc' }, 'pl_rade')).toMatchObject({
      sortKey: 'pl_rade',
      sortOrder: 'desc',
    });
  });

  it('flips direction when the active column is chosen again', () => {
    const descending = withSort(DEFAULT_FILTERS, 'pl_rade');

    expect(withSort(descending, 'pl_rade')).toMatchObject({ sortKey: 'pl_rade', sortOrder: 'asc' });
    expect(withSort(withSort(descending, 'pl_rade'), 'pl_rade')).toMatchObject({ sortOrder: 'desc' });
  });

  it('leaves the other filters alone', () => {
    expect(withSort({ ...DEFAULT_FILTERS, q: 'wolf', methods: ['Transit'] }, 'esi')).toMatchObject({
      q: 'wolf',
      methods: ['Transit'],
    });
  });
});

describe('withMethod', () => {
  it('adds and removes one method without disturbing the others', () => {
    const one = withMethod(DEFAULT_FILTERS, 'Transit', true);

    expect(withMethod(one, 'Imaging', true).methods).toEqual(['Imaging', 'Transit']);
    expect(withMethod(withMethod(one, 'Imaging', true), 'Transit', false).methods).toEqual(['Imaging']);
  });

  it('orders the selection so click order cannot produce two URLs for one set', () => {
    const clickedInOrder = withMethod(withMethod(DEFAULT_FILTERS, 'Imaging', true), 'Transit', true);
    const clickedInReverse = withMethod(withMethod(DEFAULT_FILTERS, 'Transit', true), 'Imaging', true);

    expect(serializeFilters(clickedInOrder)).toBe(serializeFilters(clickedInReverse));
  });

  it('never selects the same method twice', () => {
    expect(withMethod(withMethod(DEFAULT_FILTERS, 'Transit', true), 'Transit', true).methods).toEqual(['Transit']);
  });

  it('deselecting a method that was never selected is a no-op', () => {
    expect(withMethod(DEFAULT_FILTERS, 'Transit', false).methods).toEqual([]);
  });

  it('leaves the other filters alone', () => {
    const state = withMethod({ ...DEFAULT_FILTERS, q: 'wolf', sortKey: 'esi' }, 'Transit', true);

    expect(state).toMatchObject({ q: 'wolf', sortKey: 'esi' });
  });
});

describe('applyFilters', () => {
  const planets = [ALPHA, BETA, GAMMA];

  function names(state: Partial<FilterState>) {
    return applyFilters(planets, { ...DEFAULT_FILTERS, ...state }).map((planet) => planet.pl_name);
  }

  it('hands back the original list when no filter is active, so downstream memos stay stable', () => {
    expect(applyFilters(planets, DEFAULT_FILTERS)).toBe(planets);
  });

  it('matches planet names case insensitively', () => {
    expect(names({ q: 'BETA' })).toEqual(['Beta c']);
  });

  it('matches host star names', () => {
    expect(names({ q: 'ross' })).toEqual(['Alpha b']);
  });

  it('matches on a substring, not just a prefix', () => {
    expect(names({ q: '186' })).toEqual(['Beta c']);
  });

  it('does not trip over a planet whose host star is unknown', () => {
    expect(names({ q: 'gamma' })).toEqual(['Gamma d']);
  });

  it('ignores surrounding whitespace rather than matching zero planets', () => {
    expect(names({ q: '  beta  ' })).toEqual(['Beta c']);
  });

  it('filters by discovery method', () => {
    expect(names({ methods: ['Radial Velocity'] })).toEqual(['Beta c']);
  });

  it('takes the union of several methods rather than the intersection', () => {
    expect(names({ methods: ['Radial Velocity', 'Transit'] })).toEqual(['Alpha b', 'Beta c', 'Gamma d']);
  });

  it('still returns the methods it recognises when the URL also names one the data lacks', () => {
    expect(names({ methods: ['Astrometry', 'Radial Velocity'] })).toEqual(['Beta c']);
  });

  it('leaves out planets the archive gives no method for', () => {
    const unknown = makePlanet({ pl_name: 'Nameless', discoverymethod: null });

    expect(applyFilters([ALPHA, unknown], { ...DEFAULT_FILTERS, methods: ['Transit'] })).toEqual([ALPHA]);
  });

  it('requires a planet to satisfy every active filter', () => {
    expect(names({ q: 'beta', methods: ['Transit'] })).toEqual([]);
  });
});

describe('applyFilters over ranges', () => {
  const SMALL = makePlanet({ pl_name: 'Small', pl_rade: 0.5, pl_bmasse: 0.2, pl_orbper: 0.09 });
  const EARTHY = makePlanet({ pl_name: 'Earthy', pl_rade: 1, pl_bmasse: 1, pl_orbper: 365 });
  const GIANT = makePlanet({ pl_name: 'Giant', pl_rade: 12, pl_bmasse: 300, pl_orbper: 8000000 });
  const planets = [SMALL, EARTHY, GIANT];

  function inRange(key: RangeKey, range: Range, list = planets) {
    return applyFilters(list, withRange(DEFAULT_FILTERS, key, range)).map((planet) => planet.pl_name);
  }

  it.each([
    ['radius', 'pl_rade' as const],
    ['mass', 'pl_bmasse' as const],
    ['period', 'pl_orbper' as const],
  ])('reads %s off the planet field it names', (key, field) => {
    const only = makePlanet({ pl_name: 'Only', [field]: 42 });

    expect(inRange(key as RangeKey, { min: 41, max: 43 }, [only, makePlanet({ pl_name: 'Other', [field]: 1 })])).toEqual(['Only']);
  });

  it('keeps planets sitting exactly on either bound', () => {
    expect(inRange('radius', { min: 0.5, max: 1 })).toEqual(['Small', 'Earthy']);
  });

  it('treats an omitted upper bound as no ceiling, so the longest orbits stay in', () => {
    expect(inRange('period', { min: 365, max: null })).toEqual(['Earthy', 'Giant']);
  });

  it('treats an omitted lower bound as no floor', () => {
    expect(inRange('mass', { min: null, max: 1 })).toEqual(['Small', 'Earthy']);
  });

  it('matches nothing when the bounds are the wrong way round, rather than silently widening', () => {
    expect(inRange('radius', { min: 10, max: 1 })).toEqual([]);
  });

  it('applies every active range at once', () => {
    const state = withRange(withRange(DEFAULT_FILTERS, 'radius', { min: 0.4, max: 2 }), 'period', {
      min: 100,
      max: null,
    });

    expect(applyFilters(planets, state).map((planet) => planet.pl_name)).toEqual(['Earthy']);
  });

  it('narrows a range against the search box rather than replacing it', () => {
    const state = { ...withRange(DEFAULT_FILTERS, 'radius', { min: 0.4, max: 20 }), q: 'giant' };

    expect(applyFilters(planets, state).map((planet) => planet.pl_name)).toEqual(['Giant']);
  });
});

describe('applyFilters over planets the archive never measured', () => {
  const MEASURED = makePlanet({ pl_name: 'Measured', pl_bmasse: 5 });
  const UNMEASURED = makePlanet({ pl_name: 'Unmeasured', pl_bmasse: null });
  const planets = [MEASURED, UNMEASURED];

  it('keeps an unmeasured planet while the range that would judge it is inactive', () => {
    expect(applyFilters(planets, DEFAULT_FILTERS)).toBe(planets);
  });

  it.each([
    ['both ends', { min: 1, max: 10 }],
    ['only a floor', { min: 1, max: null }],
    ['only a ceiling', { min: null, max: 10 }],
  ])('hides an unmeasured planet once the range sets %s', (_label, range) => {
    expect(applyFilters(planets, withRange(DEFAULT_FILTERS, 'mass', range)).map((p) => p.pl_name)).toEqual([
      'Measured',
    ]);
  });

  it('hides it for the range that asks about it and no other', () => {
    const state = withRange(DEFAULT_FILTERS, 'radius', { min: 0, max: 100 });

    expect(applyFilters(planets, state).map((planet) => planet.pl_name)).toEqual([
      'Measured',
      'Unmeasured',
    ]);
  });
});

describe('measuredExtent', () => {
  it('spans the smallest and largest measurement present', () => {
    const planets = [
      makePlanet({ pl_name: 'A', pl_orbper: 365 }),
      makePlanet({ pl_name: 'B', pl_orbper: 0.09 }),
      makePlanet({ pl_name: 'C', pl_orbper: 8000000 }),
    ];

    expect(measuredExtent(planets, 'period')).toEqual({ min: 0.09, max: 8000000 });
  });

  it('skips the planets the archive left blank', () => {
    const planets = [
      makePlanet({ pl_name: 'A', pl_bmasse: null }),
      makePlanet({ pl_name: 'B', pl_bmasse: 3 }),
    ];

    expect(measuredExtent(planets, 'mass')).toEqual({ min: 3, max: 3 });
  });

  it('reports no extent at all when nothing was measured, so no track can be drawn', () => {
    expect(measuredExtent([makePlanet({ pl_name: 'A', pl_rade: null })], 'radius')).toEqual({
      min: null,
      max: null,
    });
  });

  it('reports no extent for an empty archive', () => {
    expect(measuredExtent([], 'radius')).toEqual({ min: null, max: null });
  });
});

describe('sortPlanets', () => {
  function ordered(planets: PlanetSummary[], sortKey: FilterState['sortKey'], sortOrder: FilterState['sortOrder']) {
    return sortPlanets(planets, { ...DEFAULT_FILTERS, sortKey, sortOrder }).map((planet) => planet.pl_name);
  }

  const BY_YEAR = [
    makePlanet({ pl_name: 'Older', disc_year: 2008 }),
    makePlanet({ pl_name: 'Newer', disc_year: 2021 }),
  ];

  it('orders by the key and direction it is given', () => {
    expect(ordered(BY_YEAR, 'disc_year', 'desc')).toEqual(['Newer', 'Older']);
    expect(ordered(BY_YEAR, 'disc_year', 'asc')).toEqual(['Older', 'Newer']);
  });

  it('compares names case insensitively', () => {
    const planets = [makePlanet({ pl_name: 'beta' }), makePlanet({ pl_name: 'Alpha' })];

    expect(ordered(planets, 'pl_name', 'asc')).toEqual(['Alpha', 'beta']);
  });

  it('ranks planets the archive never measured last in both directions', () => {
    const planets = [
      makePlanet({ pl_name: 'Unmeasured', pl_rade: null }),
      makePlanet({ pl_name: 'Small', pl_rade: 1 }),
      makePlanet({ pl_name: 'Large', pl_rade: 9 }),
    ];

    expect(ordered(planets, 'pl_rade', 'desc')).toEqual(['Large', 'Small', 'Unmeasured']);
    expect(ordered(planets, 'pl_rade', 'asc')).toEqual(['Small', 'Large', 'Unmeasured']);
  });

  it('compares numbers numerically rather than lexicographically', () => {
    const planets = [
      makePlanet({ pl_name: 'Nine', pl_rade: 9 }),
      makePlanet({ pl_name: 'Eighty', pl_rade: 80 }),
    ];

    expect(ordered(planets, 'pl_rade', 'asc')).toEqual(['Nine', 'Eighty']);
  });

  it('ranks an unscored planet last but a real zero among the scored', () => {
    const planets = [
      makePlanet({ pl_name: 'Unscored' }),
      makePlanet({ pl_name: 'Middling', esi: 55 }),
      makePlanet({ pl_name: 'Zero', esi: 0 }),
      makePlanet({ pl_name: 'Scored', esi: 92 }),
    ];

    expect(ordered(planets, 'esi', 'desc')).toEqual(['Scored', 'Middling', 'Zero', 'Unscored']);
    expect(ordered(planets, 'esi', 'asc')).toEqual(['Zero', 'Middling', 'Scored', 'Unscored']);
  });

  it('leaves the list it was handed untouched', () => {
    const planets = [BETA, ALPHA];

    sortPlanets(planets, { ...DEFAULT_FILTERS, sortKey: 'pl_name', sortOrder: 'asc' });

    expect(planets.map((planet) => planet.pl_name)).toEqual(['Beta c', 'Alpha b']);
  });
});

describe('discoveryMethods', () => {
  it('lists each method present in the data once, in a stable alphabetical order', () => {
    expect(discoveryMethods([BETA, ALPHA, BETA])).toEqual(['Radial Velocity', 'Transit']);
  });

  it('leaves out planets the archive gives no method for', () => {
    expect(discoveryMethods([makePlanet({ pl_name: 'Unknown', discoverymethod: null })])).toEqual([]);
  });
});
