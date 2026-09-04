import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_NAME } from '@/lib/site';
import RecordList, { RecordListPlaceholder } from './RecordList';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: `Exoplanet Records | ${SITE_NAME}`,
  description:
    'The hottest, largest, nearest and most Earth-like confirmed exoplanets, who holds each record ' +
    "and who they displaced — tracked on every sync of NASA's Exoplanet Archive.",
};

export default function RecordsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Records</h1>
          <p className={styles.summary}>
            The superlatives of the confirmed archive: who holds each record, since when, and who they
            took it from.
          </p>
        </header>
        <Suspense fallback={<RecordListPlaceholder />}>
          <RecordList />
        </Suspense>
      </div>
    </main>
  );
}
