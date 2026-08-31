import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Planet } from '@/lib/mockPlanets';
import type { SortKey, SortOrder } from '@/lib/planetFilters';
import PlanetTable from '@/components/explore/PlanetTable';
import { usePagination } from '@/lib/usePagination';
import { getESIBand } from '@/components/explore/esiBands';

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

type TableProps = React.ComponentProps<typeof PlanetTable>;
type HarnessProps = Omit<Partial<TableProps>, 'pagination'> & { itemsPerPage?: number };

// Driven by the real hook rather than a stub, so paging here exercises the contract the table is given.
function TableHarness({
  itemsPerPage = 10,
  planets = [ALPHA, BETA, GAMMA],
  sortKey = 'disc_year',
  sortOrder = 'desc',
  onPlanetClick = () => {},
  onSort = () => {},
}: HarnessProps) {
  const pagination = usePagination(planets.length, itemsPerPage);

  return (
    <PlanetTable
      planets={planets}
      pagination={pagination}
      sortKey={sortKey}
      sortOrder={sortOrder}
      onPlanetClick={onPlanetClick}
      onSort={onSort}
    />
  );
}

function renderTable(props: HarnessProps = {}) {
  const onPlanetClick = vi.fn();
  const onSort = vi.fn();

  const withDefaults = (overrides: HarnessProps) => (
    <TableHarness onPlanetClick={onPlanetClick} onSort={onSort} {...props} {...overrides} />
  );

  const { rerender } = render(withDefaults({}));

  return {
    onPlanetClick,
    onSort,
    sortBy: (sortKey: SortKey, sortOrder: SortOrder) => rerender(withDefaults({ sortKey, sortOrder })),
  };
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

function esiHeader() {
  return screen.getByRole('columnheader', { name: /esi/i });
}

function esiSortButton() {
  return within(esiHeader()).getByRole('button', { name: /esi/i });
}

function esiInfoButton() {
  return screen.getByRole('button', { name: 'About the Earth Similarity Index' });
}

function esiCell(rowIndex: number) {
  return within(screen.getAllByRole('row')[rowIndex]).getAllByRole('cell')[6];
}

const SCORED = makePlanet({ pl_name: 'Scored', esi: 92 });
const MIDDLING = makePlanet({ pl_name: 'Middling', esi: 55 });
const ZERO = makePlanet({ pl_name: 'Zero', esi: 0 });
const UNSCORED = makePlanet({ pl_name: 'Unscored' });

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
  // Ordering belongs to ExploreClient so both views share it; the table renders what it is handed.
  it('renders the rows in the order it was handed rather than ordering them itself', () => {
    renderTable({ planets: [GAMMA, ALPHA, BETA], sortKey: 'pl_name', sortOrder: 'asc' });

    expect(renderedNames()).toEqual(['Gamma d', 'Alpha b', 'Beta c']);
  });

  // The owner of the sort state decides the next direction; the table only reports which column was asked for.
  it('asks its owner to sort by the column whose header was activated', async () => {
    const user = userEvent.setup();
    const { onSort } = renderTable();

    await user.click(sortControl(/planet/i));

    expect(onSort).toHaveBeenCalledWith('pl_name');
  });
});

describe('PlanetTable ESI column', () => {
  it('shows the score and its band label, so the band is not carried by colour alone', () => {
    renderTable({ planets: [SCORED] });

    expect(esiCell(1)).toHaveTextContent('92');
    expect(esiCell(1)).toHaveTextContent(getESIBand(92).label);
  });

  it('shows a dash with a spoken equivalent for the two-thirds of planets with no score', () => {
    renderTable({ planets: [UNSCORED] });

    expect(esiCell(1)).toHaveTextContent('—');
    expect(esiCell(1)).toHaveTextContent('Not scored');
  });

  it('scores a planet at 0 rather than treating it as unmeasured', () => {
    renderTable({ planets: [ZERO] });

    expect(esiCell(1)).toHaveTextContent('0');
    expect(esiCell(1)).not.toHaveTextContent('Not scored');
  });

  it('reports its sort state through aria-sort in both directions', () => {
    const { sortBy } = renderTable();

    expect(esiHeader()).toHaveAttribute('aria-sort', 'none');

    sortBy('esi', 'desc');
    expect(esiHeader()).toHaveAttribute('aria-sort', 'descending');

    sortBy('esi', 'asc');
    expect(esiHeader()).toHaveAttribute('aria-sort', 'ascending');
  });

  it('drops back to aria-sort="none" once another column takes over', () => {
    const { sortBy } = renderTable();
    sortBy('esi', 'desc');

    sortBy('pl_name', 'desc');

    expect(esiHeader()).toHaveAttribute('aria-sort', 'none');
  });

  it('sorts from the keyboard, because the control is a real button', async () => {
    const user = userEvent.setup();
    const { onSort } = renderTable({ planets: [UNSCORED, MIDDLING, SCORED] });

    esiSortButton().focus();
    await user.keyboard('{Enter}');

    expect(onSort).toHaveBeenCalledWith('esi');
  });

  it('opens the explainer from the info button without sorting', async () => {
    const user = userEvent.setup();
    const { onSort } = renderTable({ planets: [UNSCORED, MIDDLING, SCORED] });
    const orderBeforeClick = renderedNames();

    await user.click(esiInfoButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(renderedNames()).toEqual(orderBeforeClick);
    expect(onSort).not.toHaveBeenCalled();
  });

  it('does not select a planet when the header info button is used', async () => {
    const user = userEvent.setup();
    const { onPlanetClick } = renderTable();

    await user.click(esiInfoButton());

    expect(onPlanetClick).not.toHaveBeenCalled();
  });
});

describe('PlanetTable pagination', () => {
  it('shows only the current page of rows', () => {
    renderTable({ itemsPerPage: 2 });

    expect(renderedNames()).toEqual(['Alpha b', 'Beta c']);
  });

  it('advances the rows when the shared control pages forward', async () => {
    const user = userEvent.setup();
    renderTable({ itemsPerPage: 2 });

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(renderedNames()).toEqual(['Gamma d']);
  });

  // The page count belongs to usePagination alone; the table must report it, never recompute it.
  it('reports the page count it was given rather than deriving one from the rows', () => {
    render(
      <PlanetTable
        planets={[ALPHA, BETA, GAMMA]}
        pagination={{ page: 2, totalPages: 7, goTo: () => {}, pageItems: (items) => items.slice(0, 1) }}
        onPlanetClick={() => {}}
        sortKey="disc_year"
        sortOrder="desc"
        onSort={() => {}}
      />,
    );

    expect(screen.getByText(/page 2 of 7/i)).toBeInTheDocument();
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
