import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div 
        className={styles.background}
        style={{ backgroundImage: 'url(/web-first-images-release.png)' }}
      />
      <div className={styles.overlay}></div>
      <div className={styles.stars}></div>
      <div className={styles.container}>
        <h1 className={styles.title}>
          Discover <br />Earth-Like Worlds
        </h1>
        <p className={styles.subtitle}>
          Find distant worlds with conditions that could support life.
        </p>
        <a href="/explore" className={styles.primaryBtn}>Explore Exoplanets</a>
      </div>
      <div className={styles.attribution}>
        Image: NASA/ESA/CSA James Webb Space Telescope
      </div>
    </section>
  );
}
