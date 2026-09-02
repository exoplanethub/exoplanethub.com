'use client';
import Link from 'next/link';
import styles from './page.module.css';

// getPlanetDetail throws on an outage so it can't cache as a 404, which lands the reader here.
export default function PlanetError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.container} role="alert">
        <header className={styles.header}>
          <h1 className={styles.title}>We couldn&apos;t load this planet</h1>
          <p className={styles.summary}>
            The request for this planet&apos;s data didn&apos;t come back. This is usually
            temporary.
          </p>
        </header>
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={reset}>
            Try again
          </button>
          <Link className={`${styles.action} ${styles.actionQuiet}`} href="/explore">
            Browse the archive
          </Link>
        </div>
      </div>
    </main>
  );
}
