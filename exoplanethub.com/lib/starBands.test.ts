import { describe, expect, it } from 'vitest';
import { STAR_BANDS, STAR_CLASSES, isStarClass, starBandOf, starClassOf } from '@/lib/starBands';

describe('starClassOf band edges', () => {
  // Every edge from the spec's table. Half-open with the lower bound inclusive, so the edge
  // itself belongs to the hotter class and anything under it falls to the next one down.
  it.each([
    [33000, 'O', 'B'],
    [10000, 'B', 'A'],
    [7300, 'A', 'F'],
    [6000, 'F', 'G'],
    [5300, 'G', 'K'],
    [3900, 'K', 'M'],
  ])('puts %i K in %s and just under it in %s', (edge, hotter, cooler) => {
    expect(starClassOf(edge)).toBe(hotter);
    expect(starClassOf(edge - 1)).toBe(cooler);
  });

  it('classifies the coolest edge as M but leaves anything under it unclassified', () => {
    expect(starClassOf(2300)).toBe('M');
    expect(starClassOf(2299)).toBeNull();
  });

  it.each([
    ['a brown dwarf host', 1500],
    ['absolute zero', 0],
  ])('leaves %s unclassified rather than extending M downward', (_label, teff) => {
    expect(starClassOf(teff)).toBeNull();
  });

  it('leaves a star the archive never measured unclassified', () => {
    expect(starClassOf(null)).toBeNull();
  });

  it.each([NaN, Infinity, -Infinity])('leaves the non-finite value %p unclassified', (teff) => {
    expect(starClassOf(teff)).toBeNull();
  });

  it('classifies a star hotter than any band edge as O', () => {
    expect(starClassOf(60000)).toBe('O');
  });

  it('classifies the Sun as G, the class its label claims', () => {
    expect(starClassOf(5772)).toBe('G');
  });
});

describe('starBandOf', () => {
  it('hands back the whole band so a caller needs no second lookup to label it', () => {
    expect(starBandOf(5772)).toEqual({ starClass: 'G', minTeff: 5300, label: 'G — sun-like' });
  });

  it.each([null, NaN, 2299])('leaves %p without a band', (teff) => {
    expect(starBandOf(teff)).toBeNull();
  });

  it('agrees with starClassOf across every band', () => {
    for (const band of STAR_BANDS) expect(starBandOf(band.minTeff)?.starClass).toBe(starClassOf(band.minTeff));
  });
});

describe('star band table', () => {
  it('runs hottest to coolest, the order the lookup and the URL both rely on', () => {
    expect(STAR_CLASSES).toEqual(['O', 'B', 'A', 'F', 'G', 'K', 'M']);
    expect(STAR_BANDS.map((band) => band.minTeff)).toEqual([33000, 10000, 7300, 6000, 5300, 3900, 2300]);
  });

  it('labels every class in plain language, not just the letter', () => {
    expect(STAR_BANDS.map((band) => band.label)).toEqual([
      'O — blue',
      'B — blue-white',
      'A — white',
      'F — yellow-white',
      'G — sun-like',
      'K — orange dwarf',
      'M — red dwarf',
    ]);
  });

  it('recognises exactly the seven classes it bands', () => {
    for (const starClass of STAR_CLASSES) expect(isStarClass(starClass)).toBe(true);
    expect(isStarClass('L')).toBe(false);
    expect(isStarClass('m')).toBe(false);
    expect(isStarClass('')).toBe(false);
  });
});
