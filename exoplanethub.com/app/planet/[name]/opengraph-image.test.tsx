// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Planet } from '@/lib/mockPlanets';
import OpenGraphImage, { alt, contentType, revalidate, size } from './opengraph-image';

const { ImageResponse, getPlanetDetail } = vi.hoisted(() => ({
  ImageResponse: vi.fn(),
  getPlanetDetail: vi.fn(),
}));

vi.mock('next/og', () => ({ ImageResponse }));
vi.mock('@/lib/planetDetail', () => ({ getPlanetDetail }));

const KEPLER: Planet = {
  pl_name: 'Kepler-452 b',
  hostname: 'Kepler-452',
  sy_snum: 1,
  sy_pnum: 1,
  sy_dist: 551.7,
  discoverymethod: 'Transit',
  disc_year: 2015,
  disc_facility: 'Kepler',
  pl_orbper: 384.8,
  pl_orbsmax: 1.046,
  pl_rade: 1.63,
  pl_bmasse: 3.29,
  pl_dens: null,
  pl_eqt: 265,
  pl_insol: 1.1,
  st_teff: 5757,
  st_rad: 1.11,
  st_mass: 1.04,
  st_logg: null,
  st_age: 6,
  last_updated: '2026-01-01T00:00:00Z',
  esi: 83,
};

async function renderCard(name: string): Promise<string> {
  await OpenGraphImage({ params: Promise.resolve({ name }) });
  return renderToStaticMarkup(ImageResponse.mock.calls[0][0]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('opengraph-image', () => {
  it('declares the 1200x630 PNG contract share crawlers expect, cached for an hour', () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe('image/png');
    expect(revalidate).toBe(3600);
    expect(alt).not.toBe('');
  });

  it('draws the planet name, its star and its facts at the size it declares', async () => {
    getPlanetDetail.mockResolvedValue(KEPLER);

    const markup = await renderCard('Kepler-452%20b');

    expect(markup).toContain('Kepler-452 b');
    expect(markup).toContain('Orbiting Kepler-452');
    expect(markup).toContain('1,799 light-years away');
    expect(markup).toContain('Discovered in 2015');
    expect(markup).toContain('ESI 83');
    expect(ImageResponse.mock.calls[0][1]).toEqual(size);
  });

  it('decodes the route segment before looking the planet up', async () => {
    getPlanetDetail.mockResolvedValue(KEPLER);

    await renderCard('Kepler-452%20b');

    expect(getPlanetDetail).toHaveBeenCalledWith('Kepler-452 b');
  });

  it('answers with the branded card when the archive does not stock the name', async () => {
    getPlanetDetail.mockResolvedValue(null);

    await expect(renderCard('Nowhere%20b')).resolves.toContain('Explore exoplanets');
  });

  it('answers a segment that cannot be decoded without touching DynamoDB', async () => {
    await expect(renderCard('%ZZ')).resolves.toContain('Explore exoplanets');
    expect(getPlanetDetail).not.toHaveBeenCalled();
  });
});
