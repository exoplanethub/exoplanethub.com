import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanetNotFound from './not-found';

vi.mock('next/navigation', () => ({ usePathname: () => '/planet/Kepler-452%20b' }));

describe('PlanetNotFound', () => {
  it('leads with a single heading that says the planet is missing, not that the site broke', () => {
    render(<PlanetNotFound />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "We don't have that planet"
    );
  });

  it('offers the attempted name as a way back into the archive', () => {
    render(<PlanetNotFound />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/explore?q=Kepler-452%20b');
  });
});
