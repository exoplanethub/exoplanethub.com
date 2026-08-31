'use client';
import { PlanetSummary } from '@/lib/mockPlanets';
import { SortKey, SortOrder } from '@/lib/planetFilters';
import { Pagination } from '@/lib/usePagination';
import ESIInfoButton from './ESIInfoButton';
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
  const { page, totalPages, goTo, pageItems } = pagination;

  const esiAriaSort = sortKey !== 'esi' ? 'none' : sortOrder === 'asc' ? 'ascending' : 'descending';

  const paginatedPlanets = pageItems(planets);

  return (
    <>
      <div className={styles.tableContainer} role="region" aria-label="Exoplanet results" tabIndex={0}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => onSort('pl_name')}>
                Planet {sortKey === 'pl_name' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th>Star</th>
              <th onClick={() => onSort('discoverymethod')}>
                Method {sortKey === 'discoverymethod' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => onSort('pl_rade')}>
                Radius {sortKey === 'pl_rade' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => onSort('sy_dist')}>
                Distance {sortKey === 'sy_dist' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => onSort('disc_year')}>
                Discovered {sortKey === 'disc_year' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className={styles.esiHeader} aria-sort={esiAriaSort}>
                <span className={styles.esiHeaderContent}>
                  <button className={styles.sortButton} onClick={() => onSort('esi')}>
                    ESI {sortKey === 'esi' && <span className={styles.sortIcon} aria-hidden="true">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                  <ESIInfoButton />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlanets.map((planet) => (
              <tr key={planet.pl_name} onClick={() => onPlanetClick(planet)}>
                <td className={styles.planetName}>{planet.pl_name}</td>
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

      <div className={styles.pagination}>
        <button 
          onClick={() => goTo(page - 1)} 
          disabled={page === 1}
          className={styles.paginationBtn}
        >
          Previous
        </button>
        <span className={styles.pageInfo}>
          Page {page} of {totalPages} ({planets.length} planets)
        </span>
        <button 
          onClick={() => goTo(page + 1)} 
          disabled={page === totalPages}
          className={styles.paginationBtn}
        >
          Next
        </button>
      </div>
    </>
  );
}
