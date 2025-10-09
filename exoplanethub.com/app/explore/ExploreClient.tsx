'use client';
import { useState } from 'react';
import PlanetCard from '@/components/explore/PlanetCard';
import PlanetTable from '@/components/explore/PlanetTable';
import PlanetModal from '@/components/explore/PlanetModal';
import { Planet } from '@/lib/mockPlanets';
import styles from './page.module.css';

export default function ExploreClient({ planets }: { planets: Planet[] }) {
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

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
        {view === 'grid' ? (
          <div className={styles.grid}>
            {planets.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((planet) => (
              <PlanetCard 
                key={planet.pl_name} 
                planet={planet} 
                onClick={() => setSelectedPlanet(planet)}
              />
            ))}
          </div>
        ) : (
          <PlanetTable 
            planets={planets}
            page={page}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
            onPlanetClick={setSelectedPlanet}
          />
        )}
      </div>
      
      {view === 'grid' && (
        <div className={styles.pagination}>
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1}
            className={styles.paginationBtn}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {Math.ceil(planets.length / itemsPerPage)}
          </span>
          <button 
            onClick={() => setPage(p => Math.min(Math.ceil(planets.length / itemsPerPage), p + 1))} 
            disabled={page === Math.ceil(planets.length / itemsPerPage)}
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
