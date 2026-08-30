import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ESIBadge from '@/components/explore/ESIBadge';
import { getESIBand } from '@/components/explore/esiBands';

const SCORE = 72;
const BAND_LABEL = getESIBand(SCORE).label;
const BADGE_NAME = new RegExp(`ESI ${SCORE}, ${BAND_LABEL}`);

function renderInActivatableContainer(score: number) {
  const activateContainer = vi.fn();
  const user = userEvent.setup();

  const { container } = render(
    <div onClick={activateContainer} onKeyDown={activateContainer}>
      <ESIBadge score={score} />
    </div>,
  );

  return { user, activateContainer, container };
}

function getBadge() {
  return screen.getByRole('button', { name: BADGE_NAME });
}

describe('ESIBadge', () => {
  it('shows the score and its band label, so the band is not carried by colour alone', () => {
    renderInActivatableContainer(SCORE);

    expect(getBadge()).toHaveTextContent(`ESI ${SCORE}`);
    expect(getBadge()).toHaveTextContent(BAND_LABEL);
  });

  it('renders nothing at all when the planet has no score', () => {
    const { container } = render(<ESIBadge score={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a badge for a real score of 0, which is not the same as unmeasured', () => {
    renderInActivatableContainer(0);

    expect(screen.getByRole('button', { name: new RegExp(`ESI 0, ${getESIBand(0).label}`) })).toBeInTheDocument();
  });

  it('opens the ESI explainer when activated', async () => {
    const { user } = renderInActivatableContainer(SCORE);

    await user.click(getBadge());

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Earth Similarity Index (ESI)');
  });

  it('returns focus to the badge when the explainer closes', async () => {
    const { user } = renderInActivatableContainer(SCORE);
    await user.click(getBadge());

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getBadge()).toHaveFocus();
  });

  it('renders the explainer outside the card, which would otherwise clip and contain it', async () => {
    const { user, container } = renderInActivatableContainer(SCORE);

    await user.click(getBadge());

    const dialog = screen.getByRole('dialog');
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
  });

  it('does not activate the card it sits in when the explainer backdrop is dismissed', async () => {
    const { user, activateContainer } = renderInActivatableContainer(SCORE);
    await user.click(getBadge());

    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(activateContainer).not.toHaveBeenCalled();
  });

  it('does not activate the card it sits in when clicked', async () => {
    const { user, activateContainer } = renderInActivatableContainer(SCORE);

    await user.click(getBadge());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(activateContainer).not.toHaveBeenCalled();
  });

  it.each(['{Enter}', ' '])('does not activate the card it sits in on %s', async (key) => {
    const { user, activateContainer } = renderInActivatableContainer(SCORE);
    getBadge().focus();

    await user.keyboard(key);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(activateContainer).not.toHaveBeenCalled();
  });
});
