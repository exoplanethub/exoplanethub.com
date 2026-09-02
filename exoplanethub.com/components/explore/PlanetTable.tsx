'use client';
import { ReactNode } from 'react';
import { PlanetSummary } from '@/lib/mockPlanets';
import PlanetNameLink from '@/components/planet/PlanetNameLink';
import { SortKey, SortOrder } from '@/lib/planetFilters';
import { Pagination } from '@/lib/usePagination';
import ESIInfoButton from './ESIInfoButton';
import PaginationControls from './PaginationControls';
import { getESIBand } from './esiBands';
import styles from './PlanetTable.module.css';

interface PlanetTableProps {
  planets: PlanetSummary[];
  pagination: Pagination;
  onPlanetClick: (planet: PlanetSummary) => void;
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSort: (key: SortKey) => void;
}

function SortableHeader({ label, column, sortKey, sortOrder, onSort, children }: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSort: (key: SortKey) => void;
  children?: ReactNode;
}) {
  const active = sortKey === column;

  return (
    <th aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <span className={styles.headerContent}>
        <button className={styles.sortButton} onClick={() => onSort(column)}>
          {label}
          {active && <span className={styles.sortIcon} aria-hidden="true">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
        </button>
        {children}
      </span>
    </th>
  );
}

function EyeIcon() {
  return (
    <svg
      className={styles.quickViewIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.5 12S5.5 5.5 12 5.5 22.5 12 22.5 12 18.5 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function ESIScore({ score }: { score: number | undefined }) {
  if (typeof score !== 'number') {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className={styles.visuallyHidden}>Not scored</span>
      </>
    );
  }

  const band = getESIBand(score);

  return (
    <>
      <span className={styles.esiScore} style={band.style}>{score}</span>
      <span className={styles.esiBand}>{band.label}</span>
    </>
  );
}

export default function PlanetTable({ planets, pagination, onPlanetClick, sortKey, sortOrder, onSort }: PlanetTableProps) {
  const { pageItems } = pagination;

  const sortProps = { sortKey, sortOrder, onSort };

  const paginatedPlanets = pageItems(planets);

  return (
    <>
      <div className={styles.tableContainer} role="region" aria-label="Exoplanet results" tabIndex={0}>
        <table className={styles.table}>
          <thead>
            <tr>
              <SortableHeader label="Planet" column="pl_name" {...sortProps} />
              <th>Star</th>
              <SortableHeader label="Method" column="discoverymethod" {...sortProps} />
              <SortableHeader label="Radius" column="pl_rade" {...sortProps} />
              <SortableHeader label="Distance" column="sy_dist" {...sortProps} />
              <SortableHeader label="Discovered" column="disc_year" {...sortProps} />
              <SortableHeader label="ESI" column="esi" {...sortProps}>
                <ESIInfoButton />
              </SortableHeader>
            </tr>
          </thead>
          <tbody>
            {paginatedPlanets.map((planet) => (
              // A mouse-only convenience: the row keeps its row semantics, so the cell's two controls carry the keyboard.
              <tr key={planet.pl_name} onClick={() => onPlanetClick(planet)}>
                <td className={styles.planetName}>
                  <span className={styles.nameCell}>
                    <PlanetNameLink name={planet.pl_name} onClick={(e) => e.stopPropagation()} />
                    <button
                      className={styles.quickView}
                      aria-label={`Quick view: ${planet.pl_name}`}
                      title="Quick view"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlanetClick(planet);
                      }}
                    >
                      <EyeIcon />
                    </button>
                  </span>
                </td>
                <td>{planet.hostname || 'N/A'}</td>
                <td>{planet.discoverymethod || 'N/A'}</td>
                <td>{planet.pl_rade ? planet.pl_rade.toFixed(2) : 'N/A'}× Earth</td>
                <td>{planet.sy_dist ? planet.sy_dist.toFixed(2) : 'N/A'} pc</td>
                <td>{planet.disc_year || 'N/A'}</td>
                <td className={styles.esiCell}><ESIScore score={planet.esi} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls pagination={pagination} />
    </>
  );
}
