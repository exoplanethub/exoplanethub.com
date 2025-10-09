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
            {planets.map((planet) => (
              <PlanetCard 
                key={planet.id} 
                planet={planet} 
                onClick={() => setSelectedPlanet(planet)}
              />
            ))}
          </div>
        ) : (
          <PlanetTable 
            planets={planets}
            onPlanetClick={setSelectedPlanet}
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
