'use client';
import { useMemo, useState } from 'react';
import PlanetCard from '@/components/explore/PlanetCard';
import PlanetTable from '@/components/explore/PlanetTable';
import PlanetModal from '@/components/explore/PlanetModal';
import FilterControls from '@/components/explore/FilterControls';
import { PlanetSummary } from '@/lib/mockPlanets';
import { FilterState, SortKey, applyFilters, withSort } from '@/lib/planetFilters';
import { useFilterParams } from '@/lib/useFilterParams';
import { usePagination } from '@/lib/usePagination';
import styles from './page.module.css';

const ITEMS_PER_PAGE = 50;

export default function ExploreClient({ planets }: { planets: PlanetSummary[] }) {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetSummary | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [filters, setFilters] = useFilterParams();

  const filtered = useMemo(() => applyFilters(planets, filters), [planets, filters]);
  const pagination = usePagination(filtered.length, ITEMS_PER_PAGE);
  const { page, totalPages, goTo, pageItems } = pagination;

  const changeFilters = (next: FilterState) => {
    setFilters(next);
    goTo(1);
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
          >
            Grid
          </button>
          <button 
            className={`${styles.toggleBtn} ${view === 'table' ? styles.active : ''}`}
            onClick={() => setView('table')}
          >
            Table
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <FilterControls planets={planets} filters={filters} onChange={changeFilters} />

        {view === 'grid' ? (
          <div className={styles.grid}>
            {pageItems(filtered).map((planet) => (
              <PlanetCard 
                key={planet.pl_name} 
                planet={planet} 
                onClick={() => setSelectedPlanet(planet)}
              />
            ))}
          </div>
        ) : (
          <PlanetTable 
            planets={filtered}
            pagination={pagination}
            onPlanetClick={setSelectedPlanet}
            sortKey={filters.sortKey}
            sortOrder={filters.sortOrder}
            onSort={(key: SortKey) => changeFilters(withSort(filters, key))}
          />
        )}
      </div>
      
      {view === 'grid' && (
        <div className={styles.pagination}>
          <button 
            onClick={() => goTo(page - 1)} 
            disabled={page === 1}
            className={styles.paginationBtn}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button 
            onClick={() => goTo(page + 1)} 
            disabled={page === totalPages}
            className={styles.paginationBtn}
          >
            Next
          </button>
        </div>
      )}

      {selectedPlanet && (
        <PlanetModal 
          planet={selectedPlanet} 
          onClose={() => setSelectedPlanet(null)}
        />
      )}
    </main>
  );
}
