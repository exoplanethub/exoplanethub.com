import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanetSummary } from '@/lib/mockPlanets';
import ExploreClient from './ExploreClient';

const replace = vi.fn();
let query = '';

// Stable, as the real useRouter is: a fresh object each render hides missing effect deps.
const router = { replace };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(query),
}));

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

const ALPHA = makePlanet({ pl_name: 'Alpha b', hostname: 'Ross 128', disc_year: 2015, pl_rade: 3 });
const BETA = makePlanet({ pl_name: 'Beta c', hostname: 'Kepler-186', disc_year: 2021, pl_rade: 1, discoverymethod: 'Radial Velocity' });
const GAMMA = makePlanet({ pl_name: 'Gamma d', hostname: 'Wolf 359', disc_year: 2008, pl_rade: 2 });

function renderExplore(planets: PlanetSummary[] = [ALPHA, BETA, GAMMA]) {
  const { rerender } = render(<ExploreClient planets={planets} />);

  return {
    user: userEvent.setup(),
    navigateTo(next: string) {
      query = next;
      rerender(<ExploreClient planets={planets} />);
    },
  };
}

function tableNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
}

function cardNames() {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
}

function searchBox() {
  return screen.getByRole('textbox', { name: /search by planet or host star/i });
}

function sortHeader(name: RegExp) {
  return screen.getByRole('columnheader', { name });
}

async function showGrid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Grid' }));
}

beforeEach(() => {
  replace.mockClear();
  query = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ExploreClient filtering', () => {
  it('filters the table as the visitor types', async () => {
    const { user } = renderExplore();

    await user.type(searchBox(), 'beta');

    expect(tableNames()).toEqual(['Beta c']);
  });

  it('filters the grid by the same search, which it used to ignore', async () => {
    const { user } = renderExplore();

    await user.type(searchBox(), 'wolf');
    await showGrid(user);

    expect(cardNames()).toEqual(['Gamma d']);
  });

  it('keeps one search box across both views, so switching view never drops the filter', async () => {
    const { user } = renderExplore();

    await user.type(searchBox(), 'beta');
    await showGrid(user);

    expect(searchBox()).toHaveValue('beta');
    expect(cardNames()).toEqual(['Beta c']);
  });

  // Whatever the URL asks for is what gets filtered, so the select has to be able to say so.
  it('shows a method the data does not contain rather than mislabelling it "All Types"', () => {
    query = 'method=Astrometry';
    renderExplore();

    expect(screen.getByRole('combobox', { name: /discovery method/i })).toHaveValue('Astrometry');
    expect(tableNames()).toEqual([]);
  });

  it('offers the discovery methods present in the data and applies the chosen one', async () => {
    const { user } = renderExplore();

    await user.selectOptions(screen.getByRole('combobox', { name: /discovery method/i }), 'Radial Velocity');

    expect(tableNames()).toEqual(['Beta c']);
  });
});

describe('ExploreClient URL state', () => {
  it('reproduces both the filtered set and its ordering from a shared URL', () => {
    query = 'q=o&sort=pl_rade.asc';
    renderExplore();

    expect(tableNames()).toEqual(['Gamma d', 'Alpha b']);
  });

  // fireEvent rather than userEvent: userEvent's own timers deadlock against vi's fake ones.
  it('replaces rather than pushes, so Back does not step through the search', () => {
    vi.useFakeTimers();
    renderExplore();

    fireEvent.change(searchBox(), { target: { value: 'beta' } });
    vi.advanceTimersByTime(1000);

    expect(replace).toHaveBeenCalledExactlyOnceWith('/explore?q=beta', { scroll: false });
  });

  it('writes the chosen sort to the URL and leaves the default sort out of it', () => {
    vi.useFakeTimers();
    renderExplore();

    fireEvent.click(sortHeader(/radius/i));
    vi.advanceTimersByTime(1000);
    expect(replace).toHaveBeenLastCalledWith('/explore?sort=pl_rade.desc', { scroll: false });

    fireEvent.click(sortHeader(/discovered/i));
    vi.advanceTimersByTime(1000);
    expect(replace).toHaveBeenLastCalledWith('/explore', { scroll: false });
  });

  it('keeps the sort indicator on the column the rows are actually ordered by after Back', () => {
    query = 'sort=pl_rade.asc';
    const { navigateTo } = renderExplore();
    expect(sortHeader(/radius/i)).toHaveTextContent('▲');

    navigateTo('');

    expect(sortHeader(/radius/i)).not.toHaveTextContent(/[▲▼]/);
    expect(sortHeader(/discovered/i)).toHaveTextContent('▼');
    expect(tableNames()).toEqual(['Beta c', 'Alpha b', 'Gamma d']);
  });

  it.each([
    ['an unknown sort key', 'sort=nonsense.sideways'],
    ['an empty search', 'q='],
    ['params it does not own', 'utm_source=newsletter'],
  ])('renders the ordinary page for %s', (_label, badQuery) => {
    query = badQuery;
    renderExplore();

    expect(tableNames()).toEqual(['Beta c', 'Alpha b', 'Gamma d']);
  });
});

describe('ExploreClient pagination', () => {
  const many = Array.from({ length: 120 }, (_, i) =>
    makePlanet({ pl_name: `Planet ${String(i).padStart(3, '0')}`, disc_year: 2000 + i })
  );

  async function goToPage2(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /next/i }));
  }

  // Narrowed to 100 planets, so page 2 still exists and only an explicit reset can move off it.
  it('returns to the first page when the filter changes under a later page', async () => {
    const { user } = renderExplore(many);
    await goToPage2(user);
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

    await user.type(searchBox(), 'Planet 0');

    expect(screen.getByText(/page 1 of 2 \(100 planets\)/i)).toBeInTheDocument();
  });

  // Back/Forward changes the filters without going through the reset, leaving the page behind.
  it('never leaves the visitor on a page past the end of the results', async () => {
    const { user, navigateTo } = renderExplore(many);
    await goToPage2(user);

    navigateTo('q=Planet 007');

    expect(screen.getByText(/page 1 of 1 \(1 planets\)/i)).toBeInTheDocument();
    expect(tableNames()).toEqual(['Planet 007']);
  });

  // Previous used to read the page that was asked for rather than the one on screen, so once
  // the clamp was active it set the page straight back to where it already was.
  it('steps back from a clamped grid page instead of dead-clicking', async () => {
    const { user, navigateTo } = renderExplore(many);
    await showGrid(user);
    await goToPage2(user);
    await goToPage2(user);
    expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument();

    navigateTo('q=Planet 0');
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /previous/i }));

    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  // Both views page through one hook, so a second page size cannot creep back into either.
  it('keeps the same page window when the visitor switches view', async () => {
    const { user } = renderExplore(many);
    await goToPage2(user);
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(tableNames()).toHaveLength(50);

    await showGrid(user);

    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(cardNames()).toHaveLength(50);
  });

  it('clamps the grid to a single empty page when nothing matches', async () => {
    const { user } = renderExplore(many);
    await showGrid(user);
    await goToPage2(user);

    await user.type(searchBox(), 'no such planet');

    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { level: 3 })).toEqual([]);
  });
});
