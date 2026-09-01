import { describe, expect, it } from 'vitest';
import { planetNameFromParam, planetUrl } from '@/lib/planetUrl';

// Archive names carry every character class the URL layer has to survive.
const ARCHIVE_NAMES = [
  'Kepler-452 b',
  'HD 189733 b',
  'PSR B1257+12 c',
  'Kepler-16 (AB) b',
  '1RXS J160929.1-210524 b',
  '2MASS J04414489+2301513 b',
];

function routeSegmentOf(url: string) {
  return url.slice('/planet/'.length);
}

describe('planetUrl', () => {
  it('addresses the planet page by its exact encoded name', () => {
    expect(planetUrl('Kepler-452 b')).toBe('/planet/Kepler-452%20b');
  });

  it('escapes the plus sign that a designation may carry', () => {
    expect(planetUrl('PSR B1257+12 c')).toBe('/planet/PSR%20B1257%2B12%20c');
  });

  it('escapes a slash rather than splitting the name across path segments', () => {
    expect(routeSegmentOf(planetUrl('A/B c'))).not.toContain('/');
  });
});

describe('planetUrl and planetNameFromParam round trip', () => {
  it.each(ARCHIVE_NAMES)('recovers %s exactly', (name) => {
    expect(planetNameFromParam(routeSegmentOf(planetUrl(name)))).toBe(name);
  });

  it.each(ARCHIVE_NAMES)('recovers %s from an already-decoded segment', (name) => {
    expect(planetNameFromParam(name)).toBe(name);
  });
});

describe('planetNameFromParam rejections', () => {
  it.each([
    ['%ZZ', 'a malformed escape sequence'],
    ['%E0%A4%A', 'a truncated escape sequence'],
    ['', 'an empty segment'],
    ['%20%20', 'a whitespace-only segment'],
  ])('returns null for %s — %s', (param) => {
    expect(planetNameFromParam(param)).toBeNull();
  });

  // The segment reaches the not-found page as displayed text, so an essay is not a name.
  it('rejects a segment longer than any designation, keeping prose out of the lookup', () => {
    expect(planetNameFromParam('K'.repeat(80))).toHaveLength(80);
    expect(planetNameFromParam('K'.repeat(81))).toBeNull();
    expect(planetNameFromParam(encodeURIComponent('Your account is locked. '.repeat(10)))).toBeNull();
  });
});
