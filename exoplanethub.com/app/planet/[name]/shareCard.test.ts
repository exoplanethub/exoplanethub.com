import { describe, expect, it } from 'vitest';
import { getESIBand } from '@/components/explore/esiBands';
import type { Planet } from '@/lib/mockPlanets';
import { getTheme, SITE_THEME } from '@/lib/theme';
import { shareCard } from './shareCard';

const UNMEASURED: Planet = {
  pl_name: 'HD 000001 b',
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
  last_updated: '2026-01-01T00:00:00Z',
};

function cardFor(planet: Partial<Planet>) {
  return shareCard({ ...UNMEASURED, ...planet });
}

describe('shareCard', () => {
  it('leads with the planet name and the star it orbits', () => {
    const card = cardFor({ pl_name: 'Kepler-452 b', hostname: 'Kepler-452' });

    expect(card.heading).toBe('Kepler-452 b');
    expect(card.subheading).toBe('Orbiting Kepler-452');
  });

  it.each([null, '', '   '])('names no star when the archive stored %o for the host', (hostname) => {
    expect(cardFor({ hostname }).subheading).toBe('A confirmed exoplanet');
  });

  it('quotes distance and discovery year in the same words the profile page uses', () => {
    const card = cardFor({ sy_dist: 551.7, disc_year: 2015 });

    expect(card.facts).toEqual(['1,799 light-years away', 'Discovered in 2015']);
  });

  it('drops a fact the archive never measured rather than captioning it unknown', () => {
    expect(cardFor({ disc_year: 2015 }).facts).toEqual(['Discovered in 2015']);
    expect(cardFor({}).facts).toEqual([]);
  });

  it('paints the ESI badge with the theme colours of the band the score falls in', () => {
    const { colors } = getTheme(SITE_THEME);

    expect(cardFor({ esi: 83 }).badge).toEqual({
      text: `ESI 83 · ${getESIBand(83).label}`,
      background: colors.esiBand2,
      color: colors.esiBand2Text,
    });
  });

  it.each([undefined, Number.NaN])('omits the badge when the stored ESI is %o', (esi) => {
    expect(cardFor({ esi }).badge).toBeNull();
  });

  it('gives a name the archive does not stock a branded card instead of an error', () => {
    const card = shareCard(null);

    expect(card.heading).toBe('Explore exoplanets');
    expect(card.facts).toEqual([]);
    expect(card.badge).toBeNull();
  });

  it('shrinks the heading as the designation lengthens, so it stays on one line', () => {
    const sizes = ['Kepler-452 b', 'OGLE-2016-BLG-1195L b', '2MASS J04414489+2301513 b'].map(
      (pl_name) => cardFor({ pl_name }).headingSize
    );

    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(new Set(sizes).size).toBe(sizes.length);
  });

  it('settles on the smallest step for any designation longer than the steps cover', () => {
    expect(cardFor({ pl_name: 'x'.repeat(80) }).headingSize).toBe(
      cardFor({ pl_name: 'x'.repeat(40) }).headingSize
    );
  });
});
