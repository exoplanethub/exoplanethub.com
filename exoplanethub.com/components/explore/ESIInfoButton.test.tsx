import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ESIInfoButton from '@/components/explore/ESIInfoButton';

const BUTTON_NAME = 'About the Earth Similarity Index';

function getInfoButton() {
  return screen.getByRole('button', { name: BUTTON_NAME });
}

describe('ESIInfoButton', () => {
  it('names itself for screen readers rather than relying on its icon', () => {
    render(<ESIInfoButton />);

    expect(getInfoButton()).toBeInTheDocument();
  });

  it('opens the ESI explainer when activated', async () => {
    const user = userEvent.setup();
    render(<ESIInfoButton />);

    await user.click(getInfoButton());

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Earth Similarity Index (ESI)');
  });

  it('returns focus to the button when the explainer closes', async () => {
    const user = userEvent.setup();
    render(<ESIInfoButton />);
    await user.click(getInfoButton());

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getInfoButton()).toHaveFocus();
  });

  it('keeps its own open state, so a second instance stays closed', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ESIInfoButton />
        <ESIInfoButton />
      </>,
    );

    await user.click(screen.getAllByRole('button', { name: BUTTON_NAME })[0]);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
