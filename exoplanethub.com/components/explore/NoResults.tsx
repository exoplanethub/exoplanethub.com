'use client';
import styles from './NoResults.module.css';

// No clear action means no filter is hiding anything, and a failed load never reaches here — the
// page shows its own error instead — so an empty list really is an empty response.
export default function NoResults({ onClear }: { onClear?: () => void }) {
  const copy = onClear
    ? {
        headline: 'No planets match these filters',
        detail: 'Try widening a range, or start again from the whole archive.',
      }
    : {
        headline: 'No planets to show',
        detail: 'The archive came back without a single planet in it.',
      };

  return (
    <div className={styles.empty}>
      <p className={styles.headline}>{copy.headline}</p>
      <p className={styles.detail}>{copy.detail}</p>
      {onClear && (
        <button type="button" className={styles.clear} onClick={onClear}>
          Clear all filters
        </button>
      )}
    </div>
  );
}
