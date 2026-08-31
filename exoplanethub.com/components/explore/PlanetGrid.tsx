'use client';
import { PlanetSummary } from '@/lib/mockPlanets';
import { Pagination } from '@/lib/usePagination';
import PaginationControls from './PaginationControls';
import PlanetCard from './PlanetCard';
import styles from './PlanetGrid.module.css';

interface PlanetGridProps {
  planets: PlanetSummary[];
  pagination: Pagination;
  onPlanetClick: (planet: PlanetSummary) => void;
}

export default function PlanetGrid({ planets, pagination, onPlanetClick }: PlanetGridProps) {
  return (
    <>
      <div className={styles.grid}>
        {pagination.pageItems(planets).map((planet) => (
          <PlanetCard key={planet.pl_name} planet={planet} onClick={() => onPlanetClick(planet)} />
        ))}
      </div>

      <PaginationControls pagination={pagination} />
    </>
  );
}
