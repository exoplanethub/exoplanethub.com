'use client';
import { useMemo, useRef, useState } from 'react';
import FilterControls from '@/components/explore/FilterControls';
import NoResults from '@/components/explore/NoResults';
import PlanetGrid from '@/components/explore/PlanetGrid';
import PlanetModal from '@/components/explore/PlanetModal';
import PlanetTable from '@/components/explore/PlanetTable';
import ResultsCount from '@/components/explore/ResultsCount';
import { PlanetSummary } from '@/lib/mockPlanets';
import {
  FilterState,
  SortKey,
  applyFilters,
  cleared,
  isFiltered,
  sortPlanets,
  withSort,
} from '@/lib/planetFilters';
import { useFilterParams } from '@/lib/useFilterParams';
import { usePagination } from '@/lib/usePagination';
import styles from './page.module.css';

const ITEMS_PER_PAGE = 50;

export default function ExploreClient({ planets }: { planets: PlanetSummary[] }) {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetSummary | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [filters, setFilters] = useFilterParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => sortPlanets(applyFilters(planets, filters), filters),
    [planets, filters],
  );
  const pagination = usePagination(visible.length, ITEMS_PER_PAGE);

  const changeFilters = (next: FilterState) => {
    setFilters(next);
    pagination.goTo(1);
  };

  // Every control that clears is gone or disabled the instant it works, so focus needs somewhere
  // real to land; the search box is both still present and the likeliest next move.
  const clearFilters = () => {
    changeFilters(cleared(filters));
    searchRef.current?.focus();
  };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Explore Exoplanets</h1>
        <p className={styles.subtitle}>
          Browse all confirmed exoplanets from NASA&apos;s archive
        </p>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.toggleBtn} ${view === 'grid' ? styles.active : ''}`}
            onClick={() => setView('grid')}
            aria-pressed={view === 'grid'}
          >
            Grid
          </button>
          <button 
            className={`${styles.toggleBtn} ${view === 'table' ? styles.active : ''}`}
            onClick={() => setView('table')}
            aria-pressed={view === 'table'}
          >
            Table
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <FilterControls
          planets={planets}
          filters={filters}
          onChange={changeFilters}
          onClear={clearFilters}
          searchRef={searchRef}
        />

        <ResultsCount visible={visible.length} total={planets.length} />

        {visible.length === 0 ? (
          <NoResults onClear={isFiltered(filters) ? clearFilters : undefined} />
        ) : view === 'grid' ? (
          <PlanetGrid
            planets={visible}
            pagination={pagination}
            onPlanetClick={setSelectedPlanet}
          />
        ) : (
          <PlanetTable 
            planets={visible}
            pagination={pagination}
            onPlanetClick={setSelectedPlanet}
            sortKey={filters.sortKey}
            sortOrder={filters.sortOrder}
            onSort={(key: SortKey) => changeFilters(withSort(filters, key))}
          />
        )}
      </div>

      {selectedPlanet && (
        <PlanetModal 
          planet={selectedPlanet} 
          onClose={() => setSelectedPlanet(null)}
        />
      )}
    </main>
  );
}
