import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.stars}></div>
      <div className={styles.container}>
        <h1 className={styles.title}>
          Discover Worlds<br />Beyond Our Solar System
        </h1>
        <p className={styles.subtitle}>
          Explore thousands of confirmed exoplanets with detailed data, visualizations, and the latest discoveries from space missions.
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryBtn}>Explore Exoplanets</button>
          <button className={styles.secondaryBtn}>View Database</button>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>5,500+</div>
            <div className={styles.statLabel}>Confirmed Planets</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>4,000+</div>
            <div className={styles.statLabel}>Planetary Systems</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>900+</div>
            <div className={styles.statLabel}>Multi-Planet Systems</div>
          </div>
        </div>
      </div>
    </section>
  );
}
