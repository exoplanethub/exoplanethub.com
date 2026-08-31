import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import rangeStyles from '@/components/explore/RangeFilter.module.css';
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
    pl_orbper: 10,
    pl_rade: 1,
    pl_bmasse: 1,
    pl_eqt: 1,
    ...overrides,
  };
}

const ALPHA = makePlanet({ pl_name: 'Alpha b', hostname: 'Ross 128', disc_year: 2015, pl_rade: 3, pl_bmasse: 30, pl_orbper: 1000 });
const BETA = makePlanet({ pl_name: 'Beta c', hostname: 'Kepler-186', disc_year: 2021, pl_rade: 1, pl_bmasse: 1, pl_orbper: 10, discoverymethod: 'Radial Velocity' });
const GAMMA = makePlanet({ pl_name: 'Gamma d', hostname: 'Wolf 359', disc_year: 2008, pl_rade: 2, pl_bmasse: 5, pl_orbper: 0.5 });

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

function rangeGroup(name: RegExp) {
  return within(screen.getByRole('group', { name }));
}

// The rail is decorative, so it has no role to query by; its class is the only handle on it.
function rangeRail(name: RegExp) {
  return screen.getByRole('group', { name }).querySelector(`.${rangeStyles.track}`);
}

function boundInput(name: RegExp, edge: RegExp) {
  return rangeGroup(name).getByRole('spinbutton', { name: edge });
}

