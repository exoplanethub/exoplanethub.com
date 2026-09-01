import MissingPlanetSearch from './MissingPlanetSearch';
import styles from './page.module.css';

export default function PlanetNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>We don&apos;t have that planet</h1>
          <p className={styles.summary}>
            No planet by that name is in our copy of NASA&apos;s archive. The link may be
            mistyped, or the planet may be catalogued under a different name.
          </p>
        </header>
        <MissingPlanetSearch />
      </div>
    </main>
  );
}
