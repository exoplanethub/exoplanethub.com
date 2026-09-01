import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import rangeStyles from '@/components/explore/RangeFilter.module.css';
import type { PlanetSummary } from '@/lib/mockPlanets';
import ExploreClient from './ExploreClient';

export const replace = vi.fn();
let query = '';

// Stable, as the real useRouter is: a fresh object each render hides missing effect deps.
const router = { replace };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(query),
}));

// Only takes effect on the next render, so call it before renderExplore.
export function startAtUrl(search: string) {
  query = search;
}

export function makePlanet(overrides: Partial<PlanetSummary> & Pick<PlanetSummary, 'pl_name'>): PlanetSummary {
  return {
    hostname: 'Host',
    sy_dist: 10,
    discoverymethod: 'Transit',
    disc_year: 2000,
    pl_orbper: 10,
    pl_rade: 1,
    pl_bmasse: 1,
    pl_eqt: 1,
    st_teff: 5800,
    ...overrides,
  };
}

export const ALPHA = makePlanet({ pl_name: 'Alpha b', hostname: 'Ross 128', disc_year: 2015, pl_rade: 3, pl_bmasse: 30, pl_orbper: 1000 });
const BETA = makePlanet({ pl_name: 'Beta c', hostname: 'Kepler-186', disc_year: 2021, pl_rade: 1, pl_bmasse: 1, pl_orbper: 10, discoverymethod: 'Radial Velocity' });
const GAMMA = makePlanet({ pl_name: 'Gamma d', hostname: 'Wolf 359', disc_year: 2008, pl_rade: 2, pl_bmasse: 5, pl_orbper: 0.5 });

export function renderExplore(planets: PlanetSummary[] = [ALPHA, BETA, GAMMA]) {
  const { rerender } = render(<ExploreClient planets={planets} />);

  return {
    user: userEvent.setup(),
    navigateTo(next: string) {
      query = next;
      rerender(<ExploreClient planets={planets} />);
    },
  };
}

export function tableNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
}

export function cardNames() {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
}

export function searchBox() {
  return screen.getByRole('textbox', { name: /search by planet or host star/i });
}

export function sortHeader(name: RegExp) {
  return within(screen.getByRole('columnheader', { name })).getByRole('button', { name });
}

export function rangeGroup(name: RegExp) {
  return within(screen.getByRole('group', { name }));
}

// The rail is decorative, so it has no role to query by; its class is the only handle on it.
export function rangeRail(name: RegExp) {
  return screen.getByRole('group', { name }).querySelector(`.${rangeStyles.track}`);
}

export function boundInput(name: RegExp, edge: RegExp) {
  return rangeGroup(name).getByRole('spinbutton', { name: edge });
}

export function methodBox(name: string) {
  return within(screen.getByRole('group', { name: /discovery method/i })).getByRole('checkbox', {
    name,
  });
}

export function starBox(name: RegExp) {
  return within(screen.getByRole('group', { name: /star type/i })).getByRole('checkbox', { name });
}

export function resultsCount() {
  return screen.getByText(/^\d+ of \d+ planets$/i);
}

export function announcement() {
  return screen.getByRole('status');
}

export function emptyState() {
  return screen.queryByText(/no planets match these filters/i);
}

export async function showGrid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Grid' }));
}

export function viewButton(name: 'Grid' | 'Table') {
  return screen.getByRole('button', { name });
}

beforeEach(() => {
  replace.mockClear();
  query = '';
});

afterEach(() => {
  vi.useRealTimers();
});
