import styles from './page.module.css';

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Contact Us</h1>
        
        <div className={styles.content}>
          <p>
            Have questions about the data? Want to suggest a feature? Found an issue? We'd love to hear from you!
          </p>
          
          <div className={styles.emailSection}>
            <a href="mailto:explore@exoplanethub.com" className={styles.email}>
              explore@exoplanethub.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
