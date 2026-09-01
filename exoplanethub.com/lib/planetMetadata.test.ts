import { describe, expect, it } from 'vitest';
import type { Planet } from '@/lib/mockPlanets';
import { planetMetadata } from '@/lib/planetMetadata';

const NAME_ONLY: Planet = {
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

const KEPLER_452B: Planet = {
  ...NAME_ONLY,
  sy_dist: 551.7,
  pl_orbper: 384.843,
  pl_rade: 1.63,
};

function describedAs(planet: Partial<Planet>): string {
  return String(planetMetadata({ ...NAME_ONLY, ...planet }).description);
}

describe('planetMetadata titles', () => {
  it('names the planet before the site, so a tab strip stays readable', () => {
    expect(planetMetadata(KEPLER_452B).title).toBe(
      'Kepler-452 b — Exoplanet Profile | ExoplanetHub'
    );
  });

  it('leaves the site name to og:site_name rather than repeating it in the card title', () => {
    const { openGraph, twitter } = planetMetadata(KEPLER_452B);

    expect(openGraph?.title).toBe('Kepler-452 b — Exoplanet Profile');
    expect(twitter?.title).toBe('Kepler-452 b — Exoplanet Profile');
  });
});

describe('planetMetadata description', () => {
  it('carries the stats that make a shared link worth opening', () => {
    expect(describedAs(KEPLER_452B)).toBe(
      "Kepler-452 b — 1.63× Earth's radius, 384.8-day orbit, 1,799 light-years away."
    );
  });

  it('closes the list cleanly when only some stats were measured', () => {
    expect(describedAs({ pl_rade: 1.63, sy_dist: 551.7 })).toBe(
      "Kepler-452 b — 1.63× Earth's radius, 1,799 light-years away."
    );
  });

  it('still reads as a sentence when a single stat survives', () => {
    expect(describedAs({ pl_orbper: 384.843 })).toBe('Kepler-452 b — 384.8-day orbit.');
  });

  it('falls back to a plain claim rather than an empty clause', () => {
    expect(describedAs({})).toBe(
      "Kepler-452 b — a confirmed exoplanet in NASA's Exoplanet Archive."
    );
  });

  it.each([
    ['a dangling comma', /,\s*\./],
    ['a dangling dash', /—\s*\./],
    ['undefined', /undefined/],
    ['NaN', /NaN/],
    ['null', /null/],
  ])('never leaks %s into a preview, whatever the archive withheld', (_case, leak) => {
    const partials: Partial<Planet>[] = [
      {},
      { pl_rade: 1.63 },
      { pl_orbper: 384.843 },
      { sy_dist: 551.7 },
      { pl_rade: NaN, pl_orbper: Infinity, sy_dist: NaN },
      KEPLER_452B,
    ];

    for (const planet of partials) expect(describedAs(planet)).not.toMatch(leak);
  });
});

describe('planetMetadata link preview', () => {
  it('points the canonical and og:url at the encoded planet page', () => {
    const { alternates, openGraph } = planetMetadata(KEPLER_452B);

    expect(alternates?.canonical).toBe('/planet/Kepler-452%20b');
    expect(openGraph).toMatchObject({ url: '/planet/Kepler-452%20b', siteName: 'ExoplanetHub' });
  });

  it('asks for the wide card the per-planet image will fill', () => {
    expect(planetMetadata(KEPLER_452B).twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('gives the card the same sentence as the meta description', () => {
    const { description, openGraph, twitter } = planetMetadata(KEPLER_452B);

    expect(openGraph?.description).toBe(description);
    expect(twitter?.description).toBe(description);
  });
});

describe('planetMetadata for a planet we do not hold', () => {
  it('titles the 404 instead of inheriting the site-wide title', () => {
    expect(planetMetadata(null).title).toBe('Planet not found | ExoplanetHub');
  });

  it('keeps every guessed name out of the index', () => {
    expect(planetMetadata(null).robots).toMatchObject({ index: false });
  });

  it('claims no canonical URL for an address that holds nothing', () => {
    const missing = planetMetadata(null);

    expect(missing.alternates).toBeUndefined();
    expect(missing.openGraph).toBeUndefined();
  });
});
