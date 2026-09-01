import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getESIBand } from '@/components/explore/esiBands';
import type { Planet } from '@/lib/mockPlanets';
import PlanetPage, { generateMetadata } from './page';

const { NotFoundSignal, getPlanetDetail } = vi.hoisted(() => ({
  NotFoundSignal: class NotFoundSignal extends Error {},
  getPlanetDetail: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFoundSignal('NEXT_NOT_FOUND');
  },
}));

vi.mock('@/lib/planetDetail', () => ({ getPlanetDetail }));

const NAME_ONLY: Planet = {
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
  last_updated: '2026-08-30T06:00:00Z',
};

const KEPLER_452B: Planet = {
  ...NAME_ONLY,
  pl_name: 'Kepler-452 b',
  hostname: 'Kepler-452',
  sy_snum: 1,
  sy_pnum: 1,
  sy_dist: 551.7,
  discoverymethod: 'Transit',
  disc_year: 2015,
  disc_facility: 'Kepler',
  pl_orbper: 384.843,
  pl_orbsmax: 1.046,
  pl_rade: 1.63,
  pl_eqt: 265,
  pl_insol: 1.1,
  st_teff: 5757,
  st_rad: 1.11,
  st_mass: 1.04,
  st_age: 6,
  esi: 83,
};

async function renderPage(segment: string) {
  render(await PlanetPage({ params: Promise.resolve({ name: segment }) }));
}

function sectionNamed(title: string) {
  return screen.getByRole('region', { name: title });
}

function statValue(section: string, label: string) {
  return within(sectionNamed(section)).getByText(label, { selector: 'dt' }).nextElementSibling;
}

function comparisonDetail(aspect: string) {
  return statValue('Compared with Earth', aspect);
}

beforeEach(() => {
  getPlanetDetail.mockReset();
});

describe('PlanetPage', () => {
  beforeEach(() => {
    getPlanetDetail.mockResolvedValue(KEPLER_452B);
  });

  it('looks the planet up by the decoded name, not the URL segment', async () => {
    await renderPage('Kepler-452%20b');

    expect(getPlanetDetail).toHaveBeenCalledWith('Kepler-452 b');
  });

  it('titles the page with the planet and names no other top-level heading', async () => {
    await renderPage('Kepler-452%20b');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kepler-452 b');
  });

  it('groups the profile under second-level section headings', async () => {
    await renderPage('Kepler-452%20b');

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Compared with Earth',
      'Planet',
      'Star',
      'System',
      'Discovery',
    ]);
  });

  it.each([
    ['Planet', 'Radius', '1.63 × Earth'],
    ['Planet', 'Orbital period', '384.8 days'],
    ['Star', 'Host star', 'Kepler-452'],
    ['Star', 'Spectral class', 'G — sun-like'],
    ['System', 'Distance from Earth', '1,799 light-years (551.7 parsecs)'],
    ['Discovery', 'Year', '2015'],
    ['Discovery', 'Facility', 'Kepler'],
  ])('pairs %s / %s with its value for a screen reader', async (section, label, value) => {
    await renderPage('Kepler-452%20b');

    expect(statValue(section, label)).toHaveTextContent(value);
  });

  it('badges the ESI score with the band label from the shared thresholds', async () => {
    await renderPage('Kepler-452%20b');

    const badge = screen.getByRole('button', { name: /^ESI 83, / });
    expect(badge).toHaveTextContent('ESI 83');
    expect(badge).toHaveTextContent(getESIBand(83).label);
  });

  it.each([
    ['Size', "About 1.6 times Earth's width."],
    ['Temperature', 'About -8 °C (17 °F) from starlight alone'],
    ['Starlight', 'About 1.1 times the starlight Earth gets from the Sun.'],
    ['Year', 'A year here lasts about 1.1 Earth years.'],
  ])('pairs the %s comparison with its plain-language reading', async (aspect, detail) => {
    await renderPage('Kepler-452%20b');

    expect(comparisonDetail(aspect)).toHaveTextContent(detail);
  });

  it('leaves out the mass comparison the archive cannot support', async () => {
    await renderPage('Kepler-452%20b');

    expect(within(sectionNamed('Compared with Earth')).queryByText('Mass')).toBeNull();
  });

  it('says the star it orbits above the stats', async () => {
    await renderPage('Kepler-452%20b');

    expect(screen.getByText('A confirmed exoplanet orbiting Kepler-452.')).toBeInTheDocument();
  });

  it('credits the archive and dates the record', async () => {
    await renderPage('Kepler-452%20b');

    const credit = screen.getByRole('link', { name: 'NASA Exoplanet Archive' });
    expect(credit).toHaveAttribute('href', 'https://exoplanetarchive.ipac.caltech.edu/');
    expect(credit.parentElement).toHaveTextContent('synced August 30, 2026');
  });

  it('reads the item once per render', async () => {
    await renderPage('Kepler-452%20b');

    expect(getPlanetDetail).toHaveBeenCalledTimes(1);
  });
});

