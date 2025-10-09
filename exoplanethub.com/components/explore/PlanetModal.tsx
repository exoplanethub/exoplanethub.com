'use client';
import { Planet } from '@/lib/mockPlanets';
import styles from './PlanetModal.module.css';
import { useEffect } from 'react';

interface PlanetModalProps {
  planet: Planet;
  onClose: () => void;
}

export default function PlanetModal({ planet, onClose }: PlanetModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
          <div className={styles.planetIcon}>🪐</div>
        </div>
        
        <div className={styles.content}>
          <h2 className={styles.name}>{planet.name}</h2>
          <p className={styles.star}>Orbits {planet.star}</p>
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Key Statistics</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Distance from Earth</span>
                <span className={styles.statValue}>{planet.distanceLightYears} light-years</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Planet Type</span>
                <span className={styles.statValue}>{planet.type}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Radius</span>
                <span className={styles.statValue}>{planet.radius}× Earth</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Temperature</span>
                <span className={styles.statValue}>{planet.temperature}K</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Discovered</span>
                <span className={styles.statValue}>{planet.discovered}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Detection Method</span>
                <span className={styles.statValue}>{planet.type}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
