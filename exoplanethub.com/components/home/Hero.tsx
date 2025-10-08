import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.stars}></div>
      <div className={styles.container}>
        <h1 className={styles.title}>
          Find Worlds That<br />Could Harbor Life
        </h1>
        <p className={styles.subtitle}>
          Explore exoplanets ranked by habitability. Discover which distant worlds have the best chance of supporting life.
        </p>
        <a href="/explore" className={styles.primaryBtn}>Explore Habitable Worlds</a>
      </div>
    </section>
  );
}
