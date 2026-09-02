// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { Planet } from '@/lib/mockPlanets';
import OpenGraphImage, { size } from './opengraph-image';

const { getPlanetDetail } = vi.hoisted(() => ({ getPlanetDetail: vi.fn() }));

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

async function renderPng(name: string): Promise<Buffer> {
  const response = await OpenGraphImage({ params: Promise.resolve({ name }) });
  return Buffer.from(await response.arrayBuffer());
}

function pngDimensions(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

// Satori rejects layouts tsc and the mocked tests both accept, so the card is rendered for real here.
describe('opengraph-image rendered through satori', () => {
  it('encodes a planet card at the declared size', async () => {
    getPlanetDetail.mockResolvedValue(KEPLER);

    const png = await renderPng('Kepler-452%20b');

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(pngDimensions(png)).toEqual(size);
  });

  it('encodes the factless fallback card rather than throwing', async () => {
    getPlanetDetail.mockResolvedValue(null);

    const png = await renderPng('Nowhere%20b');

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(pngDimensions(png)).toEqual(size);
  });
});
