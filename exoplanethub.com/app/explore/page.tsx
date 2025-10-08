'use client';
import { useState, useEffect } from 'react';
import PlanetCard from '@/components/explore/PlanetCard';
import PlanetTable from '@/components/explore/PlanetTable';
import PlanetModal from '@/components/explore/PlanetModal';
import ESIModal from '@/components/explore/ESIModal';
import { Planet } from '@/lib/mockPlanets';
import styles from './page.module.css';

export default function ExplorePage() {
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showESIModal, setShowESIModal] = useState(false);

  useEffect(() => {
    fetch('/api/planets')
      .then(res => res.json())
      .then(data => {
        setPlanets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading planets:', err);
        setLoading(false);
      });
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Most Habitable Exoplanets</h1>
        <p className={styles.subtitle}>
          Ranked by Earth Similarity Index (ESI)
          <button className={styles.infoBtn} onClick={() => setShowESIModal(true)} title="How is this calculated?">
            ℹ️
          </button>
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
        {loading ? (
          <div className={styles.loading}>Loading exoplanets...</div>
        ) : view === 'grid' ? (
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
      
      {showESIModal && (
        <ESIModal onClose={() => setShowESIModal(false)} />
      )}
    </main>
  );
}
