import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Planet } from '@/lib/mockPlanets';
import PlanetTable from '@/components/explore/PlanetTable';

function makePlanet(overrides: Partial<Planet> & Pick<Planet, 'pl_name'>): Planet {
  return {
    hostname: 'Host',
    sy_snum: 1,
    sy_pnum: 1,
    sy_dist: 10,
    discoverymethod: 'Transit',
    disc_year: 2000,
    disc_facility: 'Kepler',
    pl_orbper: 1,
    pl_orbsmax: 1,
    pl_rade: 1,
    pl_bmasse: 1,
    pl_dens: 1,
    pl_eqt: 1,
    pl_insol: 1,
    st_teff: 1,
    st_rad: 1,
    st_mass: 1,
    st_logg: 1,
    st_age: 1,
    last_updated: '2026-01-01',
    ...overrides,
  };
}

// Hosts share no substring with their planet names, so a search can only match one clause of the filter.
const ALPHA = makePlanet({ pl_name: 'Alpha b', hostname: 'Ross 128', disc_year: 2015, sy_dist: 12.345, pl_rade: 1.234 });
const BETA = makePlanet({ pl_name: 'Beta c', hostname: 'Kepler-186', disc_year: 2021, discoverymethod: 'Radial Velocity' });
const GAMMA = makePlanet({ pl_name: 'Gamma d', hostname: 'Wolf 359', disc_year: 2008 });

function renderTable(props: Partial<React.ComponentProps<typeof PlanetTable>> = {}) {
  const onPageChange = vi.fn();
  const onPlanetClick = vi.fn();

  render(
    <PlanetTable
      planets={[ALPHA, BETA, GAMMA]}
      page={1}
      itemsPerPage={10}
      onPageChange={onPageChange}
      onPlanetClick={onPlanetClick}
      {...props}
    />
  );

  return { onPageChange, onPlanetClick };
}

function renderedNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
}

// Sort activation lives on the <th> itself today and moves to an inner button once #6 lands.
function sortControl(name: RegExp) {
  const header = screen.getByRole('columnheader', { name });
  return within(header).queryByRole('button') ?? header;
}

describe('PlanetTable rendering', () => {
  it('renders one row per planet', () => {
    renderTable();

    expect(renderedNames()).toHaveLength(3);
    expect(renderedNames()).toEqual(expect.arrayContaining(['Alpha b', 'Beta c', 'Gamma d']));
  });

  it('formats radius and distance to two decimal places', () => {
    renderTable({ planets: [ALPHA] });

    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[3]).toHaveTextContent('1.23× Earth');
    expect(cells[4]).toHaveTextContent('12.35 pc');
  });

  it('falls back to N/A for missing values', () => {
    renderTable({ planets: [makePlanet({ pl_name: 'Sparse b', hostname: '', pl_rade: 0, sy_dist: 0, discoverymethod: '' })] });

    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('N/A');
    expect(cells[2]).toHaveTextContent('N/A');
    expect(cells[3]).toHaveTextContent('N/A× Earth');
    expect(cells[4]).toHaveTextContent('N/A pc');
  });

  // NASA omits pl_eqt on 72% of rows and pl_rade on 25%; the sync stores those as null.
  it('falls back to N/A for the nulls the archive actually sends', () => {
    renderTable({ planets: [makePlanet({ pl_name: 'Null b', hostname: null, pl_rade: null, sy_dist: null, discoverymethod: null })] });

    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('N/A');
    expect(cells[2]).toHaveTextContent('N/A');
    expect(cells[3]).toHaveTextContent('N/A× Earth');
    expect(cells[4]).toHaveTextContent('N/A pc');
  });
});

describe('PlanetTable sorting', () => {
  it('sorts by discovery year descending before any interaction', () => {
    renderTable();

    expect(renderedNames()).toEqual(['Beta c', 'Alpha b', 'Gamma d']);
  });

  it('reorders rows when a new sort column is chosen, starting descending', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(sortControl(/planet/i));

    expect(renderedNames()).toEqual(['Gamma d', 'Beta c', 'Alpha b']);
  });

  it('toggles direction when the active sort column is clicked again', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(sortControl(/planet/i));
    await user.click(sortControl(/planet/i));

    expect(renderedNames()).toEqual(['Alpha b', 'Beta c', 'Gamma d']);
  });

  it('sorts planets with no measurement last in both directions', async () => {
    const user = userEvent.setup();
    renderTable({
      planets: [
        makePlanet({ pl_name: 'Unmeasured', pl_rade: null }),
        makePlanet({ pl_name: 'Small', pl_rade: 1 }),
        makePlanet({ pl_name: 'Large', pl_rade: 9 }),
      ],
    });

    await user.click(sortControl(/radius/i));
    expect(renderedNames()).toEqual(['Large', 'Small', 'Unmeasured']);

    await user.click(sortControl(/radius/i));
    expect(renderedNames()).toEqual(['Small', 'Large', 'Unmeasured']);
  });

  it('sorts numerically rather than lexicographically', async () => {
    const user = userEvent.setup();
    renderTable({
      planets: [
        makePlanet({ pl_name: 'Nine', sy_dist: 9 }),
        makePlanet({ pl_name: 'Eighty', sy_dist: 80 }),
        makePlanet({ pl_name: 'Hundred', sy_dist: 100 }),
      ],
    });

    await user.click(sortControl(/distance/i));

    expect(renderedNames()).toEqual(['Hundred', 'Eighty', 'Nine']);
  });
});

describe('PlanetTable filtering', () => {
  it('filters by planet name, case insensitively', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByPlaceholderText(/search exoplanets/i), 'beta');

    expect(renderedNames()).toEqual(['Beta c']);
  });

  it('filters by host star name', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByPlaceholderText(/search exoplanets/i), 'Wolf');

    expect(renderedNames()).toEqual(['Gamma d']);
  });

  it('offers each discovery method as a filter and applies it', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.selectOptions(screen.getByRole('combobox'), 'Radial Velocity');

    expect(renderedNames()).toEqual(['Beta c']);
  });
});

describe('PlanetTable pagination', () => {
  it('shows only the current page and reports the unpaginated total', () => {
    renderTable({ itemsPerPage: 2 });

    expect(renderedNames()).toEqual(['Beta c', 'Alpha b']);
    expect(screen.getByText(/page 1 of 2 \(3 planets\)/i)).toBeInTheDocument();
  });

  it('disables Previous on the first page and advances via Next', async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderTable({ itemsPerPage: 2 });

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('PlanetTable selection', () => {
  it('reports the planet behind the clicked row', async () => {
    const user = userEvent.setup();
    const { onPlanetClick } = renderTable();

    await user.click(screen.getByText('Alpha b'));

    expect(onPlanetClick).toHaveBeenCalledWith(ALPHA);
  });
});

describe('PlanetTable accessibility (#6)', () => {
  // Encodes the open keyboard barrier: both turn red the moment sort headers and rows become operable, forcing these markers out.
  it.fails('exposes each sort header as a keyboard-activatable control reporting aria-sort', async () => {
    const user = userEvent.setup();
    renderTable();
    const header = screen.getByRole('columnheader', { name: /planet/i });

    await user.click(within(header).getByRole('button'));

    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it.fails('opens a planet row from the keyboard', async () => {
    const user = userEvent.setup();
    const { onPlanetClick } = renderTable();

    screen.getAllByRole('row')[1].focus();
    await user.keyboard('{Enter}');

    expect(onPlanetClick).toHaveBeenCalledWith(BETA);
  });
});
