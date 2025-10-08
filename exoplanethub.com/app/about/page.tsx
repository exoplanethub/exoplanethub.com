import styles from './page.module.css';

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>About ExoplanetHub</h1>
        
        <div className={styles.content}>
          <p>
            We started this to make the access to exoplanet information more accessible and easy to navigate. Our goal is to help users expand their horizons and see the bigger picture of the cosmos.
          </p>
          
          <p>
            Hope you enjoy! Feel free to <a href="/contact" className={styles.link}>contact us</a> with suggestions or questions!
          </p>
        </div>
      </div>
    </main>
  );
}
