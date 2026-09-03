import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PaginationControls from '@/components/explore/PaginationControls';
import { usePagination } from '@/lib/usePagination';

function Harness({ itemCount, itemsPerPage }: { itemCount: number; itemsPerPage: number }) {
  return <PaginationControls pagination={usePagination(itemCount, itemsPerPage)} />;
}

function step(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('PaginationControls', () => {
  it('reports the page it is on out of the total', () => {
    render(<Harness itemCount={5} itemsPerPage={2} />);

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it('reports a single empty page rather than "page 1 of 0" when nothing matches', () => {
    render(<Harness itemCount={0} itemsPerPage={2} />);

    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
    expect(step(/next/i)).toBeDisabled();
  });

  it('disables Previous on the first page and advances via Next', async () => {
    const user = userEvent.setup();
    render(<Harness itemCount={5} itemsPerPage={2} />);
    expect(step(/previous/i)).toBeDisabled();

    await user.click(step(/next/i));

    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(step(/previous/i)).toBeEnabled();
  });

  it('disables Next on the last page', async () => {
    const user = userEvent.setup();
    render(<Harness itemCount={3} itemsPerPage={2} />);

    await user.click(step(/next/i));

    expect(step(/next/i)).toBeDisabled();
  });

  it('asks for the neighbouring page rather than moving itself', async () => {
    const user = userEvent.setup();
    const goTo = vi.fn();
    render(
      <PaginationControls pagination={{ page: 3, totalPages: 7, goTo, pageItems: (items) => items }} />,
    );

    await user.click(step(/previous/i));
    expect(goTo).toHaveBeenLastCalledWith(2);

    await user.click(step(/next/i));
    expect(goTo).toHaveBeenLastCalledWith(4);
  });

  // A button that disables itself the instant it works would drop focus to the top of the document.
  it('hands focus to the page indicator when Next disables itself at the last page', async () => {
    const user = userEvent.setup();
    render(<Harness itemCount={3} itemsPerPage={2} />);

    await user.click(step(/next/i));

    expect(screen.getByText(/page 2 of 2/i)).toHaveFocus();
  });

  it('hands focus to the page indicator when Previous disables itself at the first page', async () => {
    const user = userEvent.setup();
    render(<Harness itemCount={5} itemsPerPage={2} />);
    await user.click(step(/next/i));

    await user.click(step(/previous/i));

    expect(screen.getByText(/page 1 of 3/i)).toHaveFocus();
  });

  it('leaves focus on the button while it stays usable, so paging can be repeated', async () => {
    const user = userEvent.setup();
    render(<Harness itemCount={9} itemsPerPage={2} />);

    await user.click(step(/next/i));

    expect(step(/next/i)).toHaveFocus();
  });
});
