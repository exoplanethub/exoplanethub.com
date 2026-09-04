import PlanetNameLink from '@/components/planet/PlanetNameLink';
import type { DisplacedHolder, PlanetRecord } from '@/lib/records';
import { formatSyncDate } from '@/lib/syncDate';
import styles from './RecordCard.module.css';

interface RecordCardProps {
  record: PlanetRecord;
}

export default function RecordCard({ record }: RecordCardProps) {
  const headingId = `${record.id}-heading`;
  const value = record.format(record.holder.value);
  const tenure = describeTenure(record);

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.label}>
        {record.label}
      </h2>
      <p className={styles.blurb}>{record.blurb}</p>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt className={styles.factLabel}>Holder</dt>
          <dd className={styles.holder}>
            <PlanetNameLink name={record.holder.pl_name} />
          </dd>
        </div>
        {value !== null && (
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Value</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        )}
      </dl>
      {tenure !== null && <p className={styles.tenure}>{tenure}</p>}
      {record.caveat && <p className={styles.caveat}>{record.caveat}</p>}
      {record.previous.length > 0 && <PreviousHolders record={record} />}
    </article>
  );
}

// A baseline's `since` is the sync we started watching, not the day the holder won.
function describeTenure({ since, previous }: PlanetRecord): string | null {
  const date = formatSyncDate(since);
  if (date === null) return null;
  return previous.length === 0 ? `Tracked since ${date}` : `Held since ${date}`;
}

function PreviousHolders({ record }: RecordCardProps) {
  const count = record.previous.length;

  return (
    <details className={styles.history}>
      <summary className={styles.historySummary}>
        {count === 1 ? 'Previous holder' : `Previous holders (${count})`}
      </summary>
      <ol role="list" className={styles.historyList}>
        {record.previous.map((held) => (
          <DisplacedHolderItem key={`${held.pl_name} ${held.since}`} held={held} format={record.format} />
        ))}
      </ol>
    </details>
  );
}

interface DisplacedHolderItemProps {
  held: DisplacedHolder;
  format: PlanetRecord['format'];
}

function DisplacedHolderItem({ held, format }: DisplacedHolderItemProps) {
  const value = format(held.value);
  const window = describeWindow(held);

  return (
    <li className={styles.historyItem}>
      <PlanetNameLink name={held.pl_name} />
      {value !== null && <span className={styles.historyValue}>{value}</span>}
      {window !== null && <span className={styles.historyWindow}>{window}</span>}
    </li>
  );
}

function describeWindow({ since, until }: DisplacedHolder): string | null {
  const from = formatSyncDate(since);
  const to = formatSyncDate(until);
  return from === null || to === null ? null : `${from} to ${to}`;
}
