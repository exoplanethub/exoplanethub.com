'use client';
import { useCallback, useEffect, useState } from 'react';
import ExploreClient from './ExploreClient';
import { PlanetSummary } from '@/lib/mockPlanets';
import styles from './page.module.css';

type Archive =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'loaded'; planets: PlanetSummary[] };

export default function ExplorePage() {
  const [archive, setArchive] = useState<Archive>({ status: 'loading' });

  const load = useCallback(() => {
    fetch('/api/planets')
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Planets endpoint did not return a list');
        setArchive({ status: 'loaded', planets: data });
      })
      .catch((err) => {
        console.error('Error loading planets:', err);
        setArchive({ status: 'unavailable' });
      });
  }, []);

  useEffect(load, [load]);

  const retry = () => {
    setArchive({ status: 'loading' });
    load();
  };

  if (archive.status === 'loaded') return <ExploreClient planets={archive.planets} />;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Explore Exoplanets</h1>
        <p className={styles.subtitle}>
          Browse all confirmed exoplanets from NASA&apos;s archive
        </p>
      </div>
      {archive.status === 'loading' ? <LoadingOrbits /> : <Unavailable onRetry={retry} />}
    </main>
  );
}

function LoadingOrbits() {
  return (
    <div className={styles.statusPanel}>
      <div className={styles.solarSystem}>
        <div className={styles.sun}></div>
        <div className={styles.orbit}>
          <div className={styles.planet}></div>
        </div>
        <div className={`${styles.orbit} ${styles.orbit2}`}>
          <div className={`${styles.planet} ${styles.planet2}`}></div>
        </div>
        <div className={`${styles.orbit} ${styles.orbit3}`}>
          <div className={`${styles.planet} ${styles.planet3}`}></div>
        </div>
      </div>
      <p className={styles.loadingText}>Loading exoplanets...</p>
    </div>
  );
}

function Unavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.statusPanel} role="alert">
      <p className={styles.errorHeadline}>We couldn&apos;t load the exoplanet archive</p>
      <p className={styles.errorDetail}>
        The request for planet data didn&apos;t come back. This is usually temporary.
      </p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
