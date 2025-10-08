import styles from './NavBar.module.css';

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🪐</span>
          <span className={styles.logoText}>ExoplanetHub</span>
        </div>
        
        <div className={styles.links}>
          <a href="#explore" className={styles.link}>Explore</a>
          <a href="#database" className={styles.link}>Database</a>
          <a href="#about" className={styles.link}>About</a>
        </div>
      </div>
    </nav>
  );
}
