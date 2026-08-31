'use client';
import { useMemo } from 'react';
import { PlanetSummary } from '@/lib/mockPlanets';
import { FilterState, discoveryMethods } from '@/lib/planetFilters';
import styles from './FilterControls.module.css';

interface FilterControlsProps {
  planets: PlanetSummary[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
}

const ANY_METHOD = 'all';

export default function FilterControls({ planets, filters, onChange }: FilterControlsProps) {
  const methods = useMemo(() => discoveryMethods(planets), [planets]);

  // Without an option of its own an unknown method shows as the first one: "All Types" over nothing.
  const options =
    filters.method && !methods.includes(filters.method) ? [filters.method, ...methods] : methods;

  return (
    <div className={styles.controls}>
      <input
        type="text"
        aria-label="Search by planet or host star name"
        placeholder="Search exoplanets..."
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        className={styles.searchInput}
      />
      <select
        aria-label="Filter by discovery method"
        value={filters.method ?? ANY_METHOD}
        onChange={(e) =>
          onChange({ ...filters, method: e.target.value === ANY_METHOD ? null : e.target.value })
        }
        className={styles.select}
      >
        <option value={ANY_METHOD}>All Types</option>
        {options.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
    </div>
  );
}
