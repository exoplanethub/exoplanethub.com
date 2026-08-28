'use client';
import { useState, useEffect } from 'react';
import ExploreClient from './ExploreClient';
import { Planet } from '@/lib/mockPlanets';
import styles from './page.module.css';

export default function ExplorePage() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/planets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPlanets(data);
        } else {
          console.error('API returned non-array data:', data);
          setPlanets([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading planets:', err);
        setPlanets([]);
        setLoading(false);
      });
  }, []);

  return loading ? (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Explore Exoplanets</h1>
        <p className={styles.subtitle}>
          Browse all confirmed exoplanets from NASA&apos;s archive
        </p>
      </div>
      <div className={styles.loadingContainer}>
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
    </main>
  ) : (
    <ExploreClient planets={planets} />
  );
}
