import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  cardNames,
  makePlanet,
  methodBox,
  renderExplore,
  replace,
  searchBox,
  showGrid,
  sortHeader,
  startAtUrl,
  tableNames,
} from './exploreTestUtils';

describe('ExploreClient URL state', () => {
  it('reproduces both the filtered set and its ordering from a shared URL', () => {
    startAtUrl('q=o&sort=pl_rade.asc');
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
    startAtUrl('sort=pl_rade.asc');
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
    startAtUrl(badQuery);
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
    startAtUrl('sort=pl_name.asc');
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
    startAtUrl(shared);
    const { user } = renderExplore(many);
    await user.click(screen.getByRole('button', { name: /next/i }));
    const fromTable = tableNames();

    await showGrid(user);

    expect(fromTable).toHaveLength(50);
    expect(cardNames()).toEqual(fromTable);
  });
});
