'use client';
import { useState } from 'react';
import PlanetCard from '@/components/explore/PlanetCard';
import PlanetTable from '@/components/explore/PlanetTable';
import PlanetModal from '@/components/explore/PlanetModal';
import { mockPlanets, Planet } from '@/lib/mockPlanets';
import styles from './page.module.css';

export default function ExplorePage() {
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Most Habitable Exoplanets</h1>
        <p className={styles.subtitle}>
          Ranked by potential to support life based on size, temperature, and distance from their star
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
            {mockPlanets.map((planet) => (
              <PlanetCard 
                key={planet.id} 
                planet={planet} 
                onClick={() => setSelectedPlanet(planet)}
              />
            ))}
          </div>
        ) : (
          <PlanetTable 
            planets={mockPlanets}
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
