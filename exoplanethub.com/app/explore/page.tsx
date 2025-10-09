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

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Loading exoplanets...</div>
      </main>
    );
  }

  return <ExploreClient planets={planets} />;
}
