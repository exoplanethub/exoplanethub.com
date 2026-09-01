import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MissingPlanetSearch from './MissingPlanetSearch';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname }));

function renderAt(pathname: string | null) {
  usePathname.mockReturnValue(pathname);
  render(<MissingPlanetSearch />);
  return screen.getByRole('link');
}

describe('MissingPlanetSearch', () => {
  it('carries the attempted name into the explore search', () => {
    const link = renderAt('/planet/Kepler-452%20b');

    expect(link).toHaveAttribute('href', '/explore?q=Kepler-452%20b');
    expect(link).toHaveTextContent('Search the archive for “Kepler-452 b”');
  });

  // Next has decoded the pathname before now; re-decoding a name is a no-op, not a corruption.
  it('reads a name the router already decoded', () => {
    expect(renderAt('/planet/Kepler-452 b')).toHaveAttribute('href', '/explore?q=Kepler-452%20b');
  });

  it('keeps a name containing a plus sign searchable', () => {
    expect(renderAt('/planet/2MASS%20J0249-0557%20c')).toHaveAttribute(
      'href',
      '/explore?q=2MASS%20J0249-0557%20c'
    );
  });

  it.each([
    ['the segment is malformed', '/planet/%ZZ'],
    ['no name was given', '/planet/'],
    ['the router has no path to offer', null],
    ['the segment is a spoofed sentence, not a name', `/planet/${'Your account is locked. '.repeat(10)}`],
  ])('falls back to browsing the whole archive when %s', (_case, pathname) => {
    const link = renderAt(pathname);

    expect(link).toHaveAttribute('href', '/explore');
    expect(link).toHaveTextContent('Browse the archive');
  });
});
