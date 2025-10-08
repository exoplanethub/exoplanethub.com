import PlanetCard from '@/components/explore/PlanetCard';
import { mockPlanets } from '@/lib/mockPlanets';
import styles from './page.module.css';

export default function ExplorePage() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Most Habitable Exoplanets</h1>
        <p className={styles.subtitle}>
          Ranked by potential to support life based on size, temperature, and distance from their star
        </p>
      </div>
      
      <div className={styles.grid}>
        {mockPlanets.map((planet) => (
          <PlanetCard key={planet.id} planet={planet} />
        ))}
      </div>
    </main>
  );
}
