import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ExploreClient from '@/app/explore/ExploreClient';
import { PlanetSummary } from '@/lib/mockPlanets';

const PLANETS: PlanetSummary[] = [
  { pl_name: 'Alpha b', hostname: 'Ross 128', sy_dist: 3.4, discoverymethod: 'Transit', disc_year: 2015, pl_rade: 1.1, pl_bmasse: 1.4, pl_eqt: 300 },
];

function viewButton(name: 'Grid' | 'Table') {
  return screen.getByRole('button', { name });
}

describe('ExploreClient view toggle (#6)', () => {
  it('reports which view is active, rather than signalling it by colour alone', async () => {
    const user = userEvent.setup();
    render(<ExploreClient planets={PLANETS} />);

    expect(viewButton('Table')).toHaveAttribute('aria-pressed', 'true');
    expect(viewButton('Grid')).toHaveAttribute('aria-pressed', 'false');

    await user.click(viewButton('Grid'));

    expect(viewButton('Grid')).toHaveAttribute('aria-pressed', 'true');
    expect(viewButton('Table')).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens the planet dialog from the table, the default view', async () => {
    const user = userEvent.setup();
    render(<ExploreClient planets={PLANETS} />);

    await user.click(screen.getByRole('button', { name: 'Alpha b' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Alpha b');
  });
});
