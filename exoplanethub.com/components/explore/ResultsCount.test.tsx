import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ResultsCount from './ResultsCount';

function visibleText() {
  return screen.getByText(/^\d+ of \d+ planets$/i);
}

function announcement() {
  return screen.getByRole('status');
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ResultsCount', () => {
  it('shows how much of the archive survived the filters', () => {
    render(<ResultsCount visible={12} total={6000} />);

    expect(visibleText()).toBeInTheDocument();
    expect(visibleText()).toHaveTextContent('12 of 6000 planets');
  });

  it('keeps the seen number from being read twice by hiding it from the announcement', () => {
    render(<ResultsCount visible={12} total={6000} />);

    expect(visibleText()).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces the first count without waiting, so the page opens complete', () => {
    render(<ResultsCount visible={12} total={6000} />);

    expect(announcement()).toHaveTextContent('Showing 12 of 6000 planets');
  });

  it('holds the announcement back while the count is still moving', () => {
    vi.useFakeTimers();
    const { rerender } = render(<ResultsCount visible={12} total={6000} />);

    rerender(<ResultsCount visible={9} total={6000} />);
    act(() => vi.advanceTimersByTime(200));
    rerender(<ResultsCount visible={4} total={6000} />);

    expect(visibleText()).toHaveTextContent('4 of 6000 planets');
    expect(announcement()).toHaveTextContent('Showing 12 of 6000 planets');

    act(() => vi.advanceTimersByTime(1000));

    expect(announcement()).toHaveTextContent('Showing 4 of 6000 planets');
  });
});
