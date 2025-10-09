'use client';
import { Planet } from '@/lib/mockPlanets';
import styles from './PlanetCard.module.css';

interface PlanetCardProps {
  planet: Planet;
  onClick: () => void;
}

export default function PlanetCard({ planet, onClick }: PlanetCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <div className={styles.imagePlaceholder}>🪐</div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.name}>{planet.name}</h3>
        <p className={styles.star}>{planet.star}</p>
        
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Distance</span>
            <span className={styles.statValue}>{planet.distanceLightYears} ly</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Size</span>
            <span className={styles.statValue}>{planet.radius}× Earth</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Type</span>
            <span className={styles.statValue}>{planet.type}</span>
          </div>
        </div>
        
        <button className={styles.learnMore} onClick={onClick}>Learn More</button>
      </div>
    </div>
  );
}
