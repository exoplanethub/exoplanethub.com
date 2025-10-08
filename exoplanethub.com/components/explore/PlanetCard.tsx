import { Planet } from '@/lib/mockPlanets';
import styles from './PlanetCard.module.css';

interface PlanetCardProps {
  planet: Planet;
}

export default function PlanetCard({ planet }: PlanetCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return styles.scoreHigh;
    if (score >= 75) return styles.scoreMedium;
    return styles.scoreLow;
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <div className={styles.imagePlaceholder}>🪐</div>
        <div className={`${styles.score} ${getScoreColor(planet.habitabilityScore)}`}>
          {planet.habitabilityScore}
        </div>
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
        
        <button className={styles.learnMore}>Learn More</button>
      </div>
    </div>
  );
}
