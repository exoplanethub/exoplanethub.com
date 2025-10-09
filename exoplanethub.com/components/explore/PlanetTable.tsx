'use client';
import { useState, useMemo } from 'react';
import { Planet } from '@/lib/mockPlanets';
import styles from './PlanetTable.module.css';

interface PlanetTableProps {
  planets: Planet[];
  page: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPlanetClick: (planet: Planet) => void;
}

type SortKey = 'pl_name' | 'sy_dist' | 'pl_rade' | 'discoverymethod' | 'disc_year';
type SortOrder = 'asc' | 'desc';

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

    result.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [planets, search, typeFilter, sortKey, sortOrder]);

  const paginatedPlanets = filteredAndSorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  const types = ['all', ...Array.from(new Set(planets.map(p => p.discoverymethod).filter(Boolean)))];

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

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('pl_name')}>
                Planet {sortKey === 'pl_name' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th>Star</th>
              <th onClick={() => handleSort('discoverymethod')}>
                Method {sortKey === 'discoverymethod' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => handleSort('pl_rade')}>
                Radius {sortKey === 'pl_rade' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => handleSort('sy_dist')}>
                Distance {sortKey === 'sy_dist' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => handleSort('disc_year')}>
                Discovered {sortKey === 'disc_year' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
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
