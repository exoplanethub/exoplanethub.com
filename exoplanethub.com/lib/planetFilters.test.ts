import { describe, expect, it } from 'vitest';
import type { PlanetSummary } from '@/lib/mockPlanets';
import {
  DEFAULT_FILTERS,
  FilterState,
  applyFilters,
  discoveryMethods,
  parseFilters,
  serializeFilters,
  withSort,
} from '@/lib/planetFilters';

function makePlanet(overrides: Partial<PlanetSummary> & Pick<PlanetSummary, 'pl_name'>): PlanetSummary {
  return {
    hostname: 'Host',
    sy_dist: 10,
    discoverymethod: 'Transit',
    disc_year: 2000,
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
      q: 'kepler',
      method: 'Transit',
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
    expect(parse('q=&method=')).toMatchObject({ q: '', method: null });
  });

  it('ignores params it does not recognise', () => {
    expect(parse('bogus=1&q=kepler')).toEqual({ ...DEFAULT_FILTERS, q: 'kepler' });
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

  it.each([
    ['the default view', DEFAULT_FILTERS],
    ['a search', { ...DEFAULT_FILTERS, q: 'kepler 186' }],
    ['a method', { ...DEFAULT_FILTERS, method: 'Radial Velocity' }],
    ['a non-default sort', { ...DEFAULT_FILTERS, sortKey: 'esi' as const, sortOrder: 'asc' as const }],
    ['every filter at once', { q: 'wolf', method: 'Transit', sortKey: 'sy_dist' as const, sortOrder: 'asc' as const }],
  ])('round-trips %s through the URL', (_label, state) => {
    expect(parse(serializeFilters(state))).toEqual(state);
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
    expect(withSort({ ...DEFAULT_FILTERS, q: 'wolf', method: 'Transit' }, 'esi')).toMatchObject({
      q: 'wolf',
      method: 'Transit',
    });
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
    expect(names({ method: 'Radial Velocity' })).toEqual(['Beta c']);
  });

  it('requires a planet to satisfy every active filter', () => {
    expect(names({ q: 'beta', method: 'Transit' })).toEqual([]);
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
