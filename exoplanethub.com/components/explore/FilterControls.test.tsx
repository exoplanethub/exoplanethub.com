import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlanetSummary } from '@/lib/mockPlanets';
import { DEFAULT_FILTERS, FilterState } from '@/lib/planetFilters';
import FilterControls from '@/components/explore/FilterControls';

function makePlanet(pl_name: string, discoverymethod: string | null): PlanetSummary {
  return {
    pl_name,
    hostname: 'Host',
    sy_dist: 10,
    discoverymethod,
    disc_year: 2000,
    pl_orbper: 1,
    pl_rade: 1,
    pl_bmasse: 1,
    pl_eqt: 300,
    st_teff: 5800,
  };
}

const PLANETS = [makePlanet('Alpha b', 'Transit'), makePlanet('Beta c', 'Imaging')];

// Astrometry is deliberately absent from PLANETS: only the URL can put its box on screen.
const URL_ONLY = 'Astrometry';

function renderControls(filters: Partial<FilterState> = {}) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const searchRef = createRef<HTMLInputElement>();
  const props = { planets: PLANETS, onChange, onClear, searchRef };
  const { rerender } = render(<FilterControls {...props} filters={{ ...DEFAULT_FILTERS, ...filters }} />);

  return {
    onChange,
    onClear,
    // The real page feeds the new state back through the URL; this stands in for that round trip.
    apply: (next: FilterState) => rerender(<FilterControls {...props} filters={next} />),
  };
}

function group(name: RegExp) {
  return within(screen.getByRole('group', { name }));
}

function methodBox(name: string) {
  return group(/discovery method/i).getByRole('checkbox', { name });
}

function starBox(name: RegExp) {
  return group(/star type/i).getByRole('checkbox', { name });
}

function clearAll() {
  return screen.getByRole('button', { name: /clear all/i });
}

describe('FilterControls discovery method', () => {
  it('offers a box for every method the data carries', () => {
    renderControls();

    expect(
      group(/discovery method/i)
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual(['Imaging', 'Transit']);
  });

  it('offers a box for a method only the URL names, so a shared link shows what it filters by', () => {
    renderControls({ methods: [URL_ONLY] });

    expect(methodBox(URL_ONLY)).toBeChecked();
  });

  it('keeps focus on a URL-only method after unticking it', async () => {
    const user = userEvent.setup();
    const { onChange, apply } = renderControls({ methods: [URL_ONLY] });

    await user.click(methodBox(URL_ONLY));
    apply(onChange.mock.calls[0][0]);

    expect(methodBox(URL_ONLY)).toHaveFocus();
  });

  it('leaves a URL-only method on offer once unticked, so the choice can be undone', async () => {
    const user = userEvent.setup();
    const { onChange, apply } = renderControls({ methods: [URL_ONLY] });

    await user.click(methodBox(URL_ONLY));
    apply(onChange.mock.calls[0][0]);
    expect(methodBox(URL_ONLY)).not.toBeChecked();

    await user.click(methodBox(URL_ONLY));

    expect(onChange.mock.calls[1][0].methods).toEqual([URL_ONLY]);
  });

  it('adds a method the URL names later without dropping the ones already on screen', () => {
    const { apply } = renderControls();

    apply({ ...DEFAULT_FILTERS, methods: [URL_ONLY] });

    expect(methodBox(URL_ONLY)).toBeChecked();
    expect(methodBox('Transit')).toBeInTheDocument();
  });
});

describe('FilterControls star type', () => {
  it('offers all seven classes hottest first, whatever the data happens to contain', () => {
    renderControls();

    expect(
      group(/star type/i)
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual([
      'O — blue',
      'B — blue-white',
      'A — white',
      'F — yellow-white',
      'G — sun-like',
      'K — orange dwarf',
      'M — red dwarf',
    ]);
  });

  it('checks the classes the filter names and leaves the rest alone', () => {
    renderControls({ starClasses: ['M'] });

    expect(starBox(/red dwarf/i)).toBeChecked();
    expect(starBox(/sun-like/i)).not.toBeChecked();
  });

  it('reports a tick as a selection of that class', async () => {
    const user = userEvent.setup();
    const { onChange } = renderControls();

    await user.click(starBox(/sun-like/i));

    expect(onChange.mock.calls[0][0].starClasses).toEqual(['G']);
  });

  it('reports an untick as a deselection', async () => {
    const user = userEvent.setup();
    const { onChange } = renderControls({ starClasses: ['G', 'M'] });

    await user.click(starBox(/sun-like/i));

    expect(onChange.mock.calls[0][0].starClasses).toEqual(['M']);
  });

  it('says which planets a live star filter is hiding, and says nothing while it is inactive', () => {
    const { apply } = renderControls({ starClasses: ['G'] });
    expect(group(/star type/i).getByText(/unclassified/i)).toBeInTheDocument();

    apply(DEFAULT_FILTERS);

    expect(group(/star type/i).queryByText(/unclassified/i)).toBeNull();
  });

  it('points the fieldset at the note explaining the exclusion it caused', () => {
    renderControls({ starClasses: ['G'] });
    const note = group(/star type/i).getByText(/unclassified/i);

    expect(screen.getByRole('group', { name: /star type/i })).toHaveAttribute(
      'aria-describedby',
      note.id,
    );
  });

  // A star the filter would hide is exactly the one whose box must stay reachable to undo it.
  it('keeps focus on a class box after unticking it', async () => {
    const user = userEvent.setup();
    const { onChange, apply } = renderControls({ starClasses: ['M'] });

    await user.click(starBox(/red dwarf/i));
    apply(onChange.mock.calls[0][0]);

    expect(starBox(/red dwarf/i)).toHaveFocus();
  });
});

describe('FilterControls clear all', () => {
  it('offers nothing to clear on the default view', () => {
    renderControls();

    expect(clearAll()).toBeDisabled();
  });

  it.each([
    ['a search', { q: 'kepler' }],
    ['a method', { methods: ['Transit'] }],
    ['a star class', { starClasses: ['G' as const] }],
    ['a range', { ranges: { ...DEFAULT_FILTERS.ranges, radius: { min: 1, max: null } } }],
  ])('becomes clearable once the visitor has set %s', (_label, active) => {
    renderControls(active);

    expect(clearAll()).toBeEnabled();
  });

  // Sort reorders the page rather than hiding anything, so there is nothing for it to clear.
  it('stays unclearable under a non-default sort alone', () => {
    renderControls({ sortKey: 'esi', sortOrder: 'asc' });

    expect(clearAll()).toBeDisabled();
  });

  it('asks the page to clear rather than editing the filters itself', async () => {
    const user = userEvent.setup();
    const { onChange, onClear } = renderControls({ q: 'kepler' });

    await user.click(clearAll());

    expect(onClear).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
});
