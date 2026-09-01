import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ALPHA,
  announcement,
  cardNames,
  emptyState,
  makePlanet,
  renderExplore,
  resultsCount,
  searchBox,
  showGrid,
  tableNames,
  viewButton,
} from './exploreTestUtils';

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

    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    expect(resultsCount()).toHaveTextContent('100 of 120 planets');
  });

  // Back/Forward changes the filters without going through the reset, leaving the page behind.
  it('never leaves the visitor on a page past the end of the results', async () => {
    const { user, navigateTo } = renderExplore(many);
    await goToPage2(user);

    navigateTo('q=Planet 007');

    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
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

  // The empty state replaces the list, so there is no page to be stranded on — and clearing
  // has to land back on page 1 rather than the page the visitor left.
  it('drops the grid paging while nothing matches and returns to page 1 after clearing', async () => {
    const { user } = renderExplore(many);
    await showGrid(user);
    await goToPage2(user);

    await user.type(searchBox(), 'no such planet');
    expect(emptyState()).toBeInTheDocument();
    expect(screen.queryByText(/page 1 of 1/i)).toBeNull();
    expect(screen.queryAllByRole('heading', { level: 3 })).toEqual([]);

    await user.click(screen.getByRole('button', { name: /clear all filters/i }));

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });
});

describe('ExploreClient results count', () => {
  it('counts the whole fetched list, not just the page on screen', () => {
    const many = Array.from({ length: 120 }, (_, i) =>
      makePlanet({ pl_name: `Planet ${String(i).padStart(3, '0')}` })
    );
    renderExplore(many);

    expect(resultsCount()).toHaveTextContent('120 of 120 planets');
  });

  it('narrows the first number as a filter bites, leaving the total alone', async () => {
    const { user } = renderExplore();
    expect(resultsCount()).toHaveTextContent('3 of 3 planets');

    await user.type(searchBox(), 'beta');

    expect(resultsCount()).toHaveTextContent('1 of 3 planets');
  });

  it('waits for typing to settle before announcing, so it does not read every keystroke', () => {
    vi.useFakeTimers();
    renderExplore();
    expect(announcement()).toHaveTextContent('Showing 3 of 3 planets');

    fireEvent.change(searchBox(), { target: { value: 'beta' } });

    expect(resultsCount()).toHaveTextContent('1 of 3 planets');
    expect(announcement()).toHaveTextContent('Showing 3 of 3 planets');

    act(() => vi.advanceTimersByTime(1000));

    expect(announcement()).toHaveTextContent('Showing 1 of 3 planets');
  });

  it('keeps counting while nothing matches, rather than disappearing with the list', async () => {
    const { user } = renderExplore();

    await user.type(searchBox(), 'no such planet');

    expect(resultsCount()).toHaveTextContent('0 of 3 planets');
  });
});

describe('ExploreClient view toggle', () => {
  it('reports which view is active, rather than signalling it by colour alone', async () => {
    const { user } = renderExplore([ALPHA]);

    expect(viewButton('Table')).toHaveAttribute('aria-pressed', 'true');
    expect(viewButton('Grid')).toHaveAttribute('aria-pressed', 'false');

    await showGrid(user);

    expect(viewButton('Grid')).toHaveAttribute('aria-pressed', 'true');
    expect(viewButton('Table')).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens the planet dialog from the table, the default view', async () => {
    const { user } = renderExplore([ALPHA]);

    await user.click(screen.getByRole('button', { name: 'Alpha b' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Alpha b');
  });
});
