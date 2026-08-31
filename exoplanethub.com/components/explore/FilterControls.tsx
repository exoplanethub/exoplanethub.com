'use client';
import { useMemo } from 'react';
import { PlanetSummary } from '@/lib/mockPlanets';
import {
  FilterState,
  RANGE_KEYS,
  RangeKey,
  discoveryMethods,
  measuredExtent,
  withRange,
} from '@/lib/planetFilters';
import RangeFilter from './RangeFilter';
import styles from './FilterControls.module.css';

interface FilterControlsProps {
  planets: PlanetSummary[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
}

const ANY_METHOD = 'all';

const RANGE_COPY: Record<RangeKey, { label: string; unit: string; missingNote: string }> = {
  radius: {
    label: 'Radius',
    unit: 'Earth radii',
    missingNote: 'Planets without a measured radius are hidden.',
  },
  mass: {
    label: 'Mass',
    unit: 'Earth masses',
    missingNote: 'Planets without a measured mass are hidden.',
  },
  period: {
    label: 'Orbital period',
    unit: 'days',
    missingNote: 'Planets without a measured orbital period are hidden.',
  },
};

export default function FilterControls({ planets, filters, onChange }: FilterControlsProps) {
  const methods = useMemo(() => discoveryMethods(planets), [planets]);
  const extents = useMemo(
    () => RANGE_KEYS.map((key) => ({ key, extent: measuredExtent(planets, key) })),
    [planets],
  );

  // Without an option of its own an unknown method shows as the first one: "All Types" over nothing.
  const options =
    filters.method && !methods.includes(filters.method) ? [filters.method, ...methods] : methods;

  return (
    <div className={styles.controls}>
      <div className={styles.row}>
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

      <div className={styles.row}>
        {extents.map(({ key, extent }) => (
          <RangeFilter
            key={key}
            {...RANGE_COPY[key]}
            extent={extent}
            value={filters.ranges[key]}
            onChange={(range) => onChange(withRange(filters, key, range))}
          />
        ))}
      </div>
    </div>
  );
}
