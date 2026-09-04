import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { fetchRecords, type DisplacedHolder, type PlanetRecord } from '@/lib/records';
import { formatSyncDate } from '@/lib/syncDate';
import PlanetNameLink from '@/components/planet/PlanetNameLink';
import styles from './RecordsStrip.module.css';

const HEADING_ID = 'records-strip-heading';
const STRIP_COUNT = 3;

export default function RecordsStrip() {
  return (
    <section className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <h2 id={HEADING_ID} className={styles.heading}>Records</h2>
        <p className={styles.intro}>
          Who holds the archive&apos;s superlatives right now, most recently changed first.
        </p>
        <Suspense fallback={<LoadingPlaceholder />}>
          <RecordsStripList />
        </Suspense>
        <p className={styles.footer}>
          <Link href="/records" className={styles.allRecords}>See every record</Link>
        </p>
      </div>
    </section>
  );
}

// Exported for its test only: rendering it directly skips the Suspense boundary above.
export async function RecordsStripList() {
  // Defers this subtree to request time so a failed read costs one response, not a cached page.
  await connection();
  const result = await fetchRecords();

  if (result.status === 'unavailable') {
    return (
      <p className={styles.notice}>Records are unavailable right now. Please check back shortly.</p>
    );
  }

  if (result.records.length === 0) {
    return <p className={styles.notice}>No records to show yet.</p>;
  }

  return (
    <ol role="list" className={styles.list}>
      {mostRecentlyChanged(result.records).map((record) => (
        <li key={record.id} className={styles.item}>
          <StripEntry record={record} />
        </li>
      ))}
    </ol>
  );
}

// Same-format ISO stamps sort as dates; the sort is stable, so ties keep registry order.
function mostRecentlyChanged(records: PlanetRecord[]): PlanetRecord[] {
  return [...records]
    .sort((a, b) => (a.since < b.since ? 1 : a.since > b.since ? -1 : 0))
    .slice(0, STRIP_COUNT);
}

function StripEntry({ record }: { record: PlanetRecord }) {
  const value = record.format(record.holder.value);
  // `previous` is stored newest-first, so the first entry is the holder this one took the record from.
  const displaced = record.previous.at(0);

  return (
    <>
      <h3 className={styles.label}>{record.label}</h3>
      <p className={styles.holder}>
        <PlanetNameLink name={record.holder.pl_name} />
      </p>
      {value !== null && <p className={styles.value}>{value}</p>}
      {displaced && <RecordChange displaced={displaced} />}
    </>
  );
}

// A baseline's `since` is the sync we started watching, so only a displaced holder makes it a change.
function RecordChange({ displaced }: { displaced: DisplacedHolder }) {
  const date = formatSyncDate(displaced.until);

  return (
    <p className={styles.change}>
      Took the record from <PlanetNameLink name={displaced.pl_name} />
      {date !== null && ` on ${date}`}
    </p>
  );
}

function LoadingPlaceholder() {
  return (
    <>
      <p className={styles.notice}>Loading records&hellip;</p>
      <div className={styles.list} aria-hidden="true">
        {Array.from({ length: STRIP_COUNT }, (_, index) => (
          <div key={index} className={`${styles.item} ${styles.placeholder}`} />
        ))}
      </div>
    </>
  );
}