function methodBox(name: string) {
  return within(screen.getByRole('group', { name: /discovery method/i })).getByRole('checkbox', {
    name,
  });
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

  // Whatever the URL asks for is what gets filtered, so the checkboxes have to be able to say so.
  it('offers a box for a method the data does not contain, checked, rather than hiding it', () => {
    query = 'method=Astrometry';
    renderExplore();

    expect(methodBox('Astrometry')).toBeChecked();
    expect(tableNames()).toEqual([]);
  });

  it('offers the discovery methods present in the data and applies the chosen one', async () => {
    const { user } = renderExplore();

    expect(methodBox('Transit')).not.toBeChecked();
    await user.click(methodBox('Radial Velocity'));

    expect(tableNames()).toEqual(['Beta c']);
  });

  it('widens rather than narrows the results as more methods are ticked', async () => {
    const { user } = renderExplore();

    await user.click(methodBox('Radial Velocity'));
    expect(tableNames()).toEqual(['Beta c']);

    await user.click(methodBox('Transit'));
    expect(tableNames()).toEqual(['Beta c', 'Alpha b', 'Gamma d']);
  });

  it('restores every ticked method from a shared URL', () => {
    query = 'method=Radial%20Velocity,Transit';
    renderExplore();

    expect(methodBox('Radial Velocity')).toBeChecked();
    expect(methodBox('Transit')).toBeChecked();
    expect(tableNames()).toEqual(['Beta c', 'Alpha b', 'Gamma d']);
  });

  it('drops a method the visitor unticks from the results', async () => {
    query = 'method=Radial%20Velocity,Transit';
    const { user } = renderExplore();

    await user.click(methodBox('Transit'));

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

  it('writes every ticked method to one comma-separated param', () => {
    vi.useFakeTimers();
    renderExplore();

    fireEvent.click(methodBox('Transit'));
    vi.advanceTimersByTime(1000);
    expect(replace).toHaveBeenLastCalledWith('/explore?method=Transit', { scroll: false });

    fireEvent.click(methodBox('Radial Velocity'));
    vi.advanceTimersByTime(1000);
    expect(replace).toHaveBeenLastCalledWith('/explore?method=Radial+Velocity%2CTransit', { scroll: false });

    fireEvent.click(methodBox('Transit'));
    vi.advanceTimersByTime(1000);
    expect(replace).toHaveBeenLastCalledWith('/explore?method=Radial+Velocity', { scroll: false });
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

describe('ExploreClient shared ordering', () => {
  // 120 planets whose alphabetical order is the reverse of their discovery order, so a page of
  // one ordering can never coincidentally match the same page of the other.
  const many = Array.from({ length: 120 }, (_, i) =>
    makePlanet({ pl_name: `Planet ${String(119 - i).padStart(3, '0')}`, disc_year: 2000 + i })
  );

  it('orders the grid by ?sort=, which it used to ignore', async () => {
    query = 'sort=pl_name.asc';
    const { user } = renderExplore(many);
    await showGrid(user);

    expect(cardNames()!.slice(0, 3)).toEqual(['Planet 000', 'Planet 001', 'Planet 002']);
  });

  // The promise a shared URL makes: the recipient sees the set the sender saw, in that order.
  it.each([
    ['the default sort', ''],
    ['a sort the URL asks for', 'sort=pl_name.asc'],
    ['a sort applied over a filter', 'q=Planet 0&sort=pl_name.asc'],
  ])('shows the same planets on grid page 2 as on table page 2 under %s', async (_label, shared) => {
    query = shared;
    const { user } = renderExplore(many);
    await user.click(screen.getByRole('button', { name: /next/i }));
    const fromTable = tableNames();

    await showGrid(user);

    expect(fromTable).toHaveLength(50);
    expect(cardNames()).toEqual(fromTable);
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

describe('ExploreClient range filters', () => {
  it.each([
    ['radius', 'radius=2..3', ['Alpha b', 'Gamma d']],
    ['mass', 'mass=..5', ['Beta c', 'Gamma d']],
    ['orbital period', 'period=1..365', ['Beta c']],
  ])('filters the table by %s from the URL', (_label, badQuery, expected) => {
    query = badQuery;
    renderExplore();

    expect(tableNames().sort()).toEqual(expected);
  });

  it('filters the grid by the same range, so both views agree', async () => {
    query = 'period=1..365';
    const { user } = renderExplore();

    await showGrid(user);

    expect(cardNames()).toEqual(['Beta c']);
  });

  it('shows the bounds from the URL in the number inputs, so a shared link is editable', () => {
    query = 'radius=0.5..2';
    renderExplore();

    expect(boundInput(/radius/i, /min/i)).toHaveValue(0.5);
    expect(boundInput(/radius/i, /max/i)).toHaveValue(2);
  });

  it('leaves the inputs empty for an end the URL omits', () => {
    query = 'mass=..10';
    renderExplore();

    expect(boundInput(/mass/i, /min/i)).toHaveValue(null);
    expect(boundInput(/mass/i, /max/i)).toHaveValue(10);
  });

  it('writes a bound the visitor types to the URL', () => {
    vi.useFakeTimers();
    renderExplore();

    fireEvent.change(boundInput(/radius/i, /min/i), { target: { value: '2' } });
    vi.advanceTimersByTime(1000);

    expect(replace).toHaveBeenCalledExactlyOnceWith('/explore?radius=2..', { scroll: false });
  });

  it('drops the range from the URL again once both bounds are cleared', () => {
    vi.useFakeTimers();
    query = 'radius=2..';
    renderExplore();

    fireEvent.change(boundInput(/radius/i, /min/i), { target: { value: '' } });
    vi.advanceTimersByTime(1000);

    expect(replace).toHaveBeenLastCalledWith('/explore', { scroll: false });
  });

  it('keeps the range when Back returns to it, filtering by whatever the URL now says', () => {
    query = 'radius=2..3';
    const { navigateTo } = renderExplore();
    expect(tableNames().sort()).toEqual(['Alpha b', 'Gamma d']);

    navigateTo('radius=..1');

    expect(tableNames()).toEqual(['Beta c']);
    expect(boundInput(/radius/i, /max/i)).toHaveValue(1);
  });

  it.each([
    ['a bound that is not a number', 'radius=small..2'],
    ['a range with no separator', 'radius=2'],
    ['an empty range', 'period='],
  ])('renders the ordinary unfiltered page for %s', (_label, badQuery) => {
    query = badQuery;
    renderExplore();

    expect(tableNames()).toEqual(['Beta c', 'Alpha b', 'Gamma d']);
  });

  it('says which planets a live range is hiding, and says nothing while it is inactive', () => {
    query = 'mass=1..10';
    const { navigateTo } = renderExplore();
    expect(rangeGroup(/mass/i).getByText(/without a measured mass are hidden/i)).toBeInTheDocument();
    expect(rangeGroup(/radius/i).queryByText(/hidden/i)).toBeNull();

    navigateTo('');

    expect(rangeGroup(/mass/i).queryByText(/hidden/i)).toBeNull();
  });

  it('points the visitor at the note explaining the exclusion from the input that caused it', () => {
    query = 'mass=1..10';
    renderExplore();

    const note = rangeGroup(/mass/i).getByText(/without a measured mass are hidden/i);

    expect(boundInput(/mass/i, /min/i)).toHaveAttribute('aria-describedby', note.id);
  });

  it('offers a slider per bound, spanning the measurements actually present', () => {
    renderExplore();
    const sliders = rangeGroup(/orbital period/i).getAllByRole('slider');

    expect(sliders).toHaveLength(2);
    expect(rangeGroup(/orbital period/i).getByRole('spinbutton', { name: /min/i })).toHaveAttribute(
      'placeholder',
      '0.5'
    );
    expect(rangeGroup(/orbital period/i).getByRole('spinbutton', { name: /max/i })).toHaveAttribute(
      'placeholder',
      '1000'
    );
  });

  it('drops the slider but keeps the number inputs when nothing was measured', () => {
    renderExplore([makePlanet({ pl_name: 'Blank', pl_bmasse: null })]);

    expect(rangeGroup(/mass/i).queryAllByRole('slider')).toEqual([]);
    expect(rangeGroup(/mass/i).getByRole('spinbutton', { name: /min/i })).toBeInTheDocument();
  });

  it('moves the filter when a slider moves, so keyboard use of the track really filters', () => {
    query = 'radius=1..3';
    renderExplore();
    const [lower] = rangeGroup(/radius/i).getAllByRole('slider');

    fireEvent.change(lower, { target: { value: '1000' } });

    expect(tableNames()).toEqual(['Alpha b']);
  });

  it('parks a dragged thumb at its neighbour rather than letting the bounds cross', () => {
    query = 'radius=1..2';
    renderExplore();

    fireEvent.change(rangeGroup(/radius/i).getAllByRole('slider')[0], { target: { value: '1000' } });

    expect(boundInput(/radius/i, /min/i)).toHaveValue(2);
    expect(boundInput(/radius/i, /max/i)).toHaveValue(2);
  });

  it('announces each thumb as a measurement, not as a position on the log track', () => {
    query = 'period=10..';
    renderExplore();
    const [lower, upper] = rangeGroup(/orbital period/i).getAllByRole('slider');

    expect(lower.getAttribute('value')).not.toBe('10');
    expect(lower).toHaveAttribute('aria-valuetext', '10 days');
    expect(upper).toHaveAttribute('aria-valuetext', '1000 days');

    fireEvent.change(lower, { target: { value: '0' } });

    expect(rangeGroup(/orbital period/i).getAllByRole('slider')[0]).toHaveAttribute(
      'aria-valuetext',
      '0.5 days'
    );
  });

  // A range input with min === max paints its thumb at the left end whatever its value, which
  // drew "radius at least 3" as the entire track selected.
  it.each(['radius=3..3', 'radius=1..1'])(
    'never collapses a thumb with both bounds on one measurement (%s)',
    (range) => {
      query = range;
      renderExplore();

      for (const thumb of rangeGroup(/radius/i).getAllByRole('slider')) {
        expect(thumb.getAttribute('min')).not.toBe(thumb.getAttribute('max'));
      }
    }
  );

  it('raises the lower thumb where they stack, so the pointer reaches the one that can move', () => {
    query = 'radius=3..';
    renderExplore();
    const [lower, upper] = rangeGroup(/radius/i).getAllByRole('slider');

    expect(lower.getAttribute('value')).toBe(upper.getAttribute('value'));
    expect(lower.style.zIndex).toBe('1');
  });

  it('leaves the thumbs in document order while they sit apart', () => {
    query = 'radius=1..3';
    renderExplore();

    expect(rangeGroup(/radius/i).getAllByRole('slider')[0].style.zIndex).toBe('');
  });

  it('drops the thumbs when the bounds cross, rather than drawing the range they swap into', () => {
    query = 'radius=3..1';
    renderExplore();

    expect(rangeGroup(/radius/i).queryAllByRole('slider')).toEqual([]);
    expect(boundInput(/radius/i, /min/i)).toHaveValue(3);
    expect(boundInput(/radius/i, /max/i)).toHaveValue(1);
  });

  // Typing a max crosses the bounds on the first keystroke for most entries, so an unmounted rail
  // would jerk the card and everything under it on nearly every edit.
  it('keeps the rail through a crossing, so the card holds its height while a bound is typed', () => {
    query = 'radius=1..';
    const { navigateTo } = renderExplore();
    expect(rangeRail(/radius/i)).toBeInTheDocument();

    navigateTo('radius=3..1');

    expect(rangeRail(/radius/i)).toBeInTheDocument();
  });

  // Narrowed to 100 planets, so page 2 still exists and only an explicit reset can move off it.
  it('returns to the first page when a range narrows the results under a later page', async () => {
    const many = Array.from({ length: 120 }, (_, i) =>
      makePlanet({ pl_name: `Planet ${String(i).padStart(3, '0')}`, pl_rade: i + 1 })
    );
    const { user } = renderExplore(many);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

    fireEvent.change(boundInput(/radius/i, /max/i), { target: { value: '100' } });

    expect(screen.getByText(/page 1 of 2 \(100 planets\)/i)).toBeInTheDocument();
  });
});
