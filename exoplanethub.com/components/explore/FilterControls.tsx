'use client';
import { RefObject, useMemo, useState } from 'react';
import { PlanetSummary } from '@/lib/mockPlanets';
import {
  FilterState,
  RANGE_KEYS,
  RangeKey,
  discoveryMethods,
  isFiltered,
  measuredExtent,
  withMethod,
  withRange,
  withStarClass,
} from '@/lib/planetFilters';
import { STAR_BANDS } from '@/lib/starBands';
import CheckboxGroup from './CheckboxGroup';
import RangeFilter from './RangeFilter';
import styles from './FilterControls.module.css';

interface FilterControlsProps {
  planets: PlanetSummary[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
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

const STAR_OPTIONS = STAR_BANDS.map(({ starClass, label }) => ({ value: starClass, label }));

const UNCLASSIFIED_NOTE =
  'Planets whose host star is unclassified — no measured temperature, or cooler than 2,300 K — are hidden.';

export default function FilterControls({
  planets,
  filters,
  onChange,
  onClear,
  searchRef,
}: FilterControlsProps) {
  // Kept apart from the merge below so ticking a box never rescans the whole archive.
  const present = useMemo(() => discoveryMethods(planets), [planets]);

  // Deriving the boxes from the selection they mutate would unmount one mid-click, dropping the
  // visitor's focus on <body>, so a method stays on offer for the rest of the mount once selected.
  const [everSelected, setEverSelected] = useState(filters.methods);
  const unoffered = filters.methods.filter((method) => !everSelected.includes(method));
  if (unoffered.length > 0) setEverSelected([...everSelected, ...unoffered]);

  // A method the data no longer contains still gets a box, so a shared URL shows what it filters by.
  const methodOptions = useMemo(
    () =>
      Array.from(new Set([...present, ...everSelected]))
        .sort()
        .map((method) => ({ value: method, label: method })),
    [present, everSelected],
  );
  const extents = useMemo(
    () => RANGE_KEYS.map((key) => ({ key, extent: measuredExtent(planets, key) })),
    [planets],
  );

  return (
    <div className={styles.controls}>
      <input
        ref={searchRef}
        type="text"
        aria-label="Search by planet or host star name"
        placeholder="Search exoplanets..."
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        className={styles.searchInput}
      />

      {methodOptions.length > 0 && (
        <CheckboxGroup
          legend="Discovery method"
          options={methodOptions}
          selected={filters.methods}
          onToggle={(method, selected) => onChange(withMethod(filters, method, selected))}
        />
      )}

      <CheckboxGroup
        legend="Star type"
        options={STAR_OPTIONS}
        selected={filters.starClasses}
        onToggle={(starClass, selected) => onChange(withStarClass(filters, starClass, selected))}
        note={filters.starClasses.length > 0 ? UNCLASSIFIED_NOTE : undefined}
      />

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

      <button
        type="button"
        className={styles.clearAll}
        onClick={onClear}
        disabled={!isFiltered(filters)}
      >
        Clear all
      </button>
    </div>
  );
}
