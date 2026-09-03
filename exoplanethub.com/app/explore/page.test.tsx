import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanetSummary } from '@/lib/mockPlanets';
import ExplorePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(),
}));

const KEPLER: PlanetSummary = {
  pl_name: 'Kepler-186 f',
  hostname: 'Kepler-186',
  sy_dist: 178,
  discoverymethod: 'Transit',
  disc_year: 2014,
  pl_orbper: 129.9,
  pl_rade: 1.17,
  pl_bmasse: 1.71,
  pl_eqt: 188,
  st_teff: 3755,
};

function respondWith(payload: unknown) {
  return vi.fn().mockResolvedValue({ json: () => Promise.resolve(payload) });
}

function errorPanel() {
  return screen.queryByRole('alert');
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ExplorePage', () => {
  it('shows the loader until the archive arrives, then hands over to the explorer', async () => {
    vi.stubGlobal('fetch', respondWith([KEPLER]));
    render(<ExplorePage />);

    expect(screen.getByText(/loading exoplanets/i)).toBeInTheDocument();

    expect(await screen.findByText('Kepler-186 f')).toBeInTheDocument();
    expect(errorPanel()).toBeNull();
  });

  // The explorer reads an empty list as an empty archive, so a failure must never reach it.
  it.each([
    ['the request fails', () => vi.fn().mockRejectedValue(new Error('offline'))],
    ['the endpoint answers with an error body', () => respondWith({ error: 'Failed to fetch planets' })],
  ])('says the archive would not load when %s, rather than that it is empty', async (_label, mock) => {
    vi.stubGlobal('fetch', mock());
    render(<ExplorePage />);

    expect(await screen.findByText(/couldn.t load the exoplanet archive/i)).toBeInTheDocument();
    expect(screen.queryByText(/no planets to show/i)).toBeNull();
    expect(screen.queryByRole('textbox', { name: /search/i })).toBeNull();
  });

  it('shows the loader again while a retry is in flight, then the archive it reached', async () => {
    const user = userEvent.setup();
    let answerRetry: (response: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockReturnValueOnce(new Promise((resolve) => (answerRetry = resolve)))
    );
    render(<ExplorePage />);
    await screen.findByRole('button', { name: /try again/i });

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText(/loading exoplanets/i)).toBeInTheDocument();
    expect(errorPanel()).toBeNull();

    answerRetry({ json: () => Promise.resolve([KEPLER]) });

    expect(await screen.findByText('Kepler-186 f')).toBeInTheDocument();
  });
});
