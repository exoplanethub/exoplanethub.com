import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ModalDialog from '@/components/ui/ModalDialog';

const TRIGGER_LABEL = 'Open';

function Harness({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>{TRIGGER_LABEL}</button>
      <button>Outside</button>
      {open && (
        <ModalDialog onClose={() => setOpen(false)} labelledBy="dialog-title">
          <h2 id="dialog-title">Dialog heading</h2>
          {children ?? <button onClick={() => setOpen(false)}>Close</button>}
        </ModalDialog>
      )}
    </>
  );
}

async function openDialog(children?: React.ReactNode) {
  const user = userEvent.setup();
  render(<Harness>{children}</Harness>);
  const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
  await user.click(trigger);

  return { user, trigger, dialog: screen.getByRole('dialog') };
}

describe('ModalDialog semantics', () => {
  it('marks itself modal and takes its name from the heading it is pointed at', async () => {
    const { dialog } = await openDialog();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Dialog heading');
  });

  it('moves focus into the dialog on open', async () => {
    const { dialog } = await openDialog();

    expect(dialog).toHaveFocus();
  });

  it('returns focus to the triggering control on close', async () => {
    const { user, trigger } = await openDialog();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const { user, trigger } = await openDialog();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when the overlay behind it is clicked', async () => {
    const { user, dialog } = await openDialog();

    await user.click(dialog.parentElement as HTMLElement);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays open when the dialog itself is clicked', async () => {
    const { user, dialog } = await openDialog();

    await user.click(screen.getByText('Dialog heading'));

    expect(dialog).toBeInTheDocument();
  });
});

describe('ModalDialog focus trap', () => {
  it('keeps Tab inside the dialog, so aria-modal holds for keyboard users', async () => {
    const { user, dialog } = await openDialog();

    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('wraps backwards from the dialog to its last stop', async () => {
    const { user, dialog } = await openDialog(
      <>
        <button>First</button>
        <button>Last</button>
      </>
    );

    await user.tab({ shift: true });

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  });

  // A trap that only recognises links, buttons and [tabindex] treats the link as the last
  // stop and pins focus there, so the fields below it become unreachable rather than leaking.
  it('cycles through form controls, not just buttons and links', async () => {
    const { user } = await openDialog(
      <>
        <a href="https://example.com">Reference</a>
        <input aria-label="Search" />
        <select aria-label="Kind">
          <option>One</option>
        </select>
        <textarea aria-label="Notes" />
      </>
    );
    const stops = [
      screen.getByRole('link', { name: 'Reference' }),
      screen.getByRole('textbox', { name: 'Search' }),
      screen.getByRole('combobox', { name: 'Kind' }),
      screen.getByRole('textbox', { name: 'Notes' }),
    ];

    const visited: Element[] = [];
    for (let i = 0; i < stops.length + 1; i++) {
      await user.tab();
      visited.push(document.activeElement as Element);
    }

    expect(visited).toEqual([...stops, stops[0]]);
  });
});

describe('ModalDialog page locking', () => {
  it('locks page scrolling while open and releases it on close', async () => {
    const { user } = await openDialog();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');

    expect(document.body.style.overflow).toBe('unset');
  });
});
