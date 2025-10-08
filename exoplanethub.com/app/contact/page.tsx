import styles from './page.module.css';

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Contact Us</h1>
        
        <div className={styles.content}>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
          </p>
          
          <div className={styles.emailSection}>
            <h2 className={styles.subtitle}>Get in Touch</h2>
            <a href="mailto:explore@exoplanethub.com" className={styles.email}>
              explore@exoplanethub.com
            </a>
          </div>
          
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>
      </div>
    </main>
  );
}
