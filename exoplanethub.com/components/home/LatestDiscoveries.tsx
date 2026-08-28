import { Suspense } from 'react';
import { fetchLatestDiscoveries, type LatestDiscovery } from '@/lib/latestDiscoveries';
import styles from './LatestDiscoveries.module.css';

const HEADING_ID = 'latest-discoveries-heading';
const PLACEHOLDER_COUNT = 10;

export default function LatestDiscoveries() {
  return (
    <section className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <h2 id={HEADING_ID} className={styles.heading}>Latest Discoveries</h2>
        <p className={styles.intro}>
          The most recently confirmed worlds in NASA&apos;s Exoplanet Archive.
        </p>
        <Suspense fallback={<LoadingPlaceholder />}>
          <DiscoveryList />
        </Suspense>
      </div>
    </section>
  );
}

async function DiscoveryList() {
  const result = await fetchLatestDiscoveries();

  if (result.status === 'unavailable') {
    return (
      <p className={styles.notice}>
        Latest discoveries are unavailable right now. Please check back shortly.
      </p>
    );
  }

  if (result.planets.length === 0) {
    return <p className={styles.notice}>No confirmed discoveries to show yet.</p>;
  }

  return (
    <ol className={styles.list}>
      {result.planets.map((planet) => (
        <li key={planet.pl_name} className={styles.item}>
          <h3 className={styles.name}>{planet.pl_name}</h3>
          <dl className={styles.facts}>
            <Fact label="Host star" value={planet.hostname} />
            <Fact label="Discovered" value={planet.disc_year} />
            <Fact label="Method" value={planet.discoverymethod} />
          </dl>
        </li>
      ))}
    </ol>
  );
}

function Fact({ label, value }: { label: string; value: LatestDiscovery[keyof LatestDiscovery] }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{value || 'Unknown'}</dd>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <>
      <p className={styles.notice}>Loading latest discoveries&hellip;</p>
      <div className={styles.list} aria-hidden="true">
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
          <div key={index} className={`${styles.item} ${styles.placeholder}`} />
        ))}
      </div>
    </>
  );
}
