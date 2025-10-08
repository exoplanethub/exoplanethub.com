'use client';
import { useState, useMemo } from 'react';
import { Planet } from '@/lib/mockPlanets';
import styles from './PlanetTable.module.css';

interface PlanetTableProps {
  planets: Planet[];
  onPlanetClick: (planet: Planet) => void;
}

type SortKey = 'name' | 'habitabilityScore' | 'distanceLightYears' | 'radius' | 'type';
type SortOrder = 'asc' | 'desc';

export default function PlanetTable({ planets, onPlanetClick }: PlanetTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('habitabilityScore');
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
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.star.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(p => p.type === typeFilter);
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return styles.scoreHigh;
    if (score >= 75) return styles.scoreMedium;
    return styles.scoreLow;
  };

  const types = ['all', ...Array.from(new Set(planets.map(p => p.type)))];

  return (
    <>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search planets or stars..."
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
              <th onClick={() => handleSort('habitabilityScore')}>
                Score {sortKey === 'habitabilityScore' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => handleSort('name')}>
                Planet {sortKey === 'name' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => handleSort('type')}>
                Type {sortKey === 'type' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => handleSort('distanceLightYears')}>
                Distance {sortKey === 'distanceLightYears' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th onClick={() => handleSort('radius')}>
                Size {sortKey === 'radius' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th>Star</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((planet) => (
              <tr key={planet.id} onClick={() => onPlanetClick(planet)}>
                <td>
                  <div className={`${styles.score} ${getScoreColor(planet.habitabilityScore)}`}>
                    {planet.habitabilityScore}
                  </div>
                </td>
                <td className={styles.planetName}>{planet.name}</td>
                <td>{planet.type}</td>
                <td>{planet.distanceLightYears} ly</td>
                <td>{planet.radius}× Earth</td>
                <td>{planet.star}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
