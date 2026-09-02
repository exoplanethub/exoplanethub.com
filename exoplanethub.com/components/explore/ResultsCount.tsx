'use client';
import { useEffect, useState } from 'react';
import styles from './ResultsCount.module.css';

const ANNOUNCE_DELAY_MS = 500;

export default function ResultsCount({ visible, total }: { visible: number; total: number }) {
  const summary = `${visible} of ${total} planets`;
  const [announced, setAnnounced] = useState(summary);

  // Re-running on every count is the debounce: filtering is instant, so announcing it per keystroke
  // would talk over a visitor still typing. The seen number never waits; only the spoken one does.
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(summary), ANNOUNCE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [summary]);

  return (
    <p className={styles.count}>
      <span aria-hidden="true">{summary}</span>
      <span className={styles.announcement} role="status">
        Showing {announced}
      </span>
    </p>
  );
}
