import type { ReactNode } from 'react';
import styles from './PageSection.module.css';

interface PageSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

// Deriving the heading id from the section id is what keeps aria-labelledby from drifting.
export default function PageSection({ id, title, children }: PageSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}
