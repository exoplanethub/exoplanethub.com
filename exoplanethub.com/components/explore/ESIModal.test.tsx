import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ESIModal from '@/components/explore/ESIModal';
import { ESI_BANDS } from '@/components/explore/esiBands';

const TRIGGER_LABEL = 'What is ESI?';

function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>{TRIGGER_LABEL}</button>
      {open && <ESIModal onClose={() => setOpen(false)} />}
    </>
  );
}

async function openModal() {
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
  await user.click(trigger);

  return { user, trigger, dialog: screen.getByRole('dialog') };
}

describe('ESIModal', () => {
  it('names itself with its heading and marks itself modal', async () => {
    const { dialog } = await openModal();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Earth Similarity Index (ESI)');
  });

  it('moves focus into the dialog on open', async () => {
    const { dialog } = await openModal();

    expect(dialog).toHaveFocus();
  });

  it('returns focus to the triggering control on close', async () => {
    const { user, trigger } = await openModal();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user, trigger } = await openModal();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab inside the dialog, so aria-modal holds for keyboard users', async () => {
    const { user, dialog } = await openModal();

    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('makes the scrolling region a named tab stop, so it can be scrolled by keyboard', async () => {
    const { user, dialog } = await openModal();
    const scrollRegion = within(dialog).getByRole('region');

    expect(scrollRegion).toHaveAccessibleName('Earth Similarity Index (ESI)');

    await user.tab();
    await user.tab();

    expect(scrollRegion).toHaveFocus();
  });

  it('renders the score bands from the shared band table', async () => {
    const { dialog } = await openModal();
    const bandList = within(dialog).getByRole('list', { name: /score band/i });

    const rendered = within(bandList).getAllByRole('listitem').map((item) => item.textContent ?? '');
    expect(rendered).toHaveLength(ESI_BANDS.length);

    ESI_BANDS.forEach((band, index) => {
      expect(rendered[index]).toContain(band.range);
      expect(rendered[index]).toContain(band.label);
    });
  });

  it('cites the source of the formula', async () => {
    const { dialog } = await openModal();

    expect(within(dialog).getByText(/Schulze-Makuch et al\. \(2011\)/)).toBeInTheDocument();
  });
});