describe('PlanetPage with unmeasured fields', () => {
  beforeEach(() => {
    getPlanetDetail.mockResolvedValue(NAME_ONLY);
  });

  it('still renders every row, marked unknown rather than collapsed', async () => {
    await renderPage('HD%20000001%20b');

    expect(screen.getAllByRole('definition')).toHaveLength(19);
    expect(screen.getAllByText('Unknown')).toHaveLength(19);
  });

  it.each(['undefined', 'NaN', 'null'])('never prints %s as a value', async (leak) => {
    await renderPage('HD%20000001%20b');

    expect(screen.queryByText(leak)).toBeNull();
  });

  it('omits the comparison block entirely rather than framing an empty one', async () => {
    await renderPage('HD%20000001%20b');

    expect(screen.queryByRole('region', { name: 'Compared with Earth' })).toBeNull();
  });

  it('shows no ESI badge for a planet the sync could not score', async () => {
    await renderPage('HD%20000001%20b');

    expect(screen.queryByRole('button', { name: /^ESI /i })).toBeNull();
  });

  it('drops the host-star clause instead of naming an unknown star', async () => {
    await renderPage('HD%20000001%20b');

    expect(screen.getByText('A confirmed exoplanet.')).toBeInTheDocument();
  });
});

describe('PlanetPage misses', () => {
  it('renders the not-found page when the archive has no such planet', async () => {
    getPlanetDetail.mockResolvedValue(null);

    await expect(renderPage('Definitely%20Not%20A%20Planet%20b')).rejects.toBeInstanceOf(
      NotFoundSignal
    );
  });

  it.each(['%ZZ', ''])(
    'renders the not-found page for the malformed segment "%s" without reading the table',
    async (segment) => {
      await expect(renderPage(segment)).rejects.toBeInstanceOf(NotFoundSignal);
      expect(getPlanetDetail).not.toHaveBeenCalled();
    }
  );

  // A throttled or broken read is not a missing planet; a cached 404 would outlive the outage.
  it('lets a read failure surface instead of cacheing it as a 404', async () => {
    getPlanetDetail.mockRejectedValue(new Error('ProvisionedThroughputExceededException'));

    await expect(renderPage('Kepler-452%20b')).rejects.toThrow(
      'ProvisionedThroughputExceededException'
    );
  });
});

describe('PlanetPage metadata', () => {
  it('titles and describes the planet rather than inheriting the site defaults', async () => {
    getPlanetDetail.mockResolvedValue(KEPLER_452B);

    const metadata = await generateMetadata({ params: Promise.resolve({ name: 'Kepler-452%20b' }) });

    expect(metadata.title).toBe('Kepler-452 b — Exoplanet Profile | ExoplanetHub');
    expect(metadata.description).toContain("1.63\u00d7 Earth's radius");
  });

  // Both entry points resolve to the same key, which is what lets planetDetail's cache() serve
  // the title and the body from one GetItem.
  it('asks for the same planet when titling as when rendering', async () => {
    getPlanetDetail.mockResolvedValue(KEPLER_452B);
    const params = Promise.resolve({ name: 'Kepler-452%20b' });

    await generateMetadata({ params });
    render(await PlanetPage({ params }));

    expect(getPlanetDetail.mock.calls).toEqual([['Kepler-452 b'], ['Kepler-452 b']]);
  });

  it('describes the 404 for an unstocked name instead of throwing', async () => {
    getPlanetDetail.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'Definitely%20Not%20A%20Planet%20b' }),
    });

    expect(metadata.title).toBe('Planet not found | ExoplanetHub');
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it('describes the 404 for a malformed segment without reading the table', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ name: '%ZZ' }) });

    expect(metadata.title).toBe('Planet not found | ExoplanetHub');
    expect(getPlanetDetail).not.toHaveBeenCalled();
  });
});
