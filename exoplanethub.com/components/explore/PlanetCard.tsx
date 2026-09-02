'use client';
import { PlanetSummary } from '@/lib/mockPlanets';
import { measurement } from '@/lib/planetStats';
import PlanetNameLink from '@/components/planet/PlanetNameLink';
import ESIBadge from './ESIBadge';
import styles from './PlanetCard.module.css';

interface PlanetCardProps {
  planet: PlanetSummary;
  onClick: () => void;
}

export default function PlanetCard({ planet, onClick }: PlanetCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <div className={styles.imagePlaceholder} aria-hidden="true">🪐</div>
        <ESIBadge score={planet.esi} />
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.name}>
          <PlanetNameLink name={planet.pl_name} />
        </h3>
        <p className={styles.star}>{planet.hostname || 'Unknown'}</p>
        
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Distance</span>
            <span className={styles.statValue}>{measurement(planet.sy_dist, 'pc') ?? 'N/A'}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Radius</span>
            <span className={styles.statValue}>{measurement(planet.pl_rade, '× Earth') ?? 'N/A'}</span>
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
