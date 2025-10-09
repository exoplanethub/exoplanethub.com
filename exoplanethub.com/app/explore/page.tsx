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
        setPlanets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading planets:', err);
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
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading exoplanets...</p>
      </div>
    </main>
  ) : (
    <ExploreClient planets={planets} />
  );
}
