import { connection } from 'next/server';
import { fetchRecords, RECORD_COUNT } from '@/lib/records';
import RecordCard from './RecordCard';
import styles from './RecordList.module.css';

export default async function RecordList() {
  // Defers this subtree to request time so a failed read costs one response, not a cached page.
  await connection();
  const result = await fetchRecords();

  if (result.status === 'unavailable') {
    return <p className={styles.notice}>Records are unavailable right now. Please check back shortly.</p>;
  }

  if (result.records.length === 0) {
    return (
      <p className={styles.notice}>
        No records have been tracked yet — check back after the next archive sync.
      </p>
    );
  }

  return (
    <ol role="list" className={styles.list}>
      {result.records.map((record) => (
        <li key={record.id}>
          <RecordCard record={record} />
        </li>
      ))}
    </ol>
  );
}

export function RecordListPlaceholder() {
  return (
    <>
      <p className={styles.notice}>Loading records&hellip;</p>
      <div className={styles.list} aria-hidden="true">
        {Array.from({ length: RECORD_COUNT }, (_, index) => (
          <div key={index} className={styles.placeholder} />
        ))}
      </div>
    </>
  );
}
