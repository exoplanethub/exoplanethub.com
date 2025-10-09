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
        <h3 className={styles.name}>{planet.pl_name}</h3>
        <p className={styles.star}>{planet.hostname || 'Unknown'}</p>
        
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Distance</span>
            <span className={styles.statValue}>{planet.sy_dist ? planet.sy_dist.toFixed(2) : 'N/A'} pc</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Radius</span>
            <span className={styles.statValue}>{planet.pl_rade ? planet.pl_rade.toFixed(2) : 'N/A'}× Earth</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Method</span>
            <span className={styles.statValue}>{planet.discoverymethod || 'N/A'}</span>
          </div>
        </div>
        
        <button className={styles.learnMore} onClick={onClick}>Learn More</button>
      </div>
    </div>
  );
}
