'use client';
import { ReactNode, useState, useMemo } from 'react';
import { PlanetSummary } from '@/lib/mockPlanets';
import ESIInfoButton from './ESIInfoButton';
import { getESIBand } from './esiBands';
import styles from './PlanetTable.module.css';

interface PlanetTableProps {
  planets: PlanetSummary[];
  page: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPlanetClick: (planet: PlanetSummary) => void;
}

type SortKey = 'pl_name' | 'sy_dist' | 'pl_rade' | 'discoverymethod' | 'disc_year' | 'esi';
type SortOrder = 'asc' | 'desc';
type SortValue = PlanetSummary[SortKey];

// Unmeasured planets sort last in both directions: null coerces to 0 under <, which would
// otherwise rank every planet NASA has no value for ahead of the real measurements.
function compareSortValues(a: SortValue, b: SortValue, order: SortOrder): number {
  if (a == null || b == null) return a == null && b == null ? 0 : a == null ? 1 : -1;

  const direction = order === 'asc' ? 1 : -1;

  if (typeof a === 'string' && typeof b === 'string') {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    return left === right ? 0 : (left < right ? -1 : 1) * direction;
  }

  return (Number(a) - Number(b)) * direction;
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

export default function PlanetTable({ planets, page, itemsPerPage, onPageChange, onPlanetClick }: PlanetTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('disc_year');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...planets];

    if (search) {
      result = result.filter(p => 
        p.pl_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.hostname && p.hostname.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(p => p.discoverymethod === typeFilter);
    }

    result.sort((a, b) => compareSortValues(a[sortKey], b[sortKey], sortOrder));

    return result;
  }, [planets, search, typeFilter, sortKey, sortOrder]);

  const sortProps = { sortKey, sortOrder, onSort: handleSort };

  const paginatedPlanets = filteredAndSorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  const methods = planets.map(p => p.discoverymethod).filter((m): m is string => Boolean(m));
  const types = ['all', ...Array.from(new Set(methods))];

  return (
    <>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search exoplanets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={styles.select}
        >
          {types.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </select>
      </div>

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
              <tr key={planet.pl_name} onClick={() => onPlanetClick(planet)}>
                <td className={styles.planetName}>
                  {/* A button, not a focusable row: role="button" on a <tr> strips the row semantics screen readers navigate tables with. */}
                  <button
                    className={styles.rowButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlanetClick(planet);
                    }}
                  >
                    {planet.pl_name}
                  </button>
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

      <div className={styles.pagination}>
        <button 
          onClick={() => onPageChange(Math.max(1, page - 1))} 
          disabled={page === 1}
          className={styles.paginationBtn}
        >
          Previous
        </button>
        <span className={styles.pageInfo}>
          Page {page} of {totalPages} ({filteredAndSorted.length} planets)
        </span>
        <button 
          onClick={() => onPageChange(Math.min(totalPages, page + 1))} 
          disabled={page === totalPages}
          className={styles.paginationBtn}
        >
          Next
        </button>
      </div>
    </>
  );
}
