import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Planet } from '@/lib/mockPlanets';
import PlanetModal from '@/components/explore/PlanetModal';

const TRIGGER_LABEL = 'Learn More';

const KEPLER: Planet = {
  pl_name: 'Kepler-186 f',
  hostname: 'Kepler-186',
  sy_snum: 1,
  sy_pnum: 5,
  sy_dist: 178.5,
  discoverymethod: 'Transit',
  disc_year: 2014,
  disc_facility: 'Kepler',
  pl_orbper: 129.9,
  pl_orbsmax: 0.432,
  pl_rade: 1.17,
  pl_bmasse: 1.71,
  pl_dens: 5.5,
  pl_eqt: 188,
  pl_insol: 0.29,
  st_teff: 3755,
  st_rad: 0.52,
  st_mass: 0.54,
  st_logg: 4.7,
  st_age: 4,
  last_updated: '2026-01-01',
};

function Harness({ planet = KEPLER }: { planet?: Planet }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>{TRIGGER_LABEL}</button>
      {open && <PlanetModal planet={planet} onClose={() => setOpen(false)} />}
    </>
  );
}

async function openModal(planet?: Planet) {
  const user = userEvent.setup();
  render(<Harness planet={planet} />);
  const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
  await user.click(trigger);

  return { user, trigger, dialog: screen.getByRole('dialog') };
}

describe('PlanetModal accessibility (#6)', () => {
  it('is a modal dialog named after the planet it describes', async () => {
    const { dialog } = await openModal();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Kepler-186 f');
  });

  it('moves focus into the dialog and back to the trigger on close', async () => {
    const { user, trigger, dialog } = await openModal();
    expect(dialog).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('gives the close control a spoken name rather than a bare glyph', async () => {
    const { user, trigger, dialog } = await openModal();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab inside the dialog', async () => {
    const { user, dialog } = await openModal();

    for (let i = 0; i < 4; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  // The emoji stands in for planet imagery; announcing "ringed planet" says nothing about this planet.
  it('hides the decorative planet glyph from assistive tech', async () => {
    const { dialog } = await openModal();

    expect(within(dialog).getByText('🪐')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('PlanetModal content', () => {
  it('reports the statistics NASA supplied, rounded for reading', async () => {
    const { dialog } = await openModal();

    expect(within(dialog).getByText('178.50 parsecs')).toBeInTheDocument();
    expect(within(dialog).getByText('1.17× Earth')).toBeInTheDocument();
    expect(within(dialog).getByText('1.71× Earth')).toBeInTheDocument();
    expect(within(dialog).getByText('188K')).toBeInTheDocument();
    expect(within(dialog).getByText('Orbits Kepler-186')).toBeInTheDocument();
  });

  it('falls back to N/A for the nulls the archive actually sends', async () => {
    const { dialog } = await openModal({
      ...KEPLER,
      hostname: null,
      sy_dist: null,
      pl_rade: null,
      pl_eqt: null,
      disc_year: null,
    });

    expect(within(dialog).getByText('N/A parsecs')).toBeInTheDocument();
    expect(within(dialog).getByText('Orbits Unknown')).toBeInTheDocument();
  });
});

describe('PlanetModal full profile link (#68)', () => {
  it('offers the planet page as the next step out of the quick look', async () => {
    const { dialog } = await openModal();

    expect(within(dialog).getByRole('link', { name: 'View full profile' })).toHaveAttribute(
      'href',
      '/planet/Kepler-186%20f',
    );
  });

  it('is a link rather than a button, so middle-click and copy-link work', async () => {
    const { dialog } = await openModal();

    expect(within(dialog).getByRole('link', { name: 'View full profile' }).tagName).toBe('A');
  });

  // The dialog had one focus stop before this link; the trap has to keep cycling both.
  it('is reachable by Tab inside the focus trap', async () => {
    const { user, dialog } = await openModal();
    const close = within(dialog).getByRole('button', { name: 'Close' });
    const fullProfile = within(dialog).getByRole('link', { name: 'View full profile' });

    await user.tab();
    expect(close).toHaveFocus();

    await user.tab();
    expect(fullProfile).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();
  });
});
