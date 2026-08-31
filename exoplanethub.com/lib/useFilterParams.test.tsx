import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS, type FilterState } from '@/lib/planetFilters';
import { useFilterParams } from '@/lib/useFilterParams';

const replace = vi.fn();
let query = '';

// Stable, as the real useRouter is: a fresh object each render hides missing effect deps.
const router = { replace };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(query),
}));

const seen: FilterState[] = [];

function Harness() {
  const [filters, update] = useFilterParams();
  const [, bump] = useState(0);
  seen.push(filters);

  return (
    <>
      <button onClick={() => bump((n) => n + 1)}>rerender</button>
      <output data-testid="state">{`${filters.q}|${filters.method ?? '-'}|${filters.sortKey}.${filters.sortOrder}`}</output>
      <button onClick={() => update({ ...filters, q: 'wolf' })}>search wolf</button>
      <button onClick={() => update({ ...filters, q: 'ross' })}>search ross</button>
      <button onClick={() => update({ ...filters, q: 'wolf 3' })}>search wolf 3</button>
      <button onClick={() => update({ ...filters, sortKey: 'pl_rade', sortOrder: 'asc' })}>sort radius</button>
      <button onClick={() => update(DEFAULT_FILTERS)}>reset</button>
    </>
  );
}

function mountAt(initialQuery: string) {
  query = initialQuery;
  const { rerender } = render(<Harness />);

  return {
    navigateTo(next: string) {
      query = next;
      rerender(<Harness />);
    },
  };
}

function state() {
  return screen.getByTestId('state').textContent;
}

function press(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function flushDebounce() {
  vi.advanceTimersByTime(1000);
}

// Long enough for a queued write to dispatch, but not for the navigation it starts to commit.
function dispatchWrite() {
  vi.advanceTimersByTime(300);
}

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
  seen.length = 0;
  query = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useFilterParams', () => {
  it('starts from the filters already in the URL', () => {
    mountAt('q=kepler&sort=pl_rade.asc');

    expect(state()).toBe('kepler|-|pl_rade.asc');
  });

  it('reflects a change immediately, so typing is never held up by the URL write', () => {
    mountAt('');

    press('search wolf');

    expect(state()).toBe('wolf|-|disc_year.desc');
    expect(replace).not.toHaveBeenCalled();
  });

  it('writes the URL once the changes stop', () => {
    mountAt('');

    press('search wolf');
    flushDebounce();

    expect(replace).toHaveBeenCalledExactlyOnceWith('/explore?q=wolf', { scroll: false });
  });

  it('holds the write open while changes keep arriving', () => {
    mountAt('');

    press('search wolf');
    vi.advanceTimersByTime(200);
    press('search ross');
    vi.advanceTimersByTime(200);
    expect(replace).not.toHaveBeenCalled();

    flushDebounce();

    expect(replace).toHaveBeenCalledExactlyOnceWith('/explore?q=ross', { scroll: false });
  });

  it('hands back the same filter object until the filters actually change, so callers can memoise on it', () => {
    mountAt('q=kepler');
    const first = seen.at(-1);

    press('rerender');

    expect(seen.at(-1)).toBe(first);
  });

  it('collapses a burst of changes into a single write, so Back does not step through keystrokes', () => {
    mountAt('');

    press('search wolf');
    press('search ross');
    press('sort radius');
    flushDebounce();

    expect(replace).toHaveBeenCalledExactlyOnceWith('/explore?q=ross&sort=pl_rade.asc', { scroll: false });
  });

  it('drops the query string entirely when the filters return to their defaults', () => {
    mountAt('q=kepler');

    press('reset');
    flushDebounce();

    expect(replace).toHaveBeenCalledExactlyOnceWith('/explore', { scroll: false });
  });

  it('adopts filters the URL gained elsewhere, which is what Back and Forward do', () => {
    const { navigateTo } = mountAt('q=kepler');

    navigateTo('sort=esi.desc');

    expect(state()).toBe('|-|esi.desc');
  });

  it('abandons a pending write when the URL moves underneath it', () => {
    const { navigateTo } = mountAt('');

    press('search wolf');
    navigateTo('q=kepler');
    flushDebounce();

    expect(state()).toBe('kepler|-|disc_year.desc');
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not fight the URL it just wrote', () => {
    const { navigateTo } = mountAt('');

    press('search wolf');
    flushDebounce();
    navigateTo('q=wolf');

    expect(state()).toBe('wolf|-|disc_year.desc');
    expect(replace).toHaveBeenCalledOnce();
  });

  // A statically prerendered /explore renders with no params and only sees them after hydration.
  it('picks up params that arrive after the first render without writing them back', () => {
    const { navigateTo } = mountAt('');

    navigateTo('q=kepler&sort=esi.asc');
    flushDebounce();

    expect(state()).toBe('kepler|-|esi.asc');
    expect(replace).not.toHaveBeenCalled();
  });

  // router.replace commits asynchronously, so every keystroke in that window used to be dropped:
  // the edit died with the arriving URL and its queued write was cancelled along with it.
  it('keeps typing that arrives while a write of its own is still in flight', () => {
    const { navigateTo } = mountAt('');

    press('search wolf');
    dispatchWrite();
    press('search wolf 3');
    navigateTo('q=wolf');

    expect(state()).toBe('wolf 3|-|disc_year.desc');

    flushDebounce();

    expect(replace).toHaveBeenLastCalledWith('/explore?q=wolf+3', { scroll: false });
  });

  // Typing fast enough leaves more than one write outstanding; each must be recognised as ours.
  it('keeps the edit while several of its own writes land in turn', () => {
    const { navigateTo } = mountAt('');

    press('search wolf');
    dispatchWrite();
    press('search ross');
    dispatchWrite();
    press('search wolf 3');

    navigateTo('q=wolf');
    expect(state()).toBe('wolf 3|-|disc_year.desc');
    navigateTo('q=ross');
    expect(state()).toBe('wolf 3|-|disc_year.desc');

    flushDebounce();

    expect(replace).toHaveBeenLastCalledWith('/explore?q=wolf+3', { scroll: false });
  });

  // A write can be dispatched and then overtaken, leaving a URL this hook asked for but never
  // saw. Arriving there later is someone else's navigation and must not keep the edit alive.
  it('does not claim a Back as its own just because it once asked for that URL', () => {
    const { navigateTo } = mountAt('');

    press('search wolf');
    dispatchWrite();
    navigateTo('sort=esi.desc');
    press('search wolf 3');
    navigateTo('q=wolf');

    expect(state()).toBe('wolf|-|disc_year.desc');
  });

  it('still yields to a Back that arrives while typing continues', () => {
    const { navigateTo } = mountAt('');

    press('search wolf');
    dispatchWrite();
    press('search wolf 3');
    navigateTo('sort=esi.desc');

    expect(state()).toBe('|-|esi.desc');

    flushDebounce();

    expect(replace).toHaveBeenCalledExactlyOnceWith('/explore?q=wolf', { scroll: false });
  });

  it('ignores params it does not own, leaving the filters at their defaults', () => {
    mountAt('utm_source=newsletter');

    expect(state()).toBe('|-|disc_year.desc');
    expect(replace).not.toHaveBeenCalled();
  });
});
