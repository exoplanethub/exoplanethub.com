'use client';
import { useRef } from 'react';
import { Pagination } from '@/lib/usePagination';
import styles from './PaginationControls.module.css';

export default function PaginationControls({ pagination }: { pagination: Pagination }) {
  const { page, totalPages, goTo } = pagination;
  const pageInfoRef = useRef<HTMLSpanElement>(null);

  // Reaching an end disables the button that got you there, so focus lands on the page it reports.
  const step = (target: number) => {
    goTo(target);
    if (target === 1 || target === totalPages) pageInfoRef.current?.focus();
  };

  return (
    <div className={styles.pagination}>
      <button className={styles.button} onClick={() => step(page - 1)} disabled={page === 1}>
        Previous
      </button>
      <span className={styles.pageInfo} ref={pageInfoRef} tabIndex={-1}>
        Page {page} of {totalPages}
      </span>
      <button
        className={styles.button}
        onClick={() => step(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </button>
    </div>
  );
}
