import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import NavBar from '@/components/layout/NavBar';

function menuButton() {
  return screen.getByRole('button', { name: 'Toggle menu' });
}

describe('NavBar accessibility (#6)', () => {
  it('reports whether the menu it controls is open', async () => {
    const user = userEvent.setup();
    render(<NavBar />);

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton());

    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('points at the element it expands, so the link list can be found from the button', () => {
    render(<NavBar />);
    const controlled = menuButton().getAttribute('aria-controls');

    expect(controlled).toBeTruthy();
    expect(document.getElementById(controlled as string)).toContainElement(
      screen.getByRole('link', { name: 'Explore' })
    );
  });

  it('hides the decorative logo glyph from assistive tech', () => {
    render(<NavBar />);

    expect(screen.getByText('🪐')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: 'ExoplanetHub' })).toBeInTheDocument();
  });
});

describe('NavBar destinations', () => {
  it.each([
    ['Explore', '/explore'],
    ['Records', '/records'],
    ['About', '/about'],
    ['Contact', '/contact'],
  ])('links %s to %s', (name, href) => {
    render(<NavBar />);

    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  });
});
