'use client';
import { useMemo, useState } from 'react';
import { PlanetSummary } from '@/lib/mockPlanets';
import {
  FilterState,
  RANGE_KEYS,
  RangeKey,
  discoveryMethods,
  measuredExtent,
  withMethod,
  withRange,
} from '@/lib/planetFilters';
import RangeFilter from './RangeFilter';
import styles from './FilterControls.module.css';

interface FilterControlsProps {
  planets: PlanetSummary[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
}

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
  // Kept apart from the merge below so ticking a box never rescans the whole archive.
  const present = useMemo(() => discoveryMethods(planets), [planets]);

  // Deriving the boxes from the selection they mutate would unmount one mid-click, dropping the
  // visitor's focus on <body>, so a method stays on offer for the rest of the mount once selected.
  const [everSelected, setEverSelected] = useState(filters.methods);
  const unoffered = filters.methods.filter((method) => !everSelected.includes(method));
  if (unoffered.length > 0) setEverSelected([...everSelected, ...unoffered]);

  // A method the data no longer contains still gets a box, so a shared URL shows what it filters by.
  const methods = useMemo(
    () => Array.from(new Set([...present, ...everSelected])).sort(),
    [present, everSelected],
  );
  const extents = useMemo(
    () => RANGE_KEYS.map((key) => ({ key, extent: measuredExtent(planets, key) })),
    [planets],
  );

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

      {methods.length > 0 && (
        <fieldset className={styles.methods}>
          <legend className={styles.methodsLegend}>Discovery method</legend>
          <div className={styles.methodOptions}>
            {methods.map((method) => (
              <label key={method} className={styles.method}>
                <input
                  type="checkbox"
                  checked={filters.methods.includes(method)}
                  onChange={(e) => onChange(withMethod(filters, method, e.target.checked))}
                />
                {method}
              </label>
            ))}
          </div>
        </fieldset>
      )}

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
